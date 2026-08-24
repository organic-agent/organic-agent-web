/**
 * 사진 별점 API — 스웨거 [Rating] 계약의 타입화
 * 위치: src/lib/api/ratings.ts
 *
 * 점수는 사진당 하나이고 누가 매겼는지로 나뉘지 않는다 — 신랑·신부·작가가
 * 같은 한 칸을 나눠 쓰고, 마지막에 매긴 사람이 ratedBy에 남는다. 부부는
 * 갤러리가 열려 있고 선택 마감 기한 안일 때만 매길 수 있다(작가는 제약 없음).
 * 매긴 점수는 사진 목록·클러스터·폴더 응답의 score로 함께 온다.
 */

import { api } from "@/lib/api/client";

export type PhotoRatingResponse = {
  photoId: number;
  /** 1~5점 */
  score: number;
  /** 마지막으로 점수를 매긴 사용자 id — 작가일 수도 부부일 수도 있다 */
  ratedBy: number;
  updatedAt: string | null;
};

/**
 * 별점 매기기 — 같은 사진에 다시 보내면 덮어쓴다(그래서 PUT).
 * 실패: 400(1~5 밖) · 403(부부인데 마감/미공개) · 404(이 갤러리의 사진 아님).
 */
export function ratePhoto(
  galleryId: number,
  photoId: number,
  score: number,
): Promise<PhotoRatingResponse> {
  return api(`/api/v1/galleries/${galleryId}/photos/${photoId}/rating`, {
    method: "PUT",
    body: { score },
  });
}

/** 별점 지우기 — 매긴 적 없어도 204(멱등). 이 갤러리의 사진이 아니면 404. */
export function clearPhotoRating(
  galleryId: number,
  photoId: number,
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/photos/${photoId}/rating`, {
    method: "DELETE",
  });
}
