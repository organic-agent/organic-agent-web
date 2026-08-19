/**
 * 갤러리 API — 스웨거 [Gallery] 계약의 타입화
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
