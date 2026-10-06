"use client";

/**
 * 개인 갤러리 첫 진입 코치마크 2 — 사진 올리기 · 초대 (2026-09-14, 2026-10-05 손질)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PersonalCoachMarks.tsx
 *
 * 대상은 data-coach 속성(upload · invite). 파트너는 초대 칸 없이 1단계 — 올리기 문구가 "둘이 한 갤러리에"를 말한다
 * (이슈 75, 2026-09-23). 플랜 단계는 뺐다 — 플랜 카드가 사이드바 안에 있는데 이 화면은 사이드바가 닫힌 채로 시작해서 뜨지 않고 있었다.
 * 그리기 · 기록(`sel.coach.personalUpload`)은 공통 CoachMarks.
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
    key: "invite",
    eyebrow: "초대",
    title: "함께 고를 사람을 초대해요",
    // 가족 · 친구에게 보내는 공유폴더는 셀렉 단계부터 만들 수 있다(이 단계의 초대 모달은 게스트 탭이 잠겨 있다)
    body: "파트너는 링크 하나로 들어와 같이 올리고 고를 수 있어요. 가족 · 친구 초대는 사진을 고르는 단계부터 돼요.",
  },
];

const PARTNER_STEPS: ReadonlyArray<CoachStep> = [
  { ...STEPS[0], title: "둘 중 누가 올려도 한 갤러리에 모여요", body: "작가에게 받은 원본을 올리면 AI가 컨셉 · 세부 폴더로 나눠 드려요. 폴더를 확정하면 함께 고를 수 있어요." },
];

export function PersonalCoachMarks({ ready, owner = true }: { ready: boolean; owner?: boolean }) {
  return <CoachMarks steps={owner ? STEPS : PARTNER_STEPS} storeKey="sel.coach.personalUpload" ready={ready} />;
}
