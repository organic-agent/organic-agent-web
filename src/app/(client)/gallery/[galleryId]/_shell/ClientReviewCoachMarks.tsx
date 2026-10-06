"use client";

/**
 * 클라이언트 3단계(보정 검토) 첫 결과 도착 코치마크 4 (2026-10-05 손질)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientReviewCoachMarks.tsx
 *
 * 결과 사진(전/후) → 보정본 내려받기 → 다시 요청 → 이대로 확정. 대상은 data-coach 속성.
 * 그리기 · 기록(`sel.coach.clientReview`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "results",
    eyebrow: "결과 사진",
    title: "타일이 보정 결과예요",
    body: "사진을 누르면 크게 열려요. 원본 · 보정본 · 슬라이더 · 분할로 비교하고, \"정보\" 탭에서 보냈던 요청을 다시 볼 수 있어요.",
  },
  {
    key: "download",
    eyebrow: "내려받기",
    title: "보정본을 한꺼번에 받아요",
    body: "이번 회차의 보정본을 ZIP 한 파일로 받아요. 확정한 뒤에도 받을 수 있어요.",
  },
  {
    key: "rerequest",
    eyebrow: "다시 요청",
    title: "더 고칠 곳이 있으면 다시 요청",
    body: "크게 보기의 \"보정 요청\" 탭에서 보정본 위에 점을 찍어 적은 사진이 다음 회차로 보내져요. 남은 횟수만큼 할 수 있어요.",
  },
  {
    key: "confirm",
    eyebrow: "확정",
    title: "다 확인했으면 이대로 확정",
    body: "확정하면 갤러리가 보관되고 더 요청할 수 없어요.",
  },
];

export function ClientReviewCoachMarks({ ready }: { ready: boolean }) {
  return <CoachMarks steps={STEPS} storeKey="sel.coach.clientReview" ready={ready} />;
}
