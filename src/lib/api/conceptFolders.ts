/**
 * 컨셉 · 세부 폴더 API — 스웨거 [Category] 계약의 타입화
 * 위치: src/lib/api/conceptFolders.ts
 *
 * 폐기된 photo-clusters 대신 AI 분석 결과를 컨셉(Concept) › 세부(Detail) 폴더로 준다.
 * 깊이는 정확히 2단이고 사진은 세부 폴더 하나에만 속한다(옮기면 이동).
 *
 * 서버가 주는 세부 폴더의 photoIds는 **순서가 없고 휴지통 사진도 섞여 온다** — 화면은
 * 사진 목록에 있는 것만 남기고 displayOrder로 정렬해야 한다. 만들기 · 삭제 · 이동은
 * 본문 없이 끝나므로 다시 조회해야 화면이 맞다. 이름 바꾸기 · 순서 바꾸기 · 검토 해제
 * API는 서버에 없다(백엔드 요청 항목).
 */

import { api } from "@/lib/api/client";

export type DetailFolderResponse = {
  id: number;
  galleryId: number;
  conceptFolderId: number;
  name: string;
  sortOrder: number;
  createdSource: "AI" | "USER";
  /** 폴더 사진의 피사체 다수결(과반) — 없으면 null */
  category: "BRIDE" | "GROOM" | "COUPLE" | "GROUP" | null;
  /** AI가 이름에 확신이 낮아 작가 확인이 필요한 폴더. 서버가 지우는 방법은 없다(영구 배지) */
  needsReview: boolean;
  photoIds: number[];
};

export type ConceptFolderResponse = {
  id: number;
  galleryId: number;
  name: string;
  sortOrder: number;
  createdSource: "AI" | "USER";
  /** AI가 만든 폴더면 그 잡 id. 재분석은 새 잡 id로 컨셉 폴더를 뒤에 덧붙인다 */
  analysisJobId: number | null;
  details: DetailFolderResponse[];
};

/** 갤러리의 컨셉 › 세부 폴더 트리. 분석 전이면 빈 배열. 작가 · 클라이언트 공용 */
export function listConceptFolders(galleryId: number): Promise<ConceptFolderResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders`);
}

/** 컨셉 폴더 만들기(USER). 이름 1~100자. 세부 폴더 없이 비어서 생긴다 */
export function createConceptFolder(galleryId: number, name: string): Promise<ConceptFolderResponse> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders`, {
    method: "POST",
    body: { name },
  });
}

/** 세부 폴더 만들기(USER). 이름 1~100자. 사진 없이 비어서 생긴다 */
export function createDetailFolder(
  galleryId: number,
  conceptId: number,
  name: string,
): Promise<DetailFolderResponse> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/${conceptId}/detail-folders`, {
    method: "POST",
    body: { name },
  });
}

/**
 * 컨셉 폴더 삭제 — 세부 폴더와 배정이 함께 사라지고 **사진은 지워지지 않고 미분류가 된다**.
 */
export function deleteConceptFolder(galleryId: number, conceptId: number): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/${conceptId}`, { method: "DELETE" });
}

/** 세부 폴더 삭제 — 배정만 사라지고 사진은 미분류가 된다 */
export function deleteDetailFolder(galleryId: number, conceptId: number, detailId: number): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/${conceptId}/detail-folders/${detailId}`, {
    method: "DELETE",
  });
}

/**
 * 사진을 세부 폴더로 옮기기. `targetDetailFolderId`가 null이면 폴더에서 빼서 미분류로.
 * 전부-아니면-거부: 이 갤러리 사진이 아닌 id가 섞이면 400, 대상 폴더가 없으면 404.
 * 응답 본문이 없으므로 끝나면 폴더 트리를 다시 조회한다.
 */
export function moveCategoryPhotos(
  galleryId: number,
  photoIds: number[],
  targetDetailFolderId: number | null,
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/category-assignments/move`, {
    method: "POST",
    body: { photoIds, targetDetailFolderId },
  });
}

/**
 * AI 분석 결과로 폴더 만들기 — **수동 폴백 전용**. 정상 경로에서는 잡이 DONE으로 닫히기 전에
 * 서버가 스스로 만든다. 잡이 FAILED로 끝났는데 분류까지는 끝난 경우에만 버튼으로 부른다.
 * 실패: 409 CATEGORY_409_2(분류 결과 없음) · 409 CATEGORY_409_3(새로 넣을 사진 없음).
 */
export function materializeAiFolders(galleryId: number): Promise<ConceptFolderResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/ai`, { method: "POST" });
}
