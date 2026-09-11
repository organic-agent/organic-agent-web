/**
 * 발급 기억 — 끊긴 업로드를 이어 올리기 위해 발급받은 사진을 브라우저에 남긴다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/uploadMemory.ts
 *
 * 서버에는 PENDING 사진 행(번호 · 파일명)만 남고 어떤 로컬 파일이었는지는 없다. 여기 적어 둔
 * 파일명 · 크기로 "파일 다시 고르기"에서 짝을 맞춰 재발급(같은 행에 새 URL)으로 이어 올린다.
 * 완료 통보까지 끝난 사진은 지운다. 키는 sel.upload.{galleryId}. 저장소가 막혀 있어도 동작은 계속된다.
 *
 * 화면은 useSyncExternalStore로 구독한다(렌더 중 localStorage를 직접 읽지 않는다). 이 모듈이 쓸 때마다
 * 같은 탭에는 커스텀 이벤트, 다른 탭에는 브라우저 storage 이벤트가 간다.
 */

export type RememberedUpload = {
  photoId: number;
  fileName: string;
  size: number;
  contentType: string;
  issuedAt: number;
};

const CHANGE_EVENT = "sel.upload.change";

const keyOf = (galleryId: number) => `sel.upload.${galleryId}`;

/** 저장된 원문(구독 스냅샷용). 없거나 막혀 있으면 빈 문자열 */
export function readRememberedRaw(galleryId: number): string {
  try {
    return window.localStorage.getItem(keyOf(galleryId)) ?? "";
  } catch {
    return "";
  }
}

export function parseRemembered(raw: string): RememberedUpload[] {
  if (!raw) return [];
  try {
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

export function readRemembered(galleryId: number): RememberedUpload[] {
  return parseRemembered(readRememberedRaw(galleryId));
}

/** useSyncExternalStore 구독 — 같은 탭의 쓰기와 다른 탭의 storage 이벤트 */
export function subscribeRemembered(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(galleryId: number, items: RememberedUpload[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(keyOf(galleryId));
    else window.localStorage.setItem(keyOf(galleryId), JSON.stringify(items));
  } catch {
    // 저장소 불가 — 복구 배너가 없어질 뿐 업로드는 계속된다
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
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
  const kept = readRemembered(galleryId).filter((item) => !gone.has(item.photoId));
  write(galleryId, kept);
}

/* ── 올리는 중 심장 박동 — 다른 탭이 이 갤러리의 PENDING을 복구 대상으로 오해하지 않게 ── */

const activeKeyOf = (galleryId: number) => `sel.upload.active.${galleryId}`;
/** 이 시간 안에 박동이 있었으면 어느 탭인가가 올리는 중이다 */
const ACTIVE_FRESH_MS = 20_000;

export function touchUploadActive(galleryId: number) {
  try {
    window.localStorage.setItem(activeKeyOf(galleryId), String(Date.now()));
  } catch {
    // 저장소 불가 — 한 탭만 쓰는 경우엔 문제 없다
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearUploadActive(galleryId: number) {
  try {
    window.localStorage.removeItem(activeKeyOf(galleryId));
  } catch {
    // 무시
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** useSyncExternalStore 스냅샷 — "1"이면 어느 탭인가가 최근 20초 안에 올리는 중이라고 알렸다 */
export function readUploadActiveRaw(galleryId: number): string {
  try {
    const at = Number(window.localStorage.getItem(activeKeyOf(galleryId)) ?? "");
    return Number.isFinite(at) && at > 0 && Date.now() - at < ACTIVE_FRESH_MS ? "1" : "";
  } catch {
    return "";
  }
}
