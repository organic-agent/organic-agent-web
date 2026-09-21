"use client";

/**
 * 개인 갤러리 빈 화면 — 작가 1단계 안내 카드 그대로, 3번 칸만 "확인하고 열기(클라이언트 초대)" 대신 "확인하고 확정"
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PersonalEmptyGuide.tsx
 *
 * 작가 · 초대 클라이언트와 겹치는 화면은 최대한 같게(2026-09-15 수민) — 제목 · 문구 · 번호 · 아이콘 크기 모두 작가 카드.
 */

import { EmptyUploadGuide, type GuideStep, UPLOAD_GUIDE_STEPS } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/EmptyUploadGuide";
import { CheckCircleIcon } from "@/components/icons";

const STEPS: readonly GuideStep[] = [
  UPLOAD_GUIDE_STEPS[0],
  UPLOAD_GUIDE_STEPS[1],
  { icon: <CheckCircleIcon size={20} />, title: "3. 확인하고 확정", desc: "함께 고르기" },
];

export function PersonalEmptyGuide() {
  return <EmptyUploadGuide steps={STEPS} />;
}
