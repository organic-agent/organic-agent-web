/**
 * 부부 — 사진별 메모와 보정 요청
 * 위치: src/lib/couple/photoNotes.ts
 *
 * 부부가 사진별로 남기는 개인 메모와 작가에게 전달할 보정 요청을 저장한다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

const photoMemosStore = createLocalStore<Record<number, string>>(
  "wes.photoMemos",
  {},
);

const retouchRequestsStore = createLocalStore<Record<number, string>>(
  "wes.retouchRequests",
  {},
);

export function usePhotoMemos(): Record<number, string> {
  return useSyncExternalStore(
    photoMemosStore.subscribe,
    photoMemosStore.get,
    photoMemosStore.getServerSnapshot,
  );
}

export function setPhotoMemo(photoId: number, memo: string) {
  const next = { ...photoMemosStore.get() };
  if (memo.trim()) next[photoId] = memo;
  else delete next[photoId];
  photoMemosStore.set(next);
  return next;
}

export function useRetouchRequests(): Record<number, string> {
  return useSyncExternalStore(
    retouchRequestsStore.subscribe,
    retouchRequestsStore.get,
    retouchRequestsStore.getServerSnapshot,
  );
}

export function setRetouchRequest(photoId: number, request: string) {
  const next = { ...retouchRequestsStore.get() };
  if (request.trim()) next[photoId] = request;
  else delete next[photoId];
  retouchRequestsStore.set(next);
  return next;
}
