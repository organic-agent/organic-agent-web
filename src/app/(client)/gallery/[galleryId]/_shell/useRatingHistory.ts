/**
 * 사진 한 장의 별점 기록(이슈 148 2차) — 크게 보기의 정보 탭이 열려 있는 동안만 읽는다
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useRatingHistory.ts
 *
 * 사진이 바뀌면 새로 읽고, version이 오르면 같은 사진을 다시 읽는다. version은 SelectStage가 올린다 —
 * 별점 변경 번호(ratingRevision)가 바뀌어 전체 목록을 받았을 때와 내 별점 저장이 끝났을 때(둘 다 기록이 한 줄 늘어난 순간).
 * 다시 읽는 동안은 이전 기록을 그대로 보여 깜빡이지 않는다. 늦게 온 답은 버린다.
 */

import { useEffect, useState } from "react";
import { listPhotoRatingHistory, type PhotoRatingHistoryResponse } from "@/lib/api/ratings";

export type RatingHistoryState = {
  /** null이면 아직 못 읽었다(읽는 중 · 꺼짐 · 실패) */
  rows: PhotoRatingHistoryResponse[] | null;
  failed: boolean;
};

export function useRatingHistory(galleryId: number, photoId: number | null, enabled: boolean, version: number): RatingHistoryState {
  const [state, setState] = useState<{ photoId: number | null } & RatingHistoryState>({ photoId: null, rows: null, failed: false });

  useEffect(() => {
    if (!enabled || photoId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listPhotoRatingHistory(galleryId, photoId);
        if (!cancelled) setState({ photoId, rows, failed: false });
      } catch {
        if (!cancelled) setState({ photoId, rows: null, failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, photoId, enabled, version]);

  if (!enabled || photoId === null || state.photoId !== photoId) return { rows: null, failed: false };
  return { rows: state.rows, failed: state.failed };
}
