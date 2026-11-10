"use client";

/**
 * 앨범에 넣을 사진 — 클라이언트가 고른 사진 + 보낸 회차의 보정본(이슈 168)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumSource.ts
 *
 * 사진은 선택 앨범 순서 그대로. 보정본이 있으면 보정본을 쓴다 — 보낸(COMPLETED) 회차의 결과만 보고, 뒤 회차가 앞 회차를 덮는다.
 * 선택 앨범은 10초마다 · 창으로 돌아올 때 다시 읽고, 못 읽으면 마지막 값을 그대로 둔다(편집 중인 화면이 사라지지 않게).
 * 보정 배너(보정 전 · 회차 반영 · 확정)도 회차 목록에서 정해서 함께 돌려준다. 결과 주소는 서명 URL이라 수명 전에 다시 읽는다.
 */

import { useEffect, useMemo, useState } from "react";
import type { GalleryResponse } from "@/lib/api/galleries";
import { getRetouchRound, type RetouchOverviewResponse } from "@/lib/api/retouch";
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

/** 보낸 회차의 결과 주소 — photoId → 마지막 회차 결과 */
function useRoundResults(galleryId: number, overview: RetouchOverviewResponse | null) {
  const completed = useMemo(() => (overview?.rounds ?? []).filter((r) => r.status === "COMPLETED"), [overview]);
  const key = completed.map((r) => `${r.roundNo}:${r.completedAt ?? ""}`).join(",");
  const [state, setState] = useState<{ key: string; nonce: number; map: Map<number, string> }>({ key: "", nonce: 0, map: EMPTY_RESULTS });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let timer = 0;
    (async () => {
      const details = await Promise.allSettled(completed.map((r) => getRetouchRound(galleryId, r.roundNo)));
      if (cancelled) return;
      const map = new Map<number, string>();
      let ttl = Infinity;
      details
        .flatMap((d) => (d.status === "fulfilled" ? [d.value] : []))
        .sort((a, b) => a.roundNo - b.roundNo)
        .forEach((round) => {
          ttl = Math.min(ttl, round.viewUrlTtlSeconds);
          for (const p of round.photos) if (p.resultUrl) map.set(p.photo.photoId, p.resultUrl);
        });
      setState({ key, nonce, map });
      // 서명 URL 수명 1분 전에 다시 읽는다
      if (Number.isFinite(ttl)) timer = window.setTimeout(() => setNonce((n) => n + 1), Math.max(60, ttl - 60) * 1000);
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // completed는 key와 함께 바뀐다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId, key, nonce]);

  return key && state.key === key ? state.map : EMPTY_RESULTS;
}

function retouchBannerOf(gallery: GalleryResponse, overview: RetouchOverviewResponse | null, retouchOn: boolean): RetouchBanner | null {
  if (gallery.stage === "ARCHIVED") {
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
