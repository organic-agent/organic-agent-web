/**
 * 사진 별점 API — 스웨거 [Photo Rating] 계약의 타입화
 * 위치: src/lib/api/ratings.ts
 *
 * 점수는 사진당 하나이고 누가 매겼는지로 나뉘지 않는다 — 부부 두 사람이
 * 같은 한 칸을 나눠 쓰고, 마지막에 매긴 사람이 ratedBy에 남는다. 부부는
 * 갤러리가 열려 있고 선택 마감 기한 안일 때만 매길 수 있다.
 * 매긴 점수는 사진 목록·클러스터·폴더 응답의 score · ratedBy · ratedAt으로 함께 온다.
 * 전체 목록(listGalleryRatings)은 함께 고르기(이슈 148)가 상대 변경을 맞출 때 쓴다 — 서버 #351.
 * 사진별 기록(listPhotoRatingHistory)은 별점이 실제로 바뀐 커밋마다 한 줄씩 쌓인 이력이다 — 서버 #374.
 */

import { api } from "@/lib/api/client";

export type PhotoRatingResponse = {
  photoId: number;
  /** 1~5점 */
  score: number;
  /** 마지막으로 점수를 매긴 참여자 id */
  ratedBy: number;
  /** 마지막 별점 수정 시각 */
  updatedAt: string | null;
};

/**
 * 갤러리 별점 전체 목록 — 별점 있는 사진만 photoId 순. 부부 참여자만(작가 · 게스트 403).
 * 처음 들어올 때와 변경 번호(ratingRevision)가 바뀌었을 때 이 목록으로 별점 상태 전체를 교체한다 —
 * 응답에 없는 사진은 별점이 없는 상태이므로 점수 · 매긴 사람 · 시각을 지운다.
 */
export function listGalleryRatings(galleryId: number): Promise<PhotoRatingResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/photo-ratings`);
}

/** 사진 별점이 바뀐 기록 한 줄 */
export type PhotoRatingHistoryResponse = {
  /** 기록 id — 클수록 나중 기록 */
  id: number;
  /** 1~5점. null이면 이때 별점을 지웠다 */
  score: number | null;
  /** 매기거나 지운 참여자 id — 멤버 목록의 userId와 맞춰 이름 · 색을 칠한다 */
  ratedBy: number;
  /** 바뀐 시각 */
  ratedAt: string;
};

/**
 * 사진 한 장의 별점 기록 — 최신순 최대 50건. 점수나 매긴 사람이 실제로 바뀔 때만 한 줄 생기므로
 * 변경 번호(ratingRevision)가 바뀔 때만 다시 읽으면 된다. 부부만(작가 · 외부인 403), 휴지통 사진 404.
 * 이 기능(서버 PR 384) 전에 매긴 별점은 기록이 없다.
 */
export function listPhotoRatingHistory(galleryId: number, photoId: number): Promise<PhotoRatingHistoryResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/photos/${photoId}/rating-history`);
}

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
