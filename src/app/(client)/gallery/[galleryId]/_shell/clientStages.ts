/**
 * 갤러리 단계(클라이언트 관점) — 단계 이름과 서버 상태 매핑
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/clientStages.ts
 *
 * 1 컨셉 분류 → 2 셀렉 & 보정 요청 → 3 보정 검토 → (4 앨범 구성) → 완료 (2026-09-12 확정).
 * 앨범을 만드는 갤러리만 "앨범 구성" 칸이 있다 — 서버 응답에 그 값이 아직 없어(⑥ 갭 9) 지금은 늘 4칸이다.
 * 보정 요청은 2단계 안(싱글뷰 점 찍기)에서 하고 셀렉 제출에 실려 간다. 2↔3 반복(보정 횟수만큼)은
 * 3단계 안 상태줄이 말한다. 갤러리가 아직 열리지 않았으면(DRAFT) 단계 밖 "준비 중"(대기).
 * 컨셉 분류인지 셀렉인지는 서버 stage가 아니라 **폴더 확정 여부**(photoOrganizationRequired ·
 * foldersSavedAt)로 가른다 — 확정 전엔 선택 API가 거절된다.
 *
 * 개인 결제 클라이언트(personal, 2026-09-14): 1 업로드 → 2 컨셉 분류 → 3 셀렉 & 보정 요청 → 4 보정 확인 → 완료.
 * 만들자마자 OPEN이고 서버 stage는 UPLOAD → (요청서 내보내기) RETOUCH → (종료) ARCHIVED만 바뀐다. 업로드인지
 * 컨셉 분류인지는 사진 수(0장이면 업로드)로, 컨셉 분류인지 셀렉인지는 폴더 확정으로 가른다.
 */

import type { GalleryResponse } from "@/lib/api/galleries";

const STAGES_WITH_ALBUM = ["컨셉 분류", "셀렉 & 보정 요청", "보정 검토", "앨범 구성", "완료"] as const;
const STAGES_NO_ALBUM = ["컨셉 분류", "셀렉 & 보정 요청", "보정 검토", "완료"] as const;
const STAGES_PERSONAL = ["업로드", "컨셉 분류", "셀렉 & 보정 요청", "보정 확인", "완료"] as const;

export type ClientPhase =
  /** 작가가 아직 갤러리를 열지 않음(DRAFT) */
  | "wait"
  /** 개인 — 사진이 아직 한 장도 없음(올리기 전) */
  | "upload"
  /** 1 컨셉 분류 — 폴더 확정 전 */
  | "sort"
  /** 2 셀렉 & 보정 요청 — 고르는 중 */
  | "select"
  /** 2 → 3 사이 — 전달했고 작가가 확인 중(SELECTION_COMPLETED) */
  | "submitted"
  /** 3 보정 검토 — 작가가 보정 중이거나 결과가 도착함(RETOUCH · DELIVERY) */
  | "review"
  /** 4 앨범 구성 — 앨범 갤러리만 */
  | "album"
  /** 완료(ARCHIVED) */
  | "done";

/** 앨범을 만드는 갤러리인지 — 서버 필드가 생기면 여기만 바꾼다 */
export function hasAlbum(gallery: GalleryResponse): boolean {
  void gallery; // 서버가 앨범 여부를 주면 이 값으로 가른다
  return false;
}

/** 이 갤러리의 단계 이름 목록(앨범 여부에 따라 4칸 · 5칸, 개인은 5칸) */
export function clientStagesOf(gallery: GalleryResponse | null, personal = false): readonly string[] {
  if (personal) return STAGES_PERSONAL;
  return gallery && hasAlbum(gallery) ? STAGES_WITH_ALBUM : STAGES_NO_ALBUM;
}

/** 개인 갤러리의 단계 — photoCount는 PENDING(올리는 중) 포함, null이면 아직 못 읽음(컨셉 분류 자리) */
export function personalPhaseOf(gallery: GalleryResponse, photoCount: number | null): ClientPhase {
  switch (gallery.stage) {
    case "ARCHIVED":
      return "done";
    case "RETOUCH":
    case "DELIVERY":
      return "review";
    default: {
      if (photoCount === 0) return "upload";
      return gallery.foldersSavedAt === null ? "sort" : "select";
    }
  }
}

export function clientPhaseOf(gallery: GalleryResponse): ClientPhase {
  if (gallery.status === "DRAFT") return "wait";
  switch (gallery.stage) {
    case "ARCHIVED":
      return "done";
    case "DELIVERY":
      // 전달 단계와 앨범 단계의 대응은 백엔드 확인 항목 — 지금은 앨범 갤러리면 앨범, 아니면 보정 검토로 본다
      return hasAlbum(gallery) ? "album" : "review";
    case "RETOUCH":
      return "review";
    case "SELECTION_COMPLETED":
      return "submitted";
    default: {
      const needsFolders = gallery.photoOrganizationRequired && gallery.foldersSavedAt === null;
      return needsFolders ? "sort" : "select";
    }
  }
}

/** 0부터 시작하는 단계 번호 — 대기(wait)는 0(컨셉 분류 자리), 전달함은 보정 검토 칸, 완료는 마지막 */
export function clientStageIndexOf(phase: ClientPhase, gallery: GalleryResponse | null, personal = false): number {
  const stages = clientStagesOf(gallery, personal);
  if (personal) {
    switch (phase) {
      case "wait":
      case "upload":
        return 0;
      case "sort":
        return 1;
      case "select":
        return 2;
      case "submitted":
      case "review":
      case "album":
        return 3;
      case "done":
        return 4;
    }
  }
  switch (phase) {
    case "wait":
    case "upload":
    case "sort":
      return 0;
    case "select":
      return 1;
    case "submitted":
    case "review":
      return 2;
    case "album":
      return stages.length === 5 ? 3 : 2;
    case "done":
      return stages.length - 1;
  }
}

/** 상단 칩 · 사이드바 상태줄에 쓰는 단계 이름 */
export function clientStageLabelOf(phase: ClientPhase, gallery: GalleryResponse | null, personal = false): string {
  if (phase === "wait") return "준비 중";
  return clientStagesOf(gallery, personal)[clientStageIndexOf(phase, gallery, personal)];
}
