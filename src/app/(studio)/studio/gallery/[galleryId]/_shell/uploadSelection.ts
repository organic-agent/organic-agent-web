import type { FileEntry } from "@zip.js/zip.js";
import { groupZipSelection, type ZipSelection } from "@/lib/upload/splitZipSelection";
import { UPLOAD_ACCEPT_ATTR, UPLOAD_MAX_BYTES, isAcceptedUpload, uploadContentType } from "./uploadSupport";

const two = (n: number) => String(n).padStart(2, "0");
const three = (n: number) => String(n).padStart(3, "0");
/**
 * 사진 선택창의 필터 — 이미지 형식에 ZIP과 분할 조각(.z01~.z99 · .zip.001~.099)을 더한다. 조각 확장자는 번호마다 달라
 * 99개까지만 적는다. 실제 이미지 형식은 목록에 담을 때 다시 검사한다.
 */
export const UPLOAD_SELECTION_ACCEPT_ATTR = [
  UPLOAD_ACCEPT_ATTR,
  ".zip,application/zip,application/x-zip-compressed",
  ...Array.from({ length: 99 }, (_, i) => `.z${two(i + 1)}`),
  ...Array.from({ length: 99 }, (_, i) => `.${three(i + 1)}`),
].join(",");
export { isZipUpload } from "@/lib/upload/splitZipSelection";

export type UploadSelection = {
  files: File[];
  excludedType: number;
  excludedSize: number;
  errors: string[];
};

const archiveKeys = new WeakMap<File, string>();

/** 같은 이름·크기·수정 시각이어도 ZIP의 서로 다른 폴더에 있던 사진은 모두 담는다. */
export function uploadSelectionKey(file: File): string {
  return archiveKeys.get(file) ?? JSON.stringify([file.name, file.size, file.lastModified]);
}

class OversizedZipPhoto extends Error {}

const utf8Strict = new TextDecoder("utf-8", { fatal: true });
/**
 * 항목의 경로 — 한국 윈도우로 만든 ZIP은 이름이 CP949라 zip.js가 UTF-8로 읽으면 깨진다. UTF-8 표시가 없는 이름은
 * 먼저 UTF-8로 엄격하게 풀어 보고, 안 되면 euc-kr(브라우저에서는 CP949와 같음)로 푼다.
 */
function entryPath(entry: FileEntry): string {
  let path = entry.filename;
  if (!entry.filenameUTF8 && entry.rawFilename) {
    try {
      path = utf8Strict.decode(entry.rawFilename);
    } catch {
      try {
        path = new TextDecoder("euc-kr").decode(entry.rawFilename);
      } catch {
        // 브라우저가 euc-kr을 모르면 zip.js가 푼 이름 그대로
      }
    }
  }
  return path.replaceAll("\\", "/");
}

/** 경로의 마지막 조각(파일 이름)과 그 앞 폴더들 */
function splitPath(path: string): { folders: string[]; name: string } {
  const segments = path.split("/").filter(Boolean);
  return { folders: segments.slice(0, -1), name: segments[segments.length - 1] ?? "" };
}

/** 조각 경계를 넘는 사진도 스트림으로 읽고, 실제 풀린 크기와 CRC를 검사한다. */
async function extractPhoto(entry: FileEntry, maxBytes: number, signal?: AbortSignal): Promise<Blob> {
  if (entry.uncompressedSize > maxBytes) throw new OversizedZipPhoto();
  let parts: ArrayBuffer[] = [];
  let bytes = 0;
  await entry.getData(new WritableStream<Uint8Array>({
    write(chunk) {
      signal?.throwIfAborted();
      bytes += chunk.byteLength;
      if (bytes > maxBytes) throw new OversizedZipPhoto();
      parts.push(new Uint8Array(chunk).buffer);
    },
    abort() { parts = []; },
  }), { signal, useWebWorkers: false, checkCrc32: true });
  return new Blob(parts);
}

async function openZip(archive: ZipSelection, signal?: AbortSignal) {
  const { BlobReader, ZipReader, ERR_SPLIT_ZIP_FILE } = await import("@zip.js/zip.js/lib/zip-core-native.js");
  signal?.throwIfAborted();
  const joined = () => new BlobReader(new Blob(archive.parts));
  const volumes = () => archive.parts.map((part) => new BlobReader(part));
  const candidates = archive.kind === "volumes" ? [volumes, joined] : archive.kind === "numbered" ? [joined, volumes] : [joined];
  for (let index = 0; index < candidates.length; index += 1) {
    const reader = new ZipReader(candidates[index](), { useWebWorkers: false });
    try {
      const entries = await reader.getEntries({ onprogress: () => signal?.throwIfAborted() });
      signal?.throwIfAborted();
      return { reader, entries: entries.filter((entry): entry is FileEntry => !entry.directory) };
    } catch (error) {
      await reader.close();
      signal?.throwIfAborted();
      if (index === candidates.length - 1 || !(error instanceof Error) || error.message !== ERR_SPLIT_ZIP_FILE) throw error;
    }
  }
  throw new Error("ZIP을 열지 못했어요");
}

/** 확장자만 사진으로 바꾼 문서와 macOS 메타데이터가 사진으로 올라가지 않게 헤더도 확인한다. */
async function hasImageHeader(blob: Blob, type: string): Promise<boolean> {
  const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const text = String.fromCharCode(...bytes);
  if (type === "image/webp") return text.slice(0, 4) === "RIFF" && text.slice(8, 12) === "WEBP";
  if (type === "image/heic" || type === "image/heif") {
    if (text.slice(4, 8) !== "ftyp") return false;
    const boxSize = new DataView(bytes.buffer).getUint32(0);
    const brands = [text.slice(8, 12)];
    for (let offset = 16; offset + 4 <= Math.min(boxSize, bytes.length); offset += 4) brands.push(text.slice(offset, offset + 4));
    return !brands.includes("avif") && !brands.includes("avis") && brands.some((brand) => ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(brand));
  }
  return false;
}

/** ZIP 안의 모든 경로를 펼친다. 원래 사진 파일명은 업로드·중복 검사·끊김 복구를 위해 보존한다. */
export async function expandUploadSelection(
  input: Iterable<File>,
  onProgress?: (archiveName: string, done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<UploadSelection> {
  const grouped = groupZipSelection(Array.from(input));
  const result: UploadSelection = { files: [], excludedType: 0, excludedSize: 0, errors: grouped.errors };
  for (const archive of grouped.inputs) {
    signal?.throwIfAborted();
    if (!("kind" in archive)) {
      result.files.push(archive);
      continue;
    }
    onProgress?.(archive.name, 0, 0);
    let opened;
    try {
      opened = await openZip(archive, signal);
    } catch (error) {
      signal?.throwIfAborted();
      result.errors.push(archive.kind !== "single" || (error instanceof Error && error.message === "Split zip file")
        ? `${archive.name}의 분할 파일이 빠졌거나 손상됐어요. 첫 조각부터 마지막 조각까지 모두 선택해 주세요.`
        : `${archive.name}을 열지 못했어요. 손상되었거나 암호가 걸린 ZIP인지 확인해 주세요.`);
      continue;
    }
    try {
      signal?.throwIfAborted();
      const { entries } = opened;
      if (entries.some((entry) => entry.encrypted)) {
        result.errors.push(`${archive.name}에 암호가 걸려 있어요. 암호를 해제한 ZIP을 선택해 주세요.`);
        continue;
      }
      const archiveFiles: File[] = [];
      let failed = 0;
      let photos = 0;
      // 다른 폴더에 같은 이름의 사진이 있으면 올릴 때 이름이 겹쳐 한쪽이 묻힌다 — 겹치는 이름에만 폴더 이름을 앞에 붙인다
      const nameCount = new Map<string, number>();
      for (const entry of entries) {
        if (entry.directory) continue;
        const { name } = splitPath(entryPath(entry));
        nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
      }
      for (let index = 0; index < entries.length; index += 1) {
        signal?.throwIfAborted();
        if (index % 10 === 0) onProgress?.(archive.name, index, entries.length);
        const entry = entries[index];
        const path = entryPath(entry);
        const { folders, name: baseName } = splitPath(path);
        const segments = [...folders, baseName];
        // macOS가 만든 ._사진.jpg는 이미지가 아닌 리소스 포크다.
        if (segments.includes("__MACOSX") || baseName === ".DS_Store" || baseName.startsWith("._")) continue;
        const name = (nameCount.get(baseName) ?? 0) > 1 && folders.length > 0 ? `${folders.join("_")}_${baseName}` : baseName;
        const type = uploadContentType(new File([], name));
        if (!isAcceptedUpload(new File([], name, { type }))) {
          result.excludedType += 1;
          continue;
        }
        try {
          const maxBytes = type === "image/jpeg" ? UPLOAD_MAX_BYTES * 4 : UPLOAD_MAX_BYTES;
          const blob = await extractPhoto(entry, maxBytes, signal);
          signal?.throwIfAborted();
          const imageHeader = await hasImageHeader(blob, type);
          signal?.throwIfAborted();
          if (!imageHeader) {
            result.excludedType += 1;
            continue;
          }
          const file = new File([blob], name, { type, lastModified: entry.lastModDate.getTime() });
          archiveKeys.set(file, JSON.stringify([archive.key, path]));
          archiveFiles.push(file);
          photos += 1;
        } catch (error) {
          signal?.throwIfAborted();
          if (error instanceof OversizedZipPhoto) result.excludedSize += 1;
          else failed += 1;
        }
      }
      onProgress?.(archive.name, entries.length, entries.length);
      // 빠지거나 잘못 섞인 조각으로 일부 사진만 올라가지 않게 분할 묶음은 전부 검증된 뒤 담는다.
      if (failed === 0 || archive.kind === "single") result.files.push(...archiveFiles);
      if (failed > 0) result.errors.push(archive.kind === "single"
        ? `${archive.name} 안의 파일 ${failed}개를 압축 해제하지 못했어요.`
        : `${archive.name}의 조각이 손상되었거나 다른 압축 파일의 조각이 섞여 있어요. 같은 압축 파일의 모든 조각을 다시 선택해 주세요.`);
      else if (photos === 0) result.errors.push(`${archive.name} 안에 업로드할 수 있는 사진이 없어요.`);
    } finally {
      await opened.reader.close();
    }
  }
  return result;
}
