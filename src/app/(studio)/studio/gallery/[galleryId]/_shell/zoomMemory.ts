/**
 * 사진 크기(줌) 기억 — 새로 고쳐도 사용자가 맞춘 크기 그대로
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory.ts
 *
 * 갤러리마다가 아니라 사용자 취향이라 키 하나(sel.gallery.zoom)에 둔다. 값은 0~100.
 * useSyncExternalStore로 읽어 서버 렌더(기본 40)와 어긋나지 않게 한다 — 첫 그림은 40, 바로 기억값으로.
 */

const KEY = "sel.gallery.zoom";
const CHANGE_EVENT = "sel.gallery.zoom.change";

export const DEFAULT_ZOOM = 40;

export function readZoomRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseZoom(raw: string): number {
  if (!raw) return DEFAULT_ZOOM; // Number("")은 0이라 기본값 검사 앞에서 걸러야 한다
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : DEFAULT_ZOOM;
}

export function subscribeZoom(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function writeZoom(zoom: number) {
  try {
    window.localStorage.setItem(KEY, String(Math.max(0, Math.min(100, Math.round(zoom)))));
  } catch {
    // 저장소 불가 — 이번 화면에서만 유지된다
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
