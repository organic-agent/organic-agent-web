/**
 * 컨셉 · 세부 폴더 API — 스웨거 [Category] 계약의 타입화
 * 위치: src/lib/api/conceptFolders.ts
 *
 * 폐기된 photo-clusters 대신 AI 분석 결과를 컨셉(Concept) › 세부(Detail) 폴더로 준다.
 * 읽기는 B1(화면 구성)에서, 만들기 · 이름 바꾸기 · 삭제 · 사진 이동은 B2(업로드 · AI)에서 붙인다.
 */

import { api } from "@/lib/api/client";

export type DetailFolderResponse = {
  id: number;
  galleryId: number;
  conceptFolderId: number;
  name: string;
  sortOrder: number;
  createdSource: "AI" | "USER";
  category: "BRIDE" | "GROOM" | "COUPLE" | "GROUP" | null;
  /** AI가 확신이 낮아 작가 확인이 필요한 폴더 */
  needsReview: boolean;
  photoIds: number[];
};

export type ConceptFolderResponse = {
  id: number;
  galleryId: number;
  name: string;
  sortOrder: number;
  createdSource: "AI" | "USER";
  analysisJobId: number | null;
  details: DetailFolderResponse[];
};

/** 갤러리의 컨셉 › 세부 폴더 트리. 분석 전이면 빈 배열 */
export function listConceptFolders(galleryId: number): Promise<ConceptFolderResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders`);
}
