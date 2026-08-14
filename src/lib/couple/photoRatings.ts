/**
 * 부부 — 사진 별점 (시안 App/Toolbar StarRating의 데이터)
 * 위치: src/lib/couple/photoRatings.ts
 *
 * 사진별 0~5 별점을 로컬에 저장한다. 0점은 항목 삭제로 취급.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

const ratingsStore = createLocalStore<Record<number, number>>(
  "wes.photoRatings",
  {},
);

export function setPhotoRating(photoId: number, rating: number) {
  const next = { ...ratingsStore.get() };
  if (rating <= 0) delete next[photoId];
  else next[photoId] = rating;
  ratingsStore.set(next);
  return next;
}

export function usePhotoRatings(): Record<number, number> {
  return useSyncExternalStore(
    ratingsStore.subscribe,
    ratingsStore.get,
    ratingsStore.getServerSnapshot,
  );
}
