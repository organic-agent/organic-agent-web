/**
 * 작가 — 갤러리 사진 목록 훅 (페이지 순회 + viewUrl TTL 재조회)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_lib/useGalleryPhotos.ts
 *
 * hasNext가 꺼질 때까지 페이지를 순회해 전체 사진을 모으고, displayOrder로
 * 정렬한다. PENDING(올리다 만 사진, viewUrl 없음)은 화면 대상이 아니라
 * 여기서 걸러낸다.
 *
 * viewUrl은 서명 URL이라 TTL 뒤 만료된다 — 만료 60초 전에 조용히 재조회해
 * 기존 목록을 유지한 채 교체한다(silent). 이미지 onError 폴백도 같은 silent
 * 재조회를 쓰되 과호출을 막기 위해 최소 간격을 둔다.
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
};

type Result = { kind: "ready"; photos: GalleryPhoto[] } | { kind: "error" };

const MIN_SILENT_INTERVAL_MS = 15_000;

/** 서버 사진 → 화면 사진 매핑 — 클러스터 미리보기(useClusterPreview)와 공유 */
export function toGalleryPhoto(p: PhotoResponse): GalleryPhoto {
  return {
    id: p.photoId,
    url: p.viewUrl,
    preparing: !p.previewReady,
    name: p.originalFileName,
    format: (p.contentType.split("/")[1] ?? "").toUpperCase(),
  };
}

async function fetchAllPhotos(galleryId: number) {
  const all = [];
  let page = 0;
  let ttlSeconds = 900;
  for (;;) {
    const res = await listPhotos(galleryId, page);
    all.push(...res.contents);
    ttlSeconds = res.viewUrlTtlSeconds;
    if (!res.hasNext) break;
    page += 1;
  }
  const photos: GalleryPhoto[] = all
    .filter((p) => p.status !== "PENDING" && p.viewUrl !== null)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(toGalleryPhoto);
  return { photos, ttlSeconds };
}

export function useGalleryPhotos(rawId: string) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [result, setResult] = useState<Result | null>(null);
  const [nonce, setNonce] = useState(0);
  const ttlTimerRef = useRef<number | null>(null);
  const lastSilentRef = useRef(0);
  const silentBusyRef = useRef(false);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;

    async function armTtlTimer(ttlSeconds: number) {
      if (ttlTimerRef.current !== null) window.clearTimeout(ttlTimerRef.current);
      const delay = Math.max(30, ttlSeconds - 60) * 1000;
      ttlTimerRef.current = window.setTimeout(() => void silentReload(), delay);
    }

    async function silentReload() {
      if (cancelled || silentBusyRef.current) return;
      silentBusyRef.current = true;
      lastSilentRef.current = Date.now();
      try {
        const { photos, ttlSeconds } = await fetchAllPhotos(id);
        if (cancelled) return;
        setResult({ kind: "ready", photos });
        void armTtlTimer(ttlSeconds);
      } catch {
        // 조용한 갱신 실패 — 기존 URL로 버티고 다음 onError·TTL 때 재시도
      } finally {
        silentBusyRef.current = false;
      }
    }

    (async () => {
      try {
        const { photos, ttlSeconds } = await fetchAllPhotos(id);
        if (cancelled) return;
        setResult({ kind: "ready", photos });
        void armTtlTimer(ttlSeconds);
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();

    return () => {
      cancelled = true;
      if (ttlTimerRef.current !== null) window.clearTimeout(ttlTimerRef.current);
    };
  }, [id, validId, nonce]);

  /** 전체 다시 조회 (로딩 상태로 전환) — 오류 화면의 재시도·업로드 직후 반영용 */
  function reload() {
    setResult(null);
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
    result: validId ? result : { kind: "error" as const },
    reload,
    refreshOnImageError,
    silentRefresh,
  };
}
