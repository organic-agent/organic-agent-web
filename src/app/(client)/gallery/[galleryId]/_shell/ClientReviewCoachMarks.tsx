"use client";

/**
 * 클라이언트 3단계(보정 검토) 첫 결과 도착 코치마크 4
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientReviewCoachMarks.tsx
 *
 * 회차 목록 → 결과 사진(전/후) → 다시 요청 → 이대로 확정. 대상은 data-coach 속성이고 없는 대상(사이드바 닫힘)은 건너뛴다.
 * 그리기 · 기록(`sel.coach.clientReview`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "rounds",
    eyebrow: "회차",
    title: "회차별로 결과를 봐요",
    body: "왼쪽 회차 목록에서 지난 회차와 남은 횟수를 볼 수 있어요. 회차를 누르면 그때 결과로 돌아와요.",
  },
  {
    key: "results",
    eyebrow: "결과 사진",
    title: "타일이 보정 결과예요",
    body: "돋보기나 더블클릭으로 크게 열면 전/후를 슬라이더로 비교하고, \"내 요청\" 탭에서 보냈던 요청을 다시 볼 수 있어요.",
  },
  {
    key: "rerequest",
    eyebrow: "다시 요청",
    title: "더 고칠 곳이 있으면 다시 요청",
    body: "고칠 사진을 체크하고 결과 사진 위에 점을 찍어 적으면 다음 회차로 보내져요. 남은 횟수만큼 할 수 있어요.",
  },
  {
    key: "confirm",
    eyebrow: "확정",
    title: "다 확인했으면 이대로 확정",
    body: "확정하면 갤러리가 보관되고 더 요청할 수 없어요. 보정본은 언제든 내려받을 수 있어요.",
  },
];

export function ClientReviewCoachMarks({ ready }: { ready: boolean }) {
  return <CoachMarks steps={STEPS} storeKey="sel.coach.clientReview" ready={ready} />;
}
