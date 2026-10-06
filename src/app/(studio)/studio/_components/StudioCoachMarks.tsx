"use client";

/**
 * 스튜디오 홈 첫 진입 코치마크 (와이어프레임 02 첫 진입)
 * 위치: src/app/(studio)/studio/_components/StudioCoachMarks.tsx
 *
 * 말풍선 3단계: 팀원 초대 → 이용권 → 새 갤러리(2026-10-05 손질 — 필터 · 알림은 뺌). 그리기 · 기록(`sel.coach.studioHome`)은 공통 CoachMarks.
 * 초대 작가(멤버)는 초대 버튼이 없어 2단계 — 이용권을 추가하는 것은 소유자임을 말한다.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "invite",
    eyebrow: "팀원 초대",
    title: "함께 일하는 팀원을 초대해요",
    body: "초대 링크를 보내면 가입한 뒤 바로 스튜디오에 들어와요.",
  },
  {
    key: "tickets",
    eyebrow: "이용권",
    title: "갤러리 하나에 이용권 하나",
    body: "갤러리를 만들 때마다 하나씩 써요. 남은 수가 여기 보여요.",
  },
  {
    key: "new-gallery",
    eyebrow: "새 갤러리",
    title: "촬영 건마다 갤러리 하나",
    body: "이름만 정하면 만들 수 있어요. 사진을 올리면 AI가 폴더로 나눠 줘요.",
  },
];

const MEMBER_STEPS: ReadonlyArray<CoachStep> = [
  { ...STEPS[1], body: "남은 수가 여기 보여요. 추가는 소유자가 해요." },
  { ...STEPS[2], body: "이름만 정하면 만들 수 있어요. 갤러리 하나에 이용권 하나가 들어요." },
];

export function StudioCoachMarks({ ready, owner = true }: { ready: boolean; owner?: boolean }) {
  return <CoachMarks steps={owner ? STEPS : MEMBER_STEPS} storeKey="sel.coach.studioHome" ready={ready} />;
}
