/**
 * 부부 — 사진 분류 태그 저장소
 * 위치: src/lib/couple/compareTags.ts
 *
 * 사진별 후보/고민중/제외 판단을 localStorage에 저장한다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";
import { clearAutoGood } from "./autoGoodTags";

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
  tag: CompareTag | undefined,
): Record<number, CompareTag> {
  const next = { ...compareTagsStore.get() };
  if (tag) {
    next[photoId] = tag;
  } else {
    delete next[photoId];
  }
  compareTagsStore.set(next);
  // 태그를 직접 바꾸면 '담기로 자동 지정된 후보' 표시는 해제한다(수동 결정으로 간주).
  clearAutoGood(photoId);
  return next;
}

export function clearCompareTag(
  photoId: number,
): Record<number, CompareTag> {
  return setCompareTag(photoId, undefined);
}

export function toggleCompareTag(
  photoId: number,
  tag: CompareTag,
): Record<number, CompareTag> {
  const currentTag = compareTagsStore.get()[photoId];
  return setCompareTag(photoId, currentTag === tag ? undefined : tag);
}
