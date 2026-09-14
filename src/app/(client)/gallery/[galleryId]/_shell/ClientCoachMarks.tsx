"use client";

/**
 * 클라이언트 컨셉 분류 첫 진입 코치마크 5 (2026-09-11 순서)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientCoachMarks.tsx
 *
 * 컨셉 폴더 → 사진 옮기기 → "검토" 배지 → 미분류 → 폴더 확정. 대상은 data-coach 속성.
 * 그리기 · 기록(`sel.coach.clientSort`)은 공통 CoachMarks. 검토 배지가 없는 갤러리는 그 단계를 건너뛴다.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

const STEPS: ReadonlyArray<CoachStep> = [
  {
    key: "folders",
    eyebrow: "컨셉 폴더",
    title: "AI가 나눠 둔 폴더",
    body: "사진을 컨셉 › 세부 폴더로 나눠 뒀어요. 폴더를 누르면 그 사진만 보여요.",
  },
  {
    key: "photos",
    eyebrow: "사진 옮기기",
    title: "사진을 골라 다른 폴더로",
    body: "사진을 끌어 왼쪽 폴더에 놓으면 옮겨져요. 여러 장은 Shift + 클릭이나 아래 \"폴더로 이동\"으로.",
  },
  {
    key: "review",
    eyebrow: "검토",
    title: "AI가 확신이 낮은 폴더",
    body: "이 배지가 붙은 폴더는 한 번 살펴봐 주세요. 확인했으면 폴더 메뉴에서 \"검토 완료\".",
    round: true,
  },
  {
    key: "unsorted",
    eyebrow: "미분류",
    title: "어느 폴더에도 없는 사진",
    body: "그대로 두어도 사진을 고를 수 있어요. 넣고 싶은 폴더가 있으면 옮겨 주세요.",
  },
  {
    key: "confirm",
    eyebrow: "폴더 확정",
    title: "정리가 끝나면 확정",
    body: "확정은 한 번만 할 수 있고, 그 뒤 사진 셀렉이 열려요.",
  },
];

export function ClientCoachMarks({ ready }: { ready: boolean }) {
  return <CoachMarks steps={STEPS} storeKey="sel.coach.clientSort" ready={ready} />;
}
