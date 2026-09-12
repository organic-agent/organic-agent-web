/**
 * 회차 항목 정규화 — 진행 중 회차(overview.currentRound)와 지난 회차(GET rounds/{n})를 한 모양으로
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/roundItems.ts
 *
 * 작가 3단계 · 클라이언트 보정 검토 공용. 결과 URL은 상세에서만 오므로 진행 중 회차도 상세를 겹쳐 쓴다.
 */

import type { PhotoResponse } from "@/lib/api/photos";
import type { RetouchPoint, RetouchRoundDetailResponse, RetouchRoundResponse } from "@/lib/api/retouch";

export type RetouchItem = {
  photo: PhotoResponse;
  requestText: string | null;
  points: RetouchPoint[];
  annotationUrl: string | null;
  hasResult: boolean;
  resultUrl: string | null;
};

export const hasMemo = (it: RetouchItem) => !!it.requestText?.trim() || it.points.length > 0;

export function normalizeRoundItems(
  currentRound: RetouchRoundResponse | null,
  detail: RetouchRoundDetailResponse | null,
  activeRoundNo: number | null,
): RetouchItem[] {
  const resultUrlById = new Map(detail?.roundNo === activeRoundNo ? detail.photos.map((p) => [p.photo.photoId, p.resultUrl]) : []);
  if (currentRound && currentRound.roundNo === activeRoundNo)
    return currentRound.photos.map((p) => ({
      photo: p.photo,
      requestText: p.requestText,
      points: p.points,
      annotationUrl: p.annotationUrl,
      hasResult: p.hasResult,
      resultUrl: resultUrlById.get(p.photo.photoId) ?? null,
    }));
  if (detail && detail.roundNo === activeRoundNo)
    return detail.photos.map((p) => ({
      photo: p.photo,
      requestText: p.requestText,
      points: p.points,
      annotationUrl: p.annotationUrl,
      hasResult: p.resultUrl !== null,
      resultUrl: p.resultUrl,
    }));
  return [];
}
