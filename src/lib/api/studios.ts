/**
 * 스튜디오 API — 스웨거 [Studio] 계약의 타입화
 * 위치: src/lib/api/studios.ts
 */

import { api } from "@/lib/api/client";

export type StudioResponse = {
  id: number;
  name: string;
  /** trim + 소문자 정규화를 거친 canonical 공개 주소. */
  galleryUrl: string;
  /** 유입 경로. 마케팅 집계용이라 없을 수 있다. */
  inflowChannel: string | null;
  createdAt: string | null;
};

export type CreateStudioRequest = {
  name: string;
  galleryUrl: string;
  inflowChannel?: string | null;
};

export type GalleryUrlAvailability = {
  /** 실제 생성·수정에 쓰이는 canonical 값. 화면 표시·제출도 이 값을 쓴다. */
  galleryUrl: string;
  /**
   * true라도 생성이 반드시 성공하지는 않는다 — 확인과 생성 사이에 다른
   * 사람이 같은 주소를 채갈 수 있고, 최종 판단은 생성 API의 STUDIO_409_2다.
   */
  available: boolean;
};

/**
 * 공개 주소 사용 가능 여부. 형식·예약어 규칙은 생성 API와 같아서, 여기서
 * 통과한 주소가 저장 단계에서 형식 때문에 거절되는 일은 없다.
 *
 * 실패 코드: STUDIO_400_1(형식 위반·예약어).
 */
export function checkGalleryUrlAvailability(
  galleryUrl: string,
): Promise<GalleryUrlAvailability> {
  return api(
    `/api/v1/studios/gallery-url/availability?galleryUrl=${encodeURIComponent(galleryUrl)}`,
  );
}

/**
 * 스튜디오 생성. 성공하면 사용자 종류가 PHOTOGRAPHER로 확정된다 —
 * 종류만 정하는 API는 따로 없다.
 *
 * 실패 코드: STUDIO_400_1(형식 위반·예약어) · STUDIO_409_1(이미 스튜디오
 * 있음) · STUDIO_409_2(주소 중복) · USER_409_1(이미 부부로 확정된 계정).
 */
export function createStudio(
  request: CreateStudioRequest,
): Promise<StudioResponse> {
  return api("/api/v1/studios", { method: "POST", body: request });
}
