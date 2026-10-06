"use client";

/**
 * 클라이언트 컨셉 분류 첫 진입 코치마크 4 (2026-09-11, 2026-10-05 손질)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientCoachMarks.tsx
 *
 * 사이드바 → 컨셉 폴더 → 사진 옮기기 → 폴더 확정. 대상은 data-coach 속성.
 * 이 단계는 사이드바가 닫힌 채로 시작해서 여는 곳부터 알려 준다 — 열어 둔 사람도 안내가 뜰 때는 닫는다(onStart).
 * 그리기 · 기록(`sel.coach.clientSort`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "sidebar",
    eyebrow: "사이드바",
    title: "사이드바는 여기서 열어요",
    body: "갤러리 이름과 진행 상태가 들어 있어요. 넓게 보려면 접어 두세요.",
  },
  {
    key: "folders",
    eyebrow: "컨셉 폴더",
    title: "AI가 분류한 폴더",
    body: "폴더를 추가하거나 세부 폴더를 합칠 수 있어요.",
  },
  {
    key: "photos",
    eyebrow: "사진 옮기기",
    title: "사진을 다른 폴더로",
    body: "사진을 끌어 원하는 컨셉의 세부 폴더에 놓으면 옮겨져요.",
  },
  {
    key: "confirm",
    eyebrow: "폴더 확정",
    title: "분류가 끝나면 확정",
    body: "확정은 한 번만 할 수 있고, 그 뒤 사진 셀렉이 열려요.",
  },
];

/** 개인 갤러리는 사이드바에 플랜 카드도 있다 */
const PERSONAL_STEPS: ReadonlyArray<CoachStep> = STEPS.map((step) =>
  step.key === "sidebar" ? { ...step, body: "갤러리 이름, 진행 상태, 플랜이 들어 있어요. 넓게 보려면 접어 두세요." } : step,
);

export function ClientCoachMarks({ ready, personal = false, onStart }: { ready: boolean; personal?: boolean; onStart?: () => void }) {
  return <CoachMarks steps={personal ? PERSONAL_STEPS : STEPS} storeKey="sel.coach.clientSort" ready={ready} onStart={onStart} />;
}
