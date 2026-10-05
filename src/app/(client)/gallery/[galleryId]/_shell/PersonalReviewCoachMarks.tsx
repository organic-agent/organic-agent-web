"use client";

/**
 * 개인 갤러리 보정 확인 단계 코치마크 2 (2026-10-05)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PersonalReviewCoachMarks.tsx
 *
 * 보정본 올리기 → 갤러리 마무리. 요청서를 내보낸 뒤, 올릴 보정본이 남아 있는 동안 뜬다. 대상은 data-coach 속성.
 * 파트너에게는 마무리 버튼이 없어 1단계. 그리기 · 기록(`sel.coach.personalReview`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "result-upload",
    eyebrow: "보정본 올리기",
    title: "받은 보정본을 올려요",
    body: "파일 이름이 원본과 같으면 알아서 짝을 맞춰요. 올리면 전/후로 비교할 수 있어요.",
  },
  {
    key: "close",
    eyebrow: "마무리",
    title: "다 확인했으면 갤러리 마무리",
    body: "마무리하면 갤러리가 보관되고, 보정본은 언제든 내려받을 수 있어요.",
  },
];

const PARTNER_STEPS: ReadonlyArray<CoachStep> = STEPS.filter((step) => step.key !== "close");

export function PersonalReviewCoachMarks({ ready, owner = true }: { ready: boolean; owner?: boolean }) {
  return <CoachMarks steps={owner ? STEPS : PARTNER_STEPS} storeKey="sel.coach.personalReview" ready={ready} />;
}
