/**
 * 갤러리 단계(스튜디오 관점) — 5단계 이름과 서버 stage 매핑
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/stages.ts
 *
 * 1 사진 업로드 → 2 셀렉 대기 → 3 보정 작업 → 4 앨범 구성 → 5 작업 완료 (2026-09-11 A안).
 * 서버 6단계 중 SELECTION_IN_PROGRESS · SELECTION_COMPLETED는 둘 다 "셀렉 대기"로 접는다 —
 * 작가에게 셀렉 완료 확인은 보정 작업의 첫 할 일이라서. 단계 안의 하위 상태는 사이드바 상태줄이 맡는다.
 * 앨범 작업 여부 필드가 아직 없어 지금은 5칸 고정(앨범 미선택 시 4칸은 백엔드 뒤).
 */

import type { GalleryResponse, GalleryStage } from "@/lib/api/galleries";

export const SHELL_STAGES = [
  "사진 업로드",
  "셀렉 대기",
  "보정 작업",
  "앨범 구성",
  "작업 완료",
] as const;

const INDEX_OF: Record<GalleryStage, number> = {
  UPLOAD: 0,
  SELECTION_IN_PROGRESS: 1,
  SELECTION_COMPLETED: 1,
  RETOUCH: 2,
  DELIVERY: 3,
  ARCHIVED: 4,
};

/** 서버 stage → 0부터 시작하는 단계 번호 */
export function stageIndexOf(gallery: Pick<GalleryResponse, "stage">): number {
  return INDEX_OF[gallery.stage] ?? 0;
}

export const stageLabelOf = (gallery: Pick<GalleryResponse, "stage">) =>
  SHELL_STAGES[stageIndexOf(gallery)];
