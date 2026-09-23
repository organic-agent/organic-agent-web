"use client";

/**
 * 클라이언트 2단계(셀렉 & 보정 요청) 첫 진입 코치마크 4 (2026-09-12 보드)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientSelectCoachMarks.tsx
 *
 * 사진 선택 → 한 장 보기(별점 · 보정 요청) → AI 추천 → 작가에게 전달하기. 대상은 data-coach 속성.
 * 그리기 · 기록(`sel.coach.clientSelect`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "pick",
    eyebrow: "사진 선택",
    title: "사진을 누르면 선택돼요",
    body: "고른 사진은 왼쪽 위 체크로 표시되고, 아래에서 몇 장 골랐는지 보여요. 계약 장수를 다 채우면 전달할 수 있어요.",
  },
  {
    key: "single",
    eyebrow: "한 장 보기",
    title: "별점과 보정 요청은 한 장씩",
    body: "돋보기나 더블클릭으로 크게 보면서 1~5 별점을 매기고, \"보정 요청\"에서 사진 위를 눌러 고칠 부분을 적어요.",
  },
  {
    key: "ai",
    eyebrow: "AI 추천",
    title: "고르기 어려울 땐 AI 추천",
    body: "폴더마다 몇 장씩 이유와 함께 골라 드려요. 마음에 들면 \"모두 선택\"으로 한 번에 담아요.",
  },
  {
    key: "submit",
    eyebrow: "전달하기",
    title: "다 골랐으면 작가에게 전달",
    body: "전달한 뒤에는 바꿀 수 없어요. 보정 요청도 함께 전달돼요.",
  },
];

/** 개인 갤러리는 작가에게 전달하지 않고 요청서를 내보낸다 — 마지막 두 문구만 바꾼다 */
const PERSONAL_STEPS: ReadonlyArray<CoachStep> = STEPS.map((step) =>
  step.key === "pick"
    ? { ...step, body: "고른 사진은 왼쪽 위 체크로 표시되고, 아래에서 몇 장 골랐는지 보여요. 목표 장수를 채우면 요청서를 내보낼 수 있어요." }
    : step.key === "submit"
      ? { ...step, title: "다 골랐으면 요청서 내보내기", body: "내보낸 뒤에는 바꿀 수 없어요. 보정 요청도 함께 실려요." }
      : step,
);

export function ClientSelectCoachMarks({ ready, personal = false }: { ready: boolean; personal?: boolean }) {
  return <CoachMarks steps={personal ? PERSONAL_STEPS : STEPS} storeKey="sel.coach.clientSelect" ready={ready} />;
}
