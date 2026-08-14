/**
 * 부부 — 선택 앨범 저장소
 * 위치: src/lib/couple/selectedAlbum.ts
 *
 * 최종 작가 전달용 사진 id 목록을 localStorage에 저장한다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export const SELECT_TARGET = 50;

const selectedStore = createLocalStore<number[]>("wes.selectedPhotoIds", []);

export function useSelectedIds(): number[] {
  return useSyncExternalStore(
    selectedStore.subscribe,
    selectedStore.get,
    selectedStore.getServerSnapshot,
  );
}

export function addToSelected(ids: number[]): {
  added: number[];
  rejectedCount: number;
} {
  const current = selectedStore.get();
  const currentSet = new Set(current);
  const toAdd = ids.filter((id) => !currentSet.has(id));
  const remaining = Math.max(0, SELECT_TARGET - current.length);
  const added = toAdd.slice(0, remaining);
  const rejectedCount = toAdd.length - added.length;
  if (added.length > 0) {
    selectedStore.set([...current, ...added]);
  }
  return { added, rejectedCount };
}

export function removeFromSelected(id: number) {
  selectedStore.set(selectedStore.get().filter((item) => item !== id));
}
