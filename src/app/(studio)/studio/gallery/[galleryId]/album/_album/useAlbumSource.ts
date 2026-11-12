"use client";

/**
 * 앨범에 넣을 사진 — 클라이언트가 고른 사진 + 보낸 회차의 보정본(이슈 168)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumSource.ts
 *
 * 사진은 선택 앨범 순서 그대로. 보정본이 있으면 보정본을 쓴다 — 서버가 사진별로 마지막으로 보낸 회차의 결과를 한 번에 준다(PR ④).
 * 선택 앨범은 10초마다 · 창으로 돌아올 때 다시 읽고, 못 읽으면 마지막 값을 그대로 둔다(편집 중인 화면이 사라지지 않게).
 * 보정 배너(보정 전 · 회차 반영 · 확정)는 회차 목록에서 정한다. 회차를 새로 보내면 결과 주소를 다시 읽고, 서명 URL이라 수명 전에도 다시 읽는다.
 */

import { useEffect, useMemo, useState } from "react";
import { getAlbumPhotos } from "@/lib/api/album";
import type { GalleryResponse } from "@/lib/api/galleries";
import type { RetouchOverviewResponse } from "@/lib/api/retouch";
import { getPhotoSelection, type PhotoSelectionResponse } from "@/lib/api/selection";
import { useRetouchOverview } from "../../_shell/useRetouchOverview";

export type AlbumPhoto = {
  photoId: number;
  /** 그릴 주소 — 보정본이 있으면 보정본 */
  src: string | null;
  fileName: string;
  retouched: boolean;
};

/** 보정 배너 — key가 바뀌면(상태가 바뀌면) 닫았어도 다시 뜬다 */
export type RetouchBanner = { key: string; tone: "warn" | "info" | "ok"; title: string; body: string };

const EMPTY_RESULTS = new Map<number, string>();
const SELECTION_MS = 10_000;

/** 선택 앨범 — 못 읽으면 마지막 값 유지. reload는 미리보기 쿠키가 안 실리는 환경에서 서명 URL로 다시 읽을 때 */
export function useAlbumSelection(galleryId: number, enabled: boolean) {
  const [selection, setSelection] = useState<PhotoSelectionResponse | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await getPhotoSelection(galleryId);
        if (!cancelled) setSelection(res);
      } catch {
        // 다음 차례에 다시 — 마지막 값은 그대로
      }
    }
    void tick();
    const timer = window.setInterval(() => void tick(), SELECTION_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [galleryId, enabled, nonce]);
  return { selection, reload: () => setNonce((n) => n + 1) };
}

/** 보정본 주소 — photoId → 마지막으로 보낸 회차의 결과. 보낸 회차가 바뀌면 다시 읽고, 다시 읽는 동안은 앞의 주소를 그대로 쓴다 */
function useRoundResults(galleryId: number, overview: RetouchOverviewResponse | null) {
  const key = (overview?.rounds ?? [])
    .filter((r) => r.status === "COMPLETED")
    .map((r) => `${r.roundNo}:${r.completedAt ?? ""}`)
    .join(",");
  const [map, setMap] = useState<Map<number, string>>(EMPTY_RESULTS);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let timer = 0;
    (async () => {
      try {
        const res = await getAlbumPhotos(galleryId);
        if (cancelled) return;
        const next = new Map<number, string>();
        for (const p of res.photos) if (p.resultUrl) next.set(p.photoId, p.resultUrl);
        setMap(next);
        // 서명 URL 수명 1분 전에 다시 읽는다
        timer = window.setTimeout(() => setNonce((n) => n + 1), Math.max(60, res.viewUrlTtlSeconds - 60) * 1000);
      } catch {
        // 못 읽으면 앞의 주소(없으면 원본)로 그린다
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [galleryId, key, nonce]);

  return key ? map : EMPTY_RESULTS;
}

function retouchBannerOf(gallery: GalleryResponse, overview: RetouchOverviewResponse | null, retouchOn: boolean): RetouchBanner | null {
  // 앨범 단계 = 클라이언트가 보정을 확정한 뒤
  if (gallery.stage === "ALBUM" || gallery.stage === "ARCHIVED") {
    return gallery.retouchConfirmedAt
      ? { key: "confirmed", tone: "ok", title: "보정이 확정됐어요", body: "앨범의 모든 사진이 최종 보정본이에요" }
      : { key: "closed", tone: "ok", title: "보정이 끝났어요", body: "앨범의 사진이 마지막 보정본이에요" };
  }
  // 회차가 생기기 전(셀렉 중)이면 보정 전, 회차를 아직 못 읽었으면(읽는 중 · 실패) 배너 없음
  if (!retouchOn) return before();
  if (overview === null) return null;
  const sent = overview.rounds.filter((r) => r.status === "COMPLETED");
  const last = sent[sent.length - 1];
  if (!last) return before();
  const again = overview.currentRound && overview.currentRound.roundNo > last.roundNo && overview.currentRound.status === "REQUESTED" ? overview.currentRound.photos.length : 0;
  return {
    key: `round-${last.roundNo}`,
    tone: "info",
    title: `${last.roundNo}차 보정본 ${last.photoCount}장이 앨범에 반영됐어요`,
    body: again > 0 ? `다시 요청한 ${again}장은 아직 ${last.roundNo}차 보정본이에요` : "",
  };
}

const before = (): RetouchBanner => ({ key: "before", tone: "warn", title: "아직 보정 전 사진이에요", body: "보정본이 올라오면 앨범에도 저절로 바뀌어요" });

export function useAlbumSource(galleryId: number, gallery: GalleryResponse | null, selection: PhotoSelectionResponse | null) {
  // 회차는 클라이언트가 전달한 뒤에만 생긴다
  const retouchOn = gallery !== null && gallery.stage !== "UPLOAD" && gallery.stage !== "SELECTION_IN_PROGRESS";
  const { overview } = useRetouchOverview(galleryId, retouchOn);
  const results = useRoundResults(galleryId, overview);

  const photos = useMemo<AlbumPhoto[] | null>(() => {
    if (!selection) return null;
    return selection.photos.map((item) => {
      const result = results.get(item.photo.photoId) ?? item.resultUrl;
      return {
        photoId: item.photo.photoId,
        src: result ?? item.photo.viewUrl,
        fileName: item.photo.originalFileName,
        retouched: Boolean(result),
      };
    });
  }, [selection, results]);

  const banner = gallery ? retouchBannerOf(gallery, overview, retouchOn) : null;
  // 사이드바 "보정 사진" 행 — 진행 중 회차, 없으면 마지막으로 보낸 회차의 장수(회차 전이면 잠김)
  const lastSent = overview?.rounds.filter((r) => r.status === "COMPLETED").at(-1);
  const retouchCount = retouchOn && overview ? (overview.currentRound?.photos.length ?? lastSent?.photoCount ?? null) : null;
  return { photos, banner, retouchCount };
}
