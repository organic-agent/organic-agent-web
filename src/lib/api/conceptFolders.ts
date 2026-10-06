/**
 * 컨셉 · 세부 폴더 API — 스웨거 [Category] 계약의 타입화
 * 위치: src/lib/api/conceptFolders.ts
 *
 * 폐기된 photo-clusters 대신 AI 분석 결과를 컨셉(Concept) › 세부(Detail) 폴더로 준다.
 * 깊이는 정확히 2단이고 사진은 세부 폴더 하나에만 속한다(옮기면 이동).
 *
 * 서버가 주는 세부 폴더의 photoIds는 **순서가 없고 휴지통 사진도 섞여 온다** — 화면은
 * 사진 목록에 있는 것만 남기고 displayOrder로 정렬해야 한다. 만들기 · 삭제 · 이동은
 * 본문 없이 끝나므로 다시 조회해야 화면이 맞다. 이름 바꾸기는 organic-agent-server#260(PATCH).
 * 순서 바꾸기 · 검토 해제 API는 서버에 없다.
 */

import { api } from "@/lib/api/client";

export type DetailFolderResponse = {
  id: number;
  galleryId: number;
  conceptFolderId: number;
  name: string;
  sortOrder: number;
  createdSource: "AI" | "USER";
  /** AI가 이름에 확신이 낮은 폴더. 화면은 읽지 않는다 — "검토" 배지를 없앴다(2차 QA) */
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
 * 컨셉 폴더 이름 바꾸기 — 이름만 바뀌고 사진 배정은 그대로. 앞뒤 공백은 서버가 지우고 1~100자가 아니면 400 CATEGORY_400_4.
 * 권한은 사진 이동과 같다(개인 갤러리 부부는 마무리 전까지, 초대받은 부부는 셀렉 제출 전까지).
 */
export function renameConceptFolder(galleryId: number, conceptId: number, name: string): Promise<ConceptFolderResponse> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/${conceptId}`, { method: "PATCH", body: { name } });
}

/** 세부 폴더 이름 바꾸기 — 규칙은 컨셉과 같다 */
export function renameDetailFolder(
  galleryId: number,
  conceptId: number,
  detailId: number,
  name: string,
): Promise<DetailFolderResponse> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/${conceptId}/detail-folders/${detailId}`, {
    method: "PATCH",
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

/** 합치기 결과 — mergeId는 되돌릴 때 쓰는 열쇠다 */
export type MergeDetailFolderResponse = {
  mergeId: number;
  /** 합친 뒤의 대상 세부 폴더 */
  target: DetailFolderResponse;
};

/**
 * 세부 폴더 합치기 — 원본(`detailId`)의 사진을 모두 대상 세부 폴더로 옮기고 빈 원본을 숨긴다(organic-agent-server #245 · #249).
 * 합친 사진은 사용자 배정이 되어 AI 폴더를 다시 만들어도 원래 폴더로 돌아가지 않는다.
 * 같은 컨셉 안이면 협업 하트 · 댓글이 남고, **다른 컨셉으로 합치면 원본 컨셉에 남긴 하트 · 댓글이 지워진다**.
 * 같은 폴더끼리는 400 CATEGORY_400_3. 원본은 지우지 않고 숨겨 두어 3분 안에 undoDetailFolderMerge로 되돌릴 수 있다.
 */
export function mergeDetailFolder(
  galleryId: number,
  conceptId: number,
  detailId: number,
  targetDetailFolderId: number,
): Promise<MergeDetailFolderResponse> {
  return api(
    `/api/v1/galleries/${galleryId}/concept-folders/${conceptId}/detail-folders/${detailId}/merge`,
    { method: "POST", body: { targetDetailFolderId } },
  );
}

export type UndoDetailFolderMergeResponse = {
  /** 되살아난 원본 세부 폴더 — 원래 id · 순서 · 출처, 돌아온 사진 */
  source: DetailFolderResponse;
  /** 사진이 빠진 대상 세부 폴더 */
  target: DetailFolderResponse;
};

/**
 * 합치기 되돌리기 — 숨긴 원본 폴더가 원래 id · 순서 · 출처로 돌아오고, 옮긴 사진이 옮기기 전 배정 그대로 원본으로 돌아간다.
 * 합친 뒤 3분 안에 한 번만 된다. 다른 컨셉으로 합칠 때 지워진 하트 · 댓글은 돌아오지 않는다.
 * 실패: 409 CATEGORY_409_4(이미 되돌림) · CATEGORY_409_5(3분 지남) · CATEGORY_409_6(그 사이 사진이 다시 옮겨졌거나
 * 원본의 컨셉 · 대상 폴더가 사라짐) · 404 CATEGORY_404_3(합치기 기록 없음).
 */
export function undoDetailFolderMerge(galleryId: number, mergeId: number): Promise<UndoDetailFolderMergeResponse> {
  return api(`/api/v1/galleries/${galleryId}/detail-folder-merges/${mergeId}/undo`, { method: "POST" });
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
 * 폴더 확정 — 클라이언트가 컨셉 › 세부 폴더 구조를 확정한다(POST /folders/from-clusters). **클라이언트만 · 1회.**
 * 확정 전엔 사진 선택 API가 거절되고(PHOTO_ORGANIZATION_REQUIRED), 확정하면 갤러리가 SELECTION_IN_PROGRESS가 된다.
 * 두 번째 호출은 409 GALLERY_409_2. 작가(스튜디오 멤버)는 403.
 */
export function confirmFolders(galleryId: number): Promise<ConceptFolderResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/folders/from-clusters`, { method: "POST" });
}

/**
 * AI 분석 결과로 폴더 만들기 — **수동 폴백 전용**. 정상 경로에서는 잡이 DONE으로 닫히기 전에
 * 서버가 스스로 만든다. 잡이 FAILED로 끝났는데 분류까지는 끝난 경우에만 버튼으로 부른다.
 * 실패: 409 CATEGORY_409_2(분류 결과 없음) · 409 CATEGORY_409_3(새로 넣을 사진 없음).
 */
export function materializeAiFolders(galleryId: number): Promise<ConceptFolderResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/ai`, { method: "POST" });
}
