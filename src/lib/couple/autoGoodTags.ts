/**
 * 부부 — '담기로 자동 지정된 후보' 표시 저장소
 * 위치: src/lib/couple/autoGoodTags.ts
 *
 * 선택 앨범에 담으면서 자동으로 '후보(good)'가 된 사진 id를 기억한다.
 * 나중에 앨범에서 빼면 이 '자동 후보'만 풀어주고,
 * 사용자가 직접 지정한 후보는 그대로 둔다.
 *
 * 참고: 태그를 직접 바꾸면(setCompareTag) 그 사진의 자동 표시는 해제된다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

const autoGoodStore = createLocalStore<number[]>("wes.autoGoodPhotoIds", []);

export function useAutoGoodIds(): number[] {
  return useSyncExternalStore(
    autoGoodStore.subscribe,
    autoGoodStore.get,
    autoGoodStore.getServerSnapshot,
  );
}

/** 담기로 자동 지정된 후보인지 여부 */
export function isAutoGood(photoId: number): boolean {
  return autoGoodStore.get().includes(photoId);
}

/** 자동 후보로 표시 */
export function markAutoGood(photoId: number) {
  const current = autoGoodStore.get();
  if (current.includes(photoId)) return;
  autoGoodStore.set([...current, photoId]);
}

/** 자동 후보 표시 해제 */
export function clearAutoGood(photoId: number) {
  const current = autoGoodStore.get();
  if (!current.includes(photoId)) return;
  autoGoodStore.set(current.filter((id) => id !== photoId));
}
