/**
 * 갤러리 단계(스튜디오 관점) — 5단계 이름과 서버 stage 매핑
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/stages.ts
 *
 * 1 사진 업로드 → 2 셀렉 대기 → 3 보정 작업 → 4 앨범 구성 → 5 작업 완료 (2026-09-11 A안).
 * 클라이언트가 전달하면(SELECTION_COMPLETED) 그 순간 1차 보정 회차가 만들어지므로 작가에겐 곧 "보정 작업"이다
 * (2026-09-12 — "선택 확인" 전용 API 없음, 결과 업로드 URL 발급 때 서버 stage가 RETOUCH로 바뀐다).
 * 단계 안의 하위 상태는 사이드바 상태줄이 맡는다.
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
  SELECTION_COMPLETED: 2,
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
