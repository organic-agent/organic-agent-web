"use client";

/**
 * 개인 갤러리 첫 진입 코치마크 3 — 사진 올리기 · 플랜 · 초대 (2026-09-14)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PersonalCoachMarks.tsx
 *
 * 대상은 data-coach 속성(upload · plan · invite). 파트너는 초대 칸 없이 2단계 — 올리기 문구가 "둘이 한 갤러리에"를 말한다
 * (이슈 75, 2026-09-23). 그리기 · 기록(`sel.coach.personalUpload`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "upload",
    eyebrow: "사진 올리기",
    title: "작가에게 받은 원본을 올려요",
    body: "올리면 AI가 컨셉 · 세부 폴더로 나눠 드려요. 폴더를 확인하고 확정하면 고를 수 있어요.",
  },
  {
    key: "plan",
    eyebrow: "플랜",
    title: "사진 상한과 이용 기간",
    body: "플랜에 정한 장수까지 올릴 수 있고, 기간이 끝나면 갤러리가 닫혀요.",
  },
  {
    key: "invite",
    eyebrow: "초대",
    title: "함께 고를 사람을 초대해요",
    body: "파트너는 링크 하나로 들어와 같이 올리고 고를 수 있어요. 가족 · 친구에게는 공유폴더 링크를 보내요.",
  },
];

const PARTNER_STEPS: ReadonlyArray<CoachStep> = STEPS.filter((step) => step.key !== "invite").map((step) =>
  step.key === "upload"
    ? { ...step, title: "둘 중 누가 올려도 한 갤러리에 모여요", body: "작가에게 받은 원본을 올리면 AI가 컨셉 · 세부 폴더로 나눠 드려요. 폴더를 확정하면 함께 고를 수 있어요." }
    : step,
);

export function PersonalCoachMarks({ ready, owner = true }: { ready: boolean; owner?: boolean }) {
  return <CoachMarks steps={owner ? STEPS : PARTNER_STEPS} storeKey="sel.coach.personalUpload" ready={ready} />;
}
