/**
 * 갤러리 단계(스튜디오 관점) — 5단계 이름과 서버 stage 매핑
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/stages.ts
 *
 * 1 사진 업로드 → 2 셀렉 대기 → 3 보정 작업 → 4 앨범 구성 → 5 작업 완료 (2026-09-11 A안).
 * 클라이언트가 전달하면(SELECTION_COMPLETED) 그 순간 1차 보정 회차가 만들어지므로 작가에겐 곧 "보정 작업"이다
 * (2026-09-12 — "선택 확인" 전용 API 없음, 결과 업로드 URL 발급 때 서버 stage가 RETOUCH로 바뀐다).
 * 단계 안의 하위 상태는 사이드바 상태줄이 맡는다.
 * DELIVERY는 "보정본을 보내고 클라이언트가 확인 중"이라 보정 작업 칸이다(이슈 168 — 전에는 앨범 구성 칸에 켜졌다).
 * 앨범 구성 칸은 앨범 편집기로 앨범을 만든 갤러리가 보정을 마친(ARCHIVED) 뒤에만 켠다. 앨범 작업 여부 필드가
 * 서버에 생기면(이슈 168 PR ④) 그 값으로 바꾸고, 앨범 없는 갤러리는 4칸으로 줄인다.
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
  DELIVERY: 2,
  ARCHIVED: 4,
};

/**
 * 서버 stage → 0부터 시작하는 단계 번호.
 * albumInProgress — 앨범 편집기(이슈 168)로 만든 앨범이 아직 확정 전이면 보관(ARCHIVED) 뒤에도 "앨범 구성" 칸
 */
export function stageIndexOf(gallery: Pick<GalleryResponse, "stage">, opts?: { albumInProgress?: boolean }): number {
  if (gallery.stage === "ARCHIVED" && opts?.albumInProgress) return 3;
  return INDEX_OF[gallery.stage] ?? 0;
}

export const stageLabelOf = (gallery: Pick<GalleryResponse, "stage">) =>
  SHELL_STAGES[stageIndexOf(gallery)];
