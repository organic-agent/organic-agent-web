"use client";

/**
 * 사진 크게 보기(셀렉 단계) 코치마크 6 (2026-10-05)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/LightboxCoachMarks.tsx
 *
 * 하단 조작 줄을 왼쪽부터: 별점 → 선택 → 확대 → 정보 → 보정 요청 → 게스트 반응. 대상은 data-coach 속성(lb-…).
 * 사진을 처음 크게 열었을 때 뜬다. 크게 보기 위에 뜨므로 말풍선만 누를 수 있고(modal), 화면이 어두워 구멍에 테두리를 두른다(onDark).
 * 예전의 별점 숫자 키 말풍선(팀 노션 24번)은 이 묶음의 별점 단계가 대신한다. 그리기 · 기록(`sel.coach.lightbox`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "lb-stars",
    eyebrow: "별점",
    title: "사진에 별점을 매겨요",
    body: "별을 누르거나 키보드 숫자 키 1~5를 눌러요.",
  },
  {
    key: "lb-pick",
    eyebrow: "선택",
    title: "여기서도 선택할 수 있어요",
    body: "\"선택\"을 누르거나 Space 키를 눌러요.",
  },
  {
    key: "lb-zoom",
    eyebrow: "확대",
    title: "크게 확대해서 봐요",
    body: "버튼이나 마우스 휠로도 확대가 가능해요.",
  },
  {
    key: "lb-info",
    eyebrow: "정보",
    title: "사진 정보와 메모",
    body: "AI 추천 여부와 본 횟수가 보여요. 메모는 작가에게 보이지 않아요.",
  },
  {
    key: "lb-memo",
    eyebrow: "보정 요청",
    title: "고칠 곳을 사진 위에 찍어요",
    body: "사진 위를 눌러 점을 찍고 원하는 보정을 적어요. 선택한 사진의 요청만 작가에게 전달돼요.",
  },
  {
    key: "lb-guest",
    eyebrow: "게스트 반응",
    title: "게스트의 좋아요와 댓글",
    body: "공유폴더에서 받은 좋아요와 댓글을 볼 수 있어요. 게스트가 반응을 남긴 사진에서만 버튼이 활성화돼요.",
  },
];

/** 개인 갤러리는 작가에게 전달하지 않고 요청서에 싣는다 */
const PERSONAL_STEPS: ReadonlyArray<CoachStep> = STEPS.map((step) =>
  step.key === "lb-memo" ? { ...step, body: "사진 위를 눌러 점을 찍고 원하는 보정을 적어요. 선택한 사진의 요청만 요청서에 실려요." } : step,
);

export function LightboxCoachMarks({ ready, personal = false }: { ready: boolean; personal?: boolean }) {
  return <CoachMarks steps={personal ? PERSONAL_STEPS : STEPS} storeKey="sel.coach.lightbox" ready={ready} modal onDark />;
}
