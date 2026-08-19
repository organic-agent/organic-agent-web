/**
 * 갤러리 API — 스웨거 [Gallery]·[Selection] 계약의 타입화
 * 위치: src/lib/api/galleries.ts
 */

import { api } from "@/lib/api/client";

export type GalleryResponse = {
  id: number;
  studioId: number;
  title: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  /** 사진 선택 마감 기한. null이면 기한 없이 열려 있다. */
  selectionDeadline: string | null;
  /** 부부가 최종적으로 고를 사진 장수. null이면 제한이 없다. */
  maxSelectablePhotoCount: number | null;
  /** 계약한 보정 요청 횟수. null이면 제한이 없다. */
  maxRetouchRoundCount: number | null;
  createdAt: string | null;
};

export type CreateGalleryRequest = {
  title: string;
  selectionDeadline?: string | null;
  maxSelectablePhotoCount?: number | null;
};

/** 선택 앨범 요약 — photos 목록도 오지만 목록 화면은 집계만 쓴다. */
export type PhotoSelectionResponse = {
  status: "SELECTING" | "SUBMITTED";
  maxSelectablePhotoCount: number | null;
  /** 지금까지 고른 장수. */
  selectedCount: number;
  remainingCount: number | null;
  submittedAt: string | null;
  photos: unknown[];
};

/**
 * 폼의 날짜(YYYY-MM-DD)를 그날이 다 가기 전까지의 마감 일시(KST)로 바꾼다.
 * 생성·재오픈 등 selectionDeadline을 받는 모든 요청이 같은 규칙을 쓴다.
 */
export function toSelectionDeadline(date: string): string {
  return `${date}T23:59:59+09:00`;
}

/**
 * 내 갤러리 목록. 작가는 스튜디오의 갤러리 전부를 받는다.
 * 필터·페이징 없이 전체가 오고, 열람·선택 수치는 포함되지 않는다.
 */
export function listGalleries(): Promise<GalleryResponse[]> {
  return api("/api/v1/galleries");
}

/**
 * 갤러리 생성. 만들어진 갤러리는 DRAFT라 열기 전까지 부부에게 보이지 않는다.
 *
 * 실패 코드: 400(이미 지난 마감 기한) · STUDIO_404_1(스튜디오 없음 — 온보딩 미완료).
 */
export function createGallery(
  request: CreateGalleryRequest,
): Promise<GalleryResponse> {
  return api("/api/v1/galleries", { method: "POST", body: request });
}

/**
 * 갤러리 단건 조회. 담당 작가이거나 초대를 수락한 멤버여야 한다.
 *
 * 실패 코드: 403(권한 없음·멤버가 DRAFT 조회) · 404(없는 갤러리).
 */
export function getGallery(galleryId: number): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}`);
}

/**
 * 갤러리 열기 — DRAFT→OPEN. 열어야 초대된 부부에게 보인다.
 * 담당 작가만(403). DRAFT가 아니면 400.
 */
export function openGallery(galleryId: number): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/open`, { method: "POST" });
}

/**
 * 갤러리 선택 마감 — OPEN→CLOSED. 부부는 계속 볼 수 있고 고르는 것만
 * 막힌다. 담당 작가만(403). OPEN이 아니면 400.
 */
export function closeGallery(galleryId: number): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/close`, { method: "POST" });
}

/**
 * 갤러리 재오픈 — CLOSED→OPEN. 지난 기한을 그대로 두면 열자마자 다시
 * 막히므로 마감 기한을 다시 받는다(null이면 기한 없음). 담당 작가만(403).
 * CLOSED가 아니거나 지난 기한이면 400.
 */
export function reopenGallery(
  galleryId: number,
  selectionDeadline: string | null,
): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/reopen`, {
    method: "POST",
    body: { selectionDeadline },
  });
}

/**
 * 갤러리 휴지통 이동 — 즉시 삭제가 아니다. 휴지통에서 복원할 수 있고,
 * 보관 기간이 지나면 원본과 함께 자동으로 물리 삭제된다. 담당 작가만(403).
 */
export function moveGalleryToTrash(galleryId: number): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}`, { method: "DELETE" });
}

/**
 * 선택 앨범 조회 — 목록 카드의 셀렉 현황 임시 집계용.
 * 목록 통계 API(WES-215)가 배포되면 이 호출은 목록 화면에서 빠진다.
 */
export function getPhotoSelection(
  galleryId: number,
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection`);
}

/**
 * 계약 장수 변경. null을 보내면 제한이 없어지고, 이미 고른 장수보다
 * 작은 값도 받는다(계약 축소는 실제로 있는 일). 담당 작가만(403).
 */
export function patchMaxSelectablePhotoCount(
  galleryId: number,
  maxSelectablePhotoCount: number | null,
): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/max-selectable-photo-count`, {
    method: "PATCH",
    body: { maxSelectablePhotoCount },
  });
}

export type GalleryMemberResponse = {
  /** 내보낼 때 쓰는 id — 사용자 id가 아니다. */
  memberId: number;
  userId: number;
  nickname: string;
  email: string | null;
  /** 초대를 수락한 시각. */
  joinedAt: string | null;
};

/**
 * 갤러리 멤버 목록. 담당 작가와 부부 모두 조회 가능, 정원 2명이라
 * 최대 두 건. 마감 뒤에도 열린다.
 */
export function listGalleryMembers(
  galleryId: number,
): Promise<GalleryMemberResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/members`);
}

/**
 * Mock 갤러리 생성 — 운영자가 시드한 샘플 템플릿의 사진(임베딩·미리보기
 * 포함)을 복제해 일반 갤러리 하나를 만든다. 온보딩 직후 체험용.
 *
 * 본문 없이 부르면 제목 '샘플 갤러리', 기한·장수 제한 없음으로 만든다.
 * 부를 때마다 새 갤러리가 생기므로(멱등 아님) 중복 호출 방지는 화면 책임이다.
 *
 * 실패: 400(빈 제목·지난 기한·0 이하 장수) · STUDIO_404_1(스튜디오 없음) ·
 * 502(템플릿 복사 실패 — 잔해가 남지 않아 재요청 안전) · 503(샘플 미준비).
 */
export function createMockGallery(
  request?: CreateGalleryRequest,
): Promise<GalleryResponse> {
  return api("/api/v1/galleries/mock", { method: "POST", body: request });
}
