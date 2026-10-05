"use client";

/**
 * 스튜디오 홈 첫 진입 코치마크 (와이어프레임 02 첫 진입)
 * 위치: src/app/(studio)/studio/_components/StudioCoachMarks.tsx
 *
 * 말풍선 4단계: 새 갤러리 → 필터 → 알림 → 초대. 그리기 · 기록(`sel.coach.studioHome`)은 공통 CoachMarks.
 * 초대 작가(멤버)는 초대 버튼이 없어 3단계 — 첫 진입 안내는 코치마크로만(이슈 75, 2026-09-23).
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "new-gallery",
    eyebrow: "새 갤러리",
    title: "촬영 건마다 갤러리 하나",
    body: "이름만 정하면 바로 만들 수 있어요. 사진을 올리면 AI가 폴더로 나눠 줘요.",
  },
  {
    key: "filter",
    eyebrow: "필터",
    title: "단계별로 모아 보기",
    body: "업로드부터 전달까지 단계별로 골라 보고, 보관한 갤러리도 여기서 찾아요.",
  },
  {
    key: "bell",
    eyebrow: "알림",
    title: "클라이언트 활동 알림",
    body: "사진을 고르거나 보정을 요청하면 여기로 알려 드려요.",
  },
  {
    key: "invite",
    eyebrow: "초대",
    title: "함께 일하는 작가 초대",
    body: "초대 링크로 함께 일하는 작가를 스튜디오에 불러요.",
  },
];

/** 초대 작가 — 초대 칸 없음, 새 갤러리 문구는 이용권이 소유자 몫임을 말한다 */
const MEMBER_STEPS: ReadonlyArray<CoachStep> = STEPS.filter((step) => step.key !== "invite").map((step) =>
  step.key === "new-gallery" ? { ...step, body: "이름만 정하면 바로 만들 수 있어요. 갤러리 하나에 이용권 하나가 들고, 이용권은 소유자가 관리해요." } : step,
);

export function StudioCoachMarks({ ready, owner = true }: { ready: boolean; owner?: boolean }) {
  return <CoachMarks steps={owner ? STEPS : MEMBER_STEPS} storeKey="sel.coach.studioHome" ready={ready} />;
}
