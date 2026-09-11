/**
 * 발급 기억 — 끊긴 업로드를 이어 올리기 위해 발급받은 사진을 브라우저에 남긴다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/uploadMemory.ts
 *
 * 서버에는 PENDING 사진 행(번호 · 파일명)만 남고 어떤 로컬 파일이었는지는 없다. 여기 적어 둔
 * 파일명 · 크기로 "파일 다시 고르기"에서 짝을 맞춰 재발급(같은 행에 새 URL)으로 이어 올린다.
 * 완료 통보까지 끝난 사진은 지운다. 키는 sel.upload.{galleryId}. 저장소가 막혀 있어도 동작은 계속된다.
 */

export type RememberedUpload = {
  photoId: number;
  fileName: string;
  size: number;
  contentType: string;
  issuedAt: number;
};

const keyOf = (galleryId: number) => `sel.upload.${galleryId}`;

export function readRemembered(galleryId: number): RememberedUpload[] {
  try {
    const raw = window.localStorage.getItem(keyOf(galleryId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RememberedUpload =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RememberedUpload).photoId === "number" &&
        typeof (item as RememberedUpload).fileName === "string",
    );
  } catch {
    return [];
  }
}

function write(galleryId: number, items: RememberedUpload[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(keyOf(galleryId));
    else window.localStorage.setItem(keyOf(galleryId), JSON.stringify(items));
  } catch {
    // 저장소 불가 — 복구 배너가 없어질 뿐 업로드는 계속된다
  }
}

/** 발급 직후 — 같은 사진 번호는 덮어쓴다 */
export function rememberIssued(galleryId: number, items: RememberedUpload[]) {
  if (items.length === 0) return;
  const byId = new Map(readRemembered(galleryId).map((item) => [item.photoId, item]));
  for (const item of items) byId.set(item.photoId, item);
  write(galleryId, [...byId.values()]);
}

/** 완료 통보가 끝난 사진 · 지운 사진 — 기억에서 뺀다 */
export function forgetUploaded(galleryId: number, photoIds: number[]) {
  if (photoIds.length === 0) return;
  const gone = new Set(photoIds);
  write(
    galleryId,
    readRemembered(galleryId).filter((item) => !gone.has(item.photoId)),
  );
}

export function clearRemembered(galleryId: number) {
  write(galleryId, []);
}
