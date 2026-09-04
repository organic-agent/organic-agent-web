/**
 * 갤러리 사진 목록 훅 (페이지 순회 + viewUrl TTL 재조회) — 작가·부부 공용
 * 위치: src/lib/galleryPhotos.ts (06에서 작가 _lib에서 승격 — 목록 API가 부부 공용이라)
 *
 * 기본 모드는 hasNext가 꺼질 때까지 순회해 전체를 모은다(작가 워크스페이스).
 * incremental 모드는 첫 페이지만 받고
 * loadMore()로 한 페이지씩 이어 붙인다(부부 무한 스크롤, WES-139).
 *
 * PENDING(올리다 만 사진, viewUrl 없음)은 화면 대상이 아니라 여기서 걸러낸다.
 * viewUrl은 서명 URL이라 TTL 뒤 만료된다 — 만료 60초 전에 지금까지 불러온
 * 페이지 수만큼 조용히 재조회해 스크롤 위치를 지킨 채 URL만 갈아끼운다.
 * 이미지 onError 폴백도 같은 silent 재조회를 쓰되 과호출을 막는 최소 간격을 둔다.
 */

import { useEffect, useRef, useState } from "react";
import { type PhotoResponse, listPhotos } from "@/lib/api/photos";

export type GalleryPhoto = {
  id: number;
  /** 서명된 조회 URL. preparing이어도 원본 URL이 올 수 있다. */
  url: string | null;
  /** 파생 JPEG 미생성(previewReady=false) — "미리보기 준비 중" 셀로 표시. */
  preparing: boolean;
  name: string;
  /** 표시용 포맷 (contentType의 서브타입 대문자, 예: JPEG) */
  format: string;
  /** 별점(1~5) — 사진당 하나, 부부·작가가 같은 칸을 쓴다. 없으면 null */
  score: number | null;
};

type Result =
  | {
      kind: "ready";
      photos: GalleryPhoto[];
      /** 서버가 아는 전체 장수 — 무한 스크롤의 "n/전체" 표기용 */
      totalCount: number;
      /** 더 불러올 페이지가 남았는지 (incremental 모드에서만 true일 수 있다) */
      hasMore: boolean;
    }
  | { kind: "error" };

type Options = {
  /** true면 첫 페이지만 받고 loadMore()로 이어 붙인다 — 부부 무한 스크롤 */
  incremental?: boolean;
  pageSize?: number;
};

const MIN_SILENT_INTERVAL_MS = 15_000;
const ERROR_RESULT: Result = { kind: "error" };

/** 서버 사진 → 화면 사진 매핑 */
export function toGalleryPhoto(p: PhotoResponse): GalleryPhoto {
  return {
    id: p.photoId,
    url: p.viewUrl,
    preparing: !p.previewReady,
    name: p.originalFileName,
    format: (p.contentType.split("/")[1] ?? "").toUpperCase(),
    score: p.score,
  };
}

function toVisiblePhotos(contents: PhotoResponse[]): GalleryPhoto[] {
  return contents
    .filter((p) => p.status !== "PENDING" && p.viewUrl !== null)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(toGalleryPhoto);
}

/** 0페이지부터 maxPages장까지(또는 hasNext가 꺼질 때까지) 순회 */
async function fetchPages(galleryId: number, size: number, maxPages: number) {
  const all: PhotoResponse[] = [];
  let page = 0;
  let ttlSeconds = 900;
  let hasNext = false;
  let totalCount = 0;
  for (;;) {
    const res = await listPhotos(galleryId, page, size);
    all.push(...res.contents);
    ttlSeconds = res.viewUrlTtlSeconds;
    totalCount = res.totalCount;
    hasNext = res.hasNext;
    page += 1;
    if (!res.hasNext || page >= maxPages) break;
  }
  return {
    photos: toVisiblePhotos(all),
    raw: all,
    ttlSeconds,
    hasNext,
    pagesLoaded: page,
    totalCount,
  };
}

export function useGalleryPhotos(rawId: string, options?: Options) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const incremental = options?.incremental ?? false;
  const pageSize = options?.pageSize ?? 200;
  const [result, setResult] = useState<Result | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const ttlTimerRef = useRef<number | null>(null);
  const lastSilentRef = useRef(0);
  const silentBusyRef = useRef(false);
  // 지금까지 받은 원본 응답 — loadMore가 이어 붙이고, TTL 재조회가 페이지 수를 참조
  const rawRef = useRef<PhotoResponse[]>([]);
  const pagesRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;

    function armTtlTimer(ttlSeconds: number) {
      if (ttlTimerRef.current !== null) window.clearTimeout(ttlTimerRef.current);
      const delay = Math.max(30, ttlSeconds - 60) * 1000;
      ttlTimerRef.current = window.setTimeout(() => void silentReload(), delay);
    }

    function apply(fetched: Awaited<ReturnType<typeof fetchPages>>) {
      rawRef.current = fetched.raw;
      pagesRef.current = fetched.pagesLoaded;
      setResult({
        kind: "ready",
        photos: fetched.photos,
        totalCount: fetched.totalCount,
        hasMore: incremental && fetched.hasNext,
      });
      armTtlTimer(fetched.ttlSeconds);
    }

    async function silentReload() {
      if (cancelled || silentBusyRef.current) return;
      silentBusyRef.current = true;
      lastSilentRef.current = Date.now();
      try {
        // 불러온 만큼만 다시 받아 스크롤 위치를 지킨다
        const fetched = await fetchPages(
          id,
          pageSize,
          incremental ? Math.max(pagesRef.current, 1) : Number.POSITIVE_INFINITY,
        );
        if (cancelled) return;
        apply(fetched);
      } catch {
        // 조용한 갱신 실패 — 기존 URL로 버티고 다음 onError·TTL 때 재시도
      } finally {
        silentBusyRef.current = false;
      }
    }

    (async () => {
      try {
        const fetched = await fetchPages(
          id,
          pageSize,
          incremental
            ? Math.max(pagesRef.current, 1)
            : Number.POSITIVE_INFINITY,
        );
        if (cancelled) return;
        apply(fetched);
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();

    return () => {
      cancelled = true;
      if (ttlTimerRef.current !== null) window.clearTimeout(ttlTimerRef.current);
    };
  }, [id, validId, nonce, incremental, pageSize]);

  /** 다음 페이지 이어 붙이기 — incremental 모드 전용 (바닥 근접 시 호출) */
  async function loadMore() {
    if (!validId || !incremental || loadingMore) return;
    if (result?.kind !== "ready" || !result.hasMore) return;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const res = await listPhotos(id, pagesRef.current, pageSize);
      if (!mountedRef.current) return;
      rawRef.current = [...rawRef.current, ...res.contents];
      pagesRef.current += 1;
      setResult({
        kind: "ready",
        photos: toVisiblePhotos(rawRef.current),
        totalCount: res.totalCount,
        hasMore: res.hasNext,
      });
    } catch {
      if (mountedRef.current) setLoadMoreFailed(true);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }

  /** 전체 다시 조회 (로딩 상태로 전환) — 오류 화면의 재시도·업로드 직후 반영용 */
  function reload() {
    rawRef.current = [];
    pagesRef.current = 0;
    setResult(null);
    setLoadMoreFailed(false);
    setNonce((n) => n + 1);
  }

  /** 이미지 로드 실패 폴백 — URL 만료 추정 시 조용히 재조회 (최소 간격 보호) */
  function refreshOnImageError() {
    if (Date.now() - lastSilentRef.current < MIN_SILENT_INTERVAL_MS) return;
    lastSilentRef.current = Date.now();
    setNonce((n) => n + 1);
  }

  /** 기존 목록을 유지한 채 조용히 재조회 — 임베딩 진행(#24)의 셀 교체용 */
  function silentRefresh() {
    setNonce((n) => n + 1);
  }

  return {
    result: validId ? result : ERROR_RESULT,
    reload,
    refreshOnImageError,
    silentRefresh,
    loadMore,
    loadingMore,
    loadMoreFailed,
  };
}
