/**
 * 부부 — 사진 분류 결과 카테고리 정의
 * 위치: src/app/(couple)/gallery/compare-results/_lib/resultCategories.ts
 *
 * 사진 분류 결과 목록과 상세 페이지가 같은 라벨·색상·경로를 쓰도록 모은다.
 */

import { COMPARE_TAG_LABEL, type CompareTag } from "@/lib/couple";

export type ResultCategory = CompareTag | "undecided";

export const CATEGORY_ORDER: ResultCategory[] = [
  "good",
  "hold",
  "remove",
  "undecided",
];

export const CATEGORY_META: Record<
  ResultCategory,
  {
    label: string;
    description: string;
    dotClassName: string;
    cardClassName: string;
  }
> = {
  good: {
    label: COMPARE_TAG_LABEL.good,
    description: "최종 후보로 남겨둔 사진",
    dotClassName: "bg-select",
    cardClassName: "border-select-soft bg-select-soft/40",
  },
  hold: {
    label: COMPARE_TAG_LABEL.hold,
    description: "다시 보고 결정할 사진",
    dotClassName: "bg-hold",
    cardClassName: "border-hold-soft bg-hold-soft/40",
  },
  remove: {
    label: COMPARE_TAG_LABEL.remove,
    description: "후보에서 제외한 사진",
    dotClassName: "bg-ink",
    cardClassName: "border-line bg-white",
  },
  undecided: {
    label: "미정",
    description: "아직 분류하지 않은 사진",
    dotClassName: "bg-line-strong",
    cardClassName: "border-line bg-paper",
  },
};

export function isResultCategory(value: string): value is ResultCategory {
  return CATEGORY_ORDER.includes(value as ResultCategory);
}

export function categoryResultHref(category: ResultCategory) {
  return `/gallery/compare-results/${category}`;
}
