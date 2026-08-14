/**
 * 사진 반응(좋아요·댓글) — 게스트가 남기고 부부 Reaction 패널이 읽는다
 * 위치: src/lib/couple/photoReactions.ts
 *
 * 백엔드 연동 전 로컬 데모 스토어. timeLabel은 표시용 문자열로 저장한다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type PhotoComment = {
  author: string;
  initial: string;
  timeLabel: string;
  text: string;
};

export type PhotoReaction = {
  /** 좋아요를 누른 사람 이름 목록 */
  likes: string[];
  comments: PhotoComment[];
};

export const EMPTY_REACTION: PhotoReaction = { likes: [], comments: [] };

const reactionsStore = createLocalStore<Record<number, PhotoReaction>>(
  "wes.photoReactions",
  {},
);

export function usePhotoReactions(): Record<number, PhotoReaction> {
  return useSyncExternalStore(
    reactionsStore.subscribe,
    reactionsStore.get,
    reactionsStore.getServerSnapshot,
  );
}

export function addPhotoComment(photoId: number, comment: PhotoComment) {
  const current = reactionsStore.get();
  const entry = current[photoId] ?? EMPTY_REACTION;
  reactionsStore.set({
    ...current,
    [photoId]: { ...entry, comments: [...entry.comments, comment] },
  });
}

export function togglePhotoLike(photoId: number, name: string) {
  const current = reactionsStore.get();
  const entry = current[photoId] ?? EMPTY_REACTION;
  const likes = entry.likes.includes(name)
    ? entry.likes.filter((n) => n !== name)
    : [...entry.likes, name];
  reactionsStore.set({ ...current, [photoId]: { ...entry, likes } });
}
