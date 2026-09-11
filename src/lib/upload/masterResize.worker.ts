/// <reference lib="webworker" />
/**
 * JPEG 한 장을 마스터 규격(긴 변 MASTER_LONG_EDGE)으로 줄이는 워커
 * 위치: src/lib/upload/masterResize.worker.ts
 *
 * 메인 스레드에서 하지 않는 이유 — 8MP JPEG 하나를 디코드·축소·인코드하는 데 100ms 안팎이고,
 * 7,000장이면 그것만 10분이다. 워커 여러 개가 나눠 들면 업로드와 겹쳐 돌아 총 시간이
 * 업로드 시간 안에 묻힌다.
 *
 * 순서:
 *   1. 파일 앞부분에서 크기와 EXIF 세그먼트를 읽는다(디코드 없음).
 *   2. 긴 변이 규격 이하면 그대로 돌려보낸다 — 이미 2048로 내보낸 파일은 손대지 않는다.
 *   3. createImageBitmap으로 디코드하면서 EXIF 회전을 픽셀에 굽는다(imageOrientation: from-image).
 *   4. OffscreenCanvas에 줄여 그리고 JPEG로 인코드한다.
 *   5. 원본 EXIF를 Orientation=1로 고쳐 새 JPEG에 끼운다 — 촬영 시각·카메라 정보가 그대로 남는다.
 *   6. 올릴 바이트의 CRC32C를 계산한다 — 발급·PUT 헤더에 들어간다. JPEG가 아닌 파일은
 *      줄이지 않고 CRC만 낸다(메인 스레드에서 다시 읽으면 장당 수 ms × 수천 장이 낭비다).
 */

import { crc32cOfBlob } from "./crc32c";
import { readJpegHeader, spliceExif, withUprightOrientation } from "./jpegExif";
import { MASTER_JPEG_QUALITY, MASTER_LONG_EDGE } from "./masterSpec";

export type MasterResizeRequest = { id: number; file: File };
export type MasterResizeResponse =
  | { id: number; ok: true; blob: Blob; resized: boolean; crc32c: string }
  | { id: number; ok: false; error: string };

/** 헤더를 읽을 때 처음 잘라 보는 길이. EXIF(최대 64KB)와 SOF는 대개 이 안에 있다 */
const HEADER_PROBE_BYTES = 256 * 1024;

self.onmessage = async (event: MessageEvent<MasterResizeRequest>) => {
  const { id, file } = event.data;
  try {
    const result =
      file.type === "image/jpeg"
        ? await resize(file)
        : { blob: file as Blob, resized: false };
    const crc = await crc32cOfBlob(result.blob);
    const response: MasterResizeResponse = {
      id,
      ok: true,
      ...result,
      crc32c: crc,
    };
    self.postMessage(response);
  } catch (error) {
    const response: MasterResizeResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};

async function resize(file: File): Promise<{ blob: Blob; resized: boolean }> {
  const header = await readHeader(file);
  if (Math.max(header.width, header.height) <= MASTER_LONG_EDGE) {
    return { blob: file, resized: false };
  }

  // 회전을 여기서 굽는다. 그래서 아래 bitmap.width/height는 사람이 보는 방향의 크기다
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const scale = MASTER_LONG_EDGE / Math.max(bitmap.width, bitmap.height);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("OffscreenCanvas 2d 컨텍스트를 만들지 못했어요");
    // high가 아니면 축소가 이웃 픽셀 몇 개만 섞는 방식이라 머리카락·레이스가 자글거린다
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const encoded = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: MASTER_JPEG_QUALITY,
    });
    if (header.exif === null) return { blob: encoded, resized: true };

    const jpeg = new Uint8Array(await encoded.arrayBuffer());
    const spliced = spliceExif(jpeg, withUprightOrientation(header.exif));
    // 새로 만든 배열이라 버퍼가 곧 ArrayBuffer다 — Blob은 SharedArrayBuffer 가능성을 거른다
    return {
      blob: new Blob([spliced.buffer as ArrayBuffer], { type: "image/jpeg" }),
      resized: true,
    };
  } finally {
    // 비트맵은 GC를 기다리지 않고 바로 놓는다. 24MP면 하나가 96MB다
    bitmap.close();
  }
}

/** 앞 256KB로 시도하고, SOF가 그 뒤에 있으면 파일 전체로 다시 읽는다 */
async function readHeader(file: File) {
  const probe = new Uint8Array(
    await file.slice(0, HEADER_PROBE_BYTES).arrayBuffer(),
  );
  let result = readJpegHeader(probe);
  if (result.kind === "truncated" && file.size > HEADER_PROBE_BYTES) {
    result = readJpegHeader(new Uint8Array(await file.arrayBuffer()));
  }
  if (result.kind !== "ok") throw new Error("JPEG 헤더를 읽지 못했어요");
  return result.header;
}
