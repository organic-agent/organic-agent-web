/**
 * 검토 완료 기억 — "검토" 배지를 작가가 확인했다고 표시한 세부 폴더(브라우저 저장)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/reviewMemory.ts
 *
 * 서버의 needsReview는 지우는 API가 없는 영구 값이다(백엔드 요청 항목). 그때까지 작가가 확인한 폴더는
 * 이 브라우저에만 "검토 완료"로 기억해 배지를 감춘다 — 다른 브라우저에서는 다시 보인다.
 * 키 sel.reviewed.{galleryId}, 값 세부 폴더 id 배열. uploadMemory와 같은 구독 방식(useSyncExternalStore).
 */

const CHANGE_EVENT = "sel.reviewed.change";

const keyOf = (galleryId: number) => `sel.reviewed.${galleryId}`;

export function readReviewedRaw(galleryId: number): string {
  try {
    return window.localStorage.getItem(keyOf(galleryId)) ?? "";
  } catch {
    return "";
  }
}

export function parseReviewed(raw: string): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === "number") : [];
  } catch {
    return [];
  }
}

export function subscribeReviewed(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(galleryId: number, ids: number[]) {
  try {
    if (ids.length === 0) window.localStorage.removeItem(keyOf(galleryId));
    else window.localStorage.setItem(keyOf(galleryId), JSON.stringify(ids));
  } catch {
    // 저장소 불가 — 배지가 그대로 보일 뿐
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function markReviewed(galleryId: number, detailId: number) {
  const ids = new Set(parseReviewed(readReviewedRaw(galleryId)));
  ids.add(detailId);
  write(galleryId, [...ids]);
}

export function unmarkReviewed(galleryId: number, detailId: number) {
  const ids = parseReviewed(readReviewedRaw(galleryId)).filter((id) => id !== detailId);
  write(galleryId, ids);
}
