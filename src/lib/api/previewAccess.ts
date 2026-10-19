/**
 * 미리보기 고정 주소의 접근 쿠키 · 서명 URL로 물러나기 — 갤러리마다 한 상태
 * 위치: src/lib/api/previewAccess.ts
 *
 * 서버가 미리보기를 CloudFront 고정 주소(만료 없음)로 주면 브라우저가 한 번 받은 사진을 다시 받지 않는다(server #336).
 * 그 주소는 갤러리 경로에만 맞는 HttpOnly 쿠키가 있어야 열린다 — 갤러리를 열 때 받고(issuePreviewAccess) 주기적으로 늘린다.
 *
 * 쿠키가 실리지 않는 곳(일부 인앱 브라우저 · localhost · *.vercel.app 미리보기 — 같은 사이트가 아님)에서는 CDN 사진이 403이다.
 * 그런 사진이 두 번 깨지면 그 탭은 서명 URL로 물러나고(목록 요청에 preview=signed), 화면에 목록을 다시 읽으라고 알린다.
 * 쿠키가 안 실리는 건 갤러리가 아니라 브라우저의 성질이라 물러나기는 탭 전체다 — 쿠키 발급 실패만 그 갤러리 하나를 물러나게 한다.
 * 다만 쿠키가 끝나서 난 403(탭을 오래 숨김 · 노트북을 덮었다 엶)은 쿠키를 다시 받으면 풀린다 — 그래서 깨지면 먼저 쿠키를
 * 다시 받고 그 사진을 한 번 다시 부른다. 방금 받은 쿠키로도 깨질 때만 물러나기 문턱을 센다.
 * 서버 CDN이 꺼져 있으면 쿠키 없이 같은 모양이 오고 주소도 서명 URL이라 이 파일이 할 일이 없다.
 */

import { api } from "@/lib/api/client";

type PreviewAccessResponse = {
  /** 쿠키가 끝나는 시각. CDN이 꺼져 있으면 null */
  expiresAt: string | null;
  /** 이 시간(초)이 지나면 다시 받는다. CDN이 꺼져 있으면 null */
  refreshAfterSeconds: number | null;
};

type GalleryPreviewState = {
  /** true면 이 갤러리는 미리보기도 서명 URL로 받는다 — 쿠키를 못 받았을 때 */
  signed: boolean;
  issuedAt: number;
  refreshAfterMs: number | null;
  inflight: Promise<void> | null;
};

/** 이만큼 깨지면 쿠키가 실리지 않는 환경으로 본다 — 한 장은 회선 순간 끊김일 수 있다 */
const FALLBACK_AFTER_ERRORS = 2;
/** 깨졌을 때 쿠키를 다시 받는 간격 — 이 안에 또 깨지면 만료가 아니라 쿠키가 안 실리는 것으로 본다 */
const REISSUE_GAP_MS = 30_000;
/** CDN 고정 주소인지 — 미리보기 경로이면서 서명 URL(X-Amz-)이 아닌 것 */
const PREVIEW_PATH = "/previews/galleries/";

const states = new Map<number, GalleryPreviewState>();
/** 탭 전체가 서명 URL로 물러났는가 · 그때까지 깨진 CDN 사진 수 */
let tabSigned = false;
let cdnErrors = 0;
const fallbackListeners = new Set<() => void>();
/** 지금 화면이 연 갤러리들 — 깨졌을 때 이 갤러리들의 쿠키를 다시 받는다 */
const openGalleries = new Set<number>();
let lastReissueAt = 0;
let reissuing: Promise<unknown> | null = null;
/** 이미 한 번 다시 부른 <img> — 두 번째 실패는 문턱으로 센다 */
const retried = new WeakSet<HTMLImageElement>();

function stateOf(galleryId: number): GalleryPreviewState {
  let state = states.get(galleryId);
  if (!state) {
    state = { signed: false, issuedAt: 0, refreshAfterMs: null, inflight: null };
    states.set(galleryId, state);
  }
  return state;
}

/**
 * 쿠키를 받는다. 같은 갤러리에 겹쳐 부르면 한 요청을 나눠 기다린다 — 화면이 목록보다 먼저 이것을 기다려야
 * 쿠키보다 <img>가 먼저 나가 첫 화면이 403이 되는 일이 없다. 실패해도 던지지 않는다(서명 URL로 물러날 뿐).
 */
export function issuePreviewAccess(galleryId: number): Promise<void> {
  const state = stateOf(galleryId);
  if (state.inflight) return state.inflight;
  state.inflight = (async () => {
    try {
      const res = await api<PreviewAccessResponse>(`/api/v1/galleries/${galleryId}/image-access`, {
        method: "POST",
        credentials: "include",
      });
      state.issuedAt = Date.now();
      state.refreshAfterMs = res?.refreshAfterSeconds ? res.refreshAfterSeconds * 1000 : null;
    } catch {
      // 쿠키를 못 받으면 CDN 사진을 열 수 없다 — 처음부터 서명 URL로
      state.signed = true;
    } finally {
      state.inflight = null;
    }
  })();
  return state.inflight;
}

/** 쿠키를 늘릴 때가 됐는가. CDN이 꺼져 있거나(refreshAfter 없음) 서명 URL로 물러났으면 늘릴 것도 없다 */
export function previewAccessDue(galleryId: number): boolean {
  const state = stateOf(galleryId);
  if (tabSigned || state.signed) return false;
  return state.refreshAfterMs !== null && Date.now() - state.issuedAt >= state.refreshAfterMs;
}

/** 목록 · 상세 요청 주소에 붙일 인자 — 물러난 탭이면 preview=signed */
export function withPreviewMode(galleryId: number, path: string): string {
  if (!tabSigned && !stateOf(galleryId).signed) return path;
  return `${path}${path.includes("?") ? "&" : "?"}preview=signed`;
}

/** 화면이 이 갤러리를 열고 있다고 알린다. 돌려준 함수로 닫는다 */
export function registerOpenGallery(galleryId: number): () => void {
  openGalleries.add(galleryId);
  return () => {
    openGalleries.delete(galleryId);
  };
}

/**
 * 미리보기 <img>가 깨졌다고 알린다. CDN 고정 주소일 때만 다룬다.
 * 처음 깨진 사진은 쿠키를 다시 받은 뒤 한 번 다시 부르고(30초에 한 번 받음), 방금 받은 쿠키로도 깨지면 센다.
 * 문턱을 넘으면 탭 전체를 서명 URL로 바꾸고 구독한 화면에 목록을 다시 읽게 한다.
 */
export function reportPreviewError(img: HTMLImageElement, src: string | null | undefined): void {
  if (tabSigned || !src || src.includes("X-Amz-") || !src.includes(PREVIEW_PATH)) return;
  if (!retried.has(img) && openGalleries.size > 0) {
    retried.add(img);
    if (Date.now() - lastReissueAt >= REISSUE_GAP_MS) {
      lastReissueAt = Date.now();
      reissuing = Promise.all([...openGalleries].map((galleryId) => issuePreviewAccess(galleryId)));
    }
    void reissuing?.then(() => {
      // 그사이 물러났거나 다른 사진으로 바뀌었으면 두지 않는다
      if (!tabSigned && img.getAttribute("src") === src) img.src = src;
    });
    return;
  }
  cdnErrors += 1;
  if (cdnErrors < FALLBACK_AFTER_ERRORS) return;
  tabSigned = true;
  for (const listener of fallbackListeners) listener();
}

/** 서명 URL로 물러난 순간 불린다 — 화면은 여기서 목록을 다시 읽는다. 돌려준 함수로 구독을 끊는다 */
export function onPreviewFallback(listener: () => void): () => void {
  fallbackListeners.add(listener);
  return () => {
    fallbackListeners.delete(listener);
  };
}
