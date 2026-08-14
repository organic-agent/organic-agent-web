/**
 * 부부 — 사진별 조회 기록
 * 위치: src/lib/couple/photoViewHistory.ts
 *
 * 사진별 조회 횟수와 마지막 확인 시간을 localStorage에 저장한다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type PhotoViewHistory = {
  count: number;
  lastViewedAt: string;
};

const photoViewHistoryStore = createLocalStore<Record<number, PhotoViewHistory>>(
  "wes.photoViewHistory",
  {},
);

export function usePhotoViewHistory(): Record<number, PhotoViewHistory> {
  return useSyncExternalStore(
    photoViewHistoryStore.subscribe,
    photoViewHistoryStore.get,
    photoViewHistoryStore.getServerSnapshot,
  );
}

export function recordPhotoView(
  photoId: number,
): Record<number, PhotoViewHistory> {
  const current = photoViewHistoryStore.get();
  const prev = current[photoId];
  const next = {
    ...current,
    [photoId]: {
      count: (prev?.count ?? 0) + 1,
      lastViewedAt: new Date().toISOString(),
    },
  };
  photoViewHistoryStore.set(next);
  return next;
}
