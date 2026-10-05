"use client";

/**
 * 작가의 갤러리 화면 코치마크 4묶음 (2026-10-05)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/StudioGalleryCoachMarks.tsx
 *
 * 화면이 그 상태가 됐을 때 계정마다 한 번씩 뜬다. 대상은 data-coach 속성.
 *  - empty   빈 갤러리: 사진 업로드 → 클라이언트 초대
 *  - folders 폴더가 생긴 뒤: 사이드바 → 컨셉 폴더 → 사진 옮기기 → 갤러리 열기
 *  - wait    클라이언트가 고르는 동안: 진행 상태 → 선택한 사진
 *  - retouch 선택을 전달받은 뒤: 내려받기 → 결과 올리기
 * 그리기 · 기록(`sel.coach.studio…`)은 공통 CoachMarks.
 */

import { CoachMarks, type CoachStep } from "@/components/app/CoachMarks";

export type StudioCoachScene = "empty" | "folders" | "wait" | "retouch";

const SETS: Record<StudioCoachScene, { storeKey: string; steps: ReadonlyArray<CoachStep> }> = {
  empty: {
    storeKey: "sel.coach.studioUpload",
    steps: [
      {
        key: "upload",
        eyebrow: "사진 업로드",
        title: "촬영한 사진을 올려요",
        body: "올리면 AI가 컨셉 › 세부 폴더로 나눠 줘요. 업로드 중에는 다른 화면으로 이동이 불가능해요.",
      },
      {
        key: "invite",
        eyebrow: "클라이언트 초대",
        title: "클라이언트를 초대해요",
        body: "초대 링크 하나로 두 사람까지 들어와요. 사진은 갤러리를 연 뒤에 보여요.",
      },
    ],
  },
  folders: {
    storeKey: "sel.coach.studioFolders",
    steps: [
      {
        key: "sidebar",
        eyebrow: "사이드바",
        title: "사이드바는 여기서 열어요",
        body: "갤러리 이름과 진행 상태가 들어 있어요. 선택한 사진 · 보정 사진도 여기서 골라 봐요.",
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
        key: "open",
        eyebrow: "갤러리 열기",
        title: "정리가 끝나면 갤러리를 열어요",
        body: "열면 클라이언트가 들어와 사진을 볼 수 있어요.",
      },
    ],
  },
  wait: {
    storeKey: "sel.coach.studioWait",
    steps: [
      {
        key: "status",
        eyebrow: "진행 상태",
        title: "클라이언트가 고르는 중",
        body: "몇 장 골랐는지와 마감까지 남은 날이 여기 보여요.",
      },
      {
        key: "picked",
        eyebrow: "선택한 사진",
        title: "선택된 사진만 모아 보기",
        body: "클라이언트가 지금까지 선택한 사진만 보여요.",
      },
    ],
  },
  retouch: {
    storeKey: "sel.coach.studioRetouch",
    steps: [
      {
        key: "download",
        eyebrow: "내려받기",
        title: "요청서와 사진을 받아요",
        body: "요청서만(PDF) 받거나, 확인용 사진과 함께(ZIP) 받을 수 있어요.",
      },
      {
        key: "result-upload",
        eyebrow: "결과 올리기",
        title: "보정한 사진을 올려요",
        body: "파일 이름이 원본과 같으면 알아서 짝을 맞춰요.",
      },
    ],
  },
};

/** scene이 null이면 아무것도 띄우지 않는다. 묶음이 바뀌면 처음 단계부터 다시 시작한다(key) */
export function StudioGalleryCoachMarks({ scene, onStart }: { scene: StudioCoachScene | null; onStart?: () => void }) {
  if (scene === null) return null;
  const set = SETS[scene];
  return <CoachMarks key={scene} steps={set.steps} storeKey={set.storeKey} ready onStart={onStart} />;
}
