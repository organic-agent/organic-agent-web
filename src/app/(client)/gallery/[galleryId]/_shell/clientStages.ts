/**
 * 갤러리 단계(클라이언트 관점) — 4단계 이름과 서버 상태 매핑
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/clientStages.ts
 *
 * 1 컨셉 분류 → 2 사진 셀렉 → 3 보정 요청 → 4 보정 검토 (2026-09-11). 작가 5단계와 대응:
 * 작가 "셀렉 대기" ↔ 클라이언트 컨셉 분류 · 사진 셀렉, 작가 "보정 작업" ↔ 보정 요청 · 검토.
 * 갤러리가 아직 열리지 않았으면(DRAFT) 단계 밖 "준비 중"(대기). 컨셉 분류인지 사진 셀렉인지는
 * 서버 stage가 아니라 **폴더 확정 여부**(photoOrganizationRequired · foldersSavedAt)로 가른다 —
 * 확정 전엔 선택 API가 거절된다.
 */

import type { GalleryResponse } from "@/lib/api/galleries";

export const CLIENT_STAGES = ["컨셉 분류", "사진 셀렉", "보정 요청", "보정 검토"] as const;

export type ClientPhase = "wait" | "sort" | "select" | "retouch" | "review" | "done";

export function clientPhaseOf(gallery: GalleryResponse): ClientPhase {
  if (gallery.status === "DRAFT") return "wait";
  if (gallery.stage === "ARCHIVED") return "done";
  if (gallery.stage === "RETOUCH" || gallery.stage === "DELIVERY") {
    // 작가가 결과를 보내 검토할 게 있는지는 보정 API가 말한다 — 지금은 요청 단계로 본다(WES-313에서 갈라짐)
    return "retouch";
  }
  const needsFolders = gallery.photoOrganizationRequired && gallery.foldersSavedAt === null;
  return needsFolders ? "sort" : "select";
}

/** 0부터 시작하는 단계 번호 — 대기(wait)는 0(컨셉 분류 자리), 완료는 마지막 */
export function clientStageIndexOf(phase: ClientPhase): number {
  switch (phase) {
    case "wait":
    case "sort":
      return 0;
    case "select":
      return 1;
    case "retouch":
      return 2;
    case "review":
      return 3;
    case "done":
      return 3;
  }
}

export function clientStageLabelOf(phase: ClientPhase): string {
  if (phase === "wait") return "준비 중";
  if (phase === "done") return "작업 완료";
  return CLIENT_STAGES[clientStageIndexOf(phase)];
}
