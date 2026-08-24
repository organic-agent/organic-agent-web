/**
 * 부부 — 사진 별점 훅 (서버 전환, WES-264)
 * 위치: src/app/(couple)/gallery/_lib/usePhotoRating.ts
 *
 * 점수의 진실은 사진 목록 응답의 score다. 이 훅은 그 위에 "방금 매긴 점수"
 * 오버레이만 얹는다 — 목록을 통째로 재조회하지 않고도 별이 즉시 칠해지고,
 * TTL 재조회가 돌면 서버 값이 자연히 따라잡는다. 실패하면 오버레이만 걷어
 * 서버 값으로 되돌아간다.
 */

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { clearPhotoRating, ratePhoto } from "@/lib/api/ratings";
import type { GalleryPhoto } from "@/lib/galleryPhotos";

export function usePhotoRating(
  rawId: string,
  onNotice?: (message: string) => void,
) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  // 같은 사진의 왕복이 겹치지 않게 — 다른 사진끼리는 병행해도 안전
  const busyRef = useRef<Set<number>>(new Set());
  const onNoticeRef = useRef(onNotice);
  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);

  /** 화면에 그릴 점수 — 방금 매긴 값이 있으면 그것, 없으면 서버 값 */
  function scoreOf(photo: Pick<GalleryPhoto, "id" | "score">): number {
    return overrides[photo.id] ?? photo.score ?? 0;
  }

  /** 별점 매기기/지우기(0점) — 낙관적 반영, 실패 시 서버 값으로 복귀 */
  async function rate(photoId: number, score: number) {
    if (!validId || busyRef.current.has(photoId)) return;
    busyRef.current.add(photoId);
    setOverrides((prev) => ({ ...prev, [photoId]: score }));
    try {
      if (score <= 0) await clearPhotoRating(id, photoId);
      else await ratePhoto(id, photoId, score);
    } catch (err) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[photoId];
        return next;
      });
      onNoticeRef.current?.(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      busyRef.current.delete(photoId);
    }
  }

  return { scoreOf, rate };
}
