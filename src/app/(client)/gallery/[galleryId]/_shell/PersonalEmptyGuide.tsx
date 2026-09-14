"use client";

/**
 * 개인 갤러리 빈 화면 — 작가 1단계 안내 카드를 개인 문구로 (올리기 → AI가 정리 → 둘이 고르기)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PersonalEmptyGuide.tsx
 */

import { EmptyUploadGuide, type GuideStep } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/EmptyUploadGuide";
import { CheckCircleIcon, CloudUploadIcon, SparkleIcon } from "@/components/icons";

const STEPS: readonly GuideStep[] = [
  { icon: <CloudUploadIcon size={18} />, title: "사진 올리기", desc: "작가에게 받은 원본을 그대로" },
  { icon: <SparkleIcon size={18} />, title: "AI가 정리", desc: "컨셉 · 세부 폴더로 나눠요" },
  { icon: <CheckCircleIcon size={18} />, title: "고르기", desc: "둘이 함께 골라요" },
];

export function PersonalEmptyGuide() {
  return <EmptyUploadGuide title="사진을 올리면 시작돼요" lead="아래 버튼으로 첫 사진을 올려 주세요." steps={STEPS} />;
}
