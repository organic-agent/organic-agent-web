"use client";

/**
 * 스튜디오 홈 첫 진입 코치마크 (와이어프레임 02 첫 진입)
 * 위치: src/app/(studio)/studio/_components/StudioCoachMarks.tsx
 *
 * 말풍선 4단계: 새 갤러리 → 필터 → 알림 → 초대. 그리기 · 기록(`sel.coach.studioHome`)은 공통 CoachMarks.
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
    round: true,
  },
  {
    key: "bell",
    eyebrow: "알림",
    title: "클라이언트 활동 알림",
    body: "사진을 고르거나 보정을 요청하면 여기로 알려 드려요.",
    round: true,
  },
  {
    key: "invite",
    eyebrow: "초대",
    title: "함께 일하는 작가 초대",
    body: "초대 링크로 함께 일하는 작가를 스튜디오에 불러요.",
    round: true,
  },
];

export function StudioCoachMarks({ ready }: { ready: boolean }) {
  return <CoachMarks steps={STEPS} storeKey="sel.coach.studioHome" ready={ready} />;
}
