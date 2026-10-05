"use client";

/**
 * 클라이언트 2단계(셀렉 & 보정 요청) 첫 진입 코치마크 5 (2026-09-12 보드, 2026-10-05 손질)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientSelectCoachMarks.tsx
 *
 * 사진 선택 → 게스트 초대 → AI 추천 → 하객 반응 → 작가에게 전달하기. 대상은 data-coach 속성.
 * 한 장 보기(별점 · 보정 요청)는 사진을 크게 열었을 때의 코치마크(LightboxCoachMarks)가 맡는다.
 * 그리기 · 기록(`sel.coach.clientSelect`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "pick",
    eyebrow: "사진 선택",
    title: "체크박스로 선택한 사진을 표시해요",
    body: "체크된 사진이 선택한 사진이에요. 사진에 마우스를 올리면 왼쪽 위에 체크박스가 보여요.",
  },
  {
    key: "invite",
    eyebrow: "게스트 초대",
    title: "가족 · 친구에게 사진 보여 주기",
    body: "공유폴더를 만들어 링크를 보내면 로그인 없이 보고 좋아요와 댓글을 남길 수 있어요.",
  },
  {
    key: "ai",
    eyebrow: "AI 추천",
    title: "고르기 어려울 땐 AI 추천",
    body: "폴더별 사진 개수에 맞춰 일정한 비율로 골라 드려요. 마음에 들면 \"모두 선택\"으로 한 번에 담아요.",
  },
  {
    key: "reactions",
    eyebrow: "하객 반응",
    title: "하객이 누른 좋아요 보기",
    body: "누르면 게스트에게 받은 좋아요 수가 사진에 보여요.",
  },
  {
    key: "submit",
    eyebrow: "전달하기",
    title: "선택이 완료되면 작가에게 전달",
    body: "장수를 다 채워야 전달할 수 있어요. 보정 요청도 함께 전달돼요.",
  },
];

/** 개인 갤러리는 작가에게 전달하지 않고 요청서를 내보낸다 — 마지막 단계만 바꾼다 */
const PERSONAL_STEPS: ReadonlyArray<CoachStep> = STEPS.map((step) =>
  step.key === "submit"
    ? { ...step, eyebrow: "내보내기", title: "선택이 완료되면 요청서 내보내기", body: "내보내면 선택이 잠기고 보정 확인 단계로 넘어가요. 보정 요청도 함께 실려요." }
    : step,
);

export function ClientSelectCoachMarks({ ready, personal = false }: { ready: boolean; personal?: boolean }) {
  return <CoachMarks steps={personal ? PERSONAL_STEPS : STEPS} storeKey="sel.coach.clientSelect" ready={ready} />;
}
