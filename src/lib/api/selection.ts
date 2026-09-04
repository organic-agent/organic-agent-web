/**
 * 사진 셀렉 API — 스웨거 [Selection] 계약의 타입화
 * 위치: src/lib/api/selection.ts
 *
 * 담기는 초대받은 부부만(작가는 조회만). 중복이 하나라도 섞이거나 계약
 * 장수를 넘기면 **한 장도 담기지 않고 통째로 거절**된다 — 겹침(409)은
 * 신랑·신부가 동시에 고르다 생긴 "화면이 낡았다"는 신호라 재조회로 푼다.
 * 제출(submit) 뒤에는 담기·빼기가 잠기고, 되돌리기(withdraw)는 담당
 * 작가만 할 수 있다.
 */

import { api } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";

export type SelectedPhotoResponse = {
  itemId: number;
  galleryId: number;
  addedByUserId: number | null;
  sortOrder: number;
  /** 담은 컷의 원본 사진 — 보정본으로 담았어도 원본 정보가 실린다 */
  photo: PhotoResponse;
  /** 보정본으로 담았으면 그 보정 항목 id, 원본이면 null */
  retouchPhotoId: number | null;
  /** 보정본의 서명 URL — 원본으로 담은 항목은 null(그때는 photo.viewUrl로 그린다) */
  resultUrl: string | null;
};

export type PhotoSelectionResponse = {
  /** 고르는 중이면 SELECTING, 작가에게 넘어갔으면 SUBMITTED */
  status: "SELECTING" | "SUBMITTED";
  maxSelectablePhotoCount: number | null;
  selectedCount: number;
  /** 더 고를 수 있는 장수 — 제한 없으면 null, 계약 축소로 이미 넘겼으면 0 */
  remainingCount: number | null;
  submittedAt: string | null;
  submittedByUserId: number | null;
  /** 고른 항목 — 갤러리 노출 순서 */
  photos: SelectedPhotoResponse[];
  /** 서명 URL 남은 수명(초) */
  viewUrlTtlSeconds: number;
};

/** 셀렉 조회 — 갤러리를 볼 수 있는 누구나(작가는 마감 뒤에도). */
export function getPhotoSelection(
  galleryId: number,
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection`);
}

/**
 * 사진 담기 — 부부만. 실패: 409(이미 담긴 사진 섞임) ·
 * 400(계약 장수 초과·빈 목록·PENDING 사진) — 모두 통째 거절.
 */
export function selectPhotos(
  galleryId: number,
  photoIds: number[],
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/photos`, {
    method: "POST",
    body: { photoIds, retouchPhotos: [] },
  });
}

/** 여러 장 빼기 — 셀렉에 없는 id가 섞여도 나머지는 빠진다. */
export function deselectPhotos(
  galleryId: number,
  photoIds: number[],
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/photos`, {
    method: "DELETE",
    body: { photoIds },
  });
}

/** 한 장 빼기 — 셀렉에 없으면 404(조용히 넘어가지 않는다). */
export function deselectPhoto(
  galleryId: number,
  photoId: number,
): Promise<void> {
  return api(
    `/api/v1/galleries/${galleryId}/photo-selection/photos/${photoId}`,
    { method: "DELETE" },
  );
}

/** 제출 — 부부만. 이후 담기·빼기가 잠긴다. 한 장도 없으면 400. */
export function submitSelection(
  galleryId: number,
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/submit`, {
    method: "POST",
  });
}

/** 제출 취소(선택 다시 열기) — 담당 작가만. 부부가 다시 고를 수 있게 된다. */
export function withdrawSelection(
  galleryId: number,
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/withdraw`, {
    method: "POST",
  });
}
