/**
 * 부부 — 사진 분류 태그 저장소
 * 위치: src/lib/couple/compareTags.ts
 *
 * 사진별 후보/고민중/제외 판단을 localStorage에 저장한다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type CompareTag = "hold" | "good" | "remove";

export const COMPARE_TAG_LABEL: Record<CompareTag, string> = {
  hold: "고민중",
  good: "후보",
  remove: "제외",
};

const compareTagsStore = createLocalStore<Record<number, CompareTag>>(
  "wes.compareTags",
  {},
);

export function useCompareTags(): Record<number, CompareTag> {
  return useSyncExternalStore(
    compareTagsStore.subscribe,
    compareTagsStore.get,
    compareTagsStore.getServerSnapshot,
  );
}

export function setCompareTag(
  photoId: number,
  tag: CompareTag,
): Record<number, CompareTag> {
  const next = { ...compareTagsStore.get(), [photoId]: tag };
  compareTagsStore.set(next);
  return next;
}
