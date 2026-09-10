/**
 * 스튜디오 API — 스웨거 [Studio] 계약의 타입화
 * 위치: src/lib/api/studios.ts
 */

import { api } from "@/lib/api/client";

export type StudioResponse = {
  id: number;
  /** 스튜디오 작업공간 id — GET /studios/{workspaceId}에 쓰는 값. 주소는 galleryUrl(공개 주소)이 정식이고 번호로도 열린다. */
  workspaceId: number;
  name: string;
  /** trim + 소문자 정규화를 거친 canonical 공개 주소. */
  galleryUrl: string;
  /** @deprecated 과거 운영 데이터 호환용. 생성 요청에서는 더 받지 않는다. */
  inflowChannel: string | null;
  /** 고객에게 노출할 연락처 */
  contact: string | null;
  /** 스튜디오 소개 */
  description: string | null;
  createdAt: string | null;
  /** 이 스튜디오에서의 내 역할. 소속이 아니면 null. */
  role: "OWNER" | "MEMBER" | null;
};

export type CreateStudioRequest = {
  name: string;
  galleryUrl: string;
  /** 고객에게 노출할 연락처 (선택) */
  contact?: string | null;
  /** 스튜디오 소개 (선택, 500자) */
  description?: string | null;
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
 * 내 소속 스튜디오 목록. 공개 주소(galleryUrl)가 함께 오므로 주소 /studio/[공개 주소]에서
 * 번호(workspaceId)를 찾는 데 쓴다.
 */
export function listMyStudios(): Promise<StudioResponse[]> {
  return api("/api/v1/studios");
}

/**
 * 지정 스튜디오 조회 — 주소의 studioId(= workspaceId)로. 내 소속 여부와
 * 역할(OWNER/MEMBER)이 함께 온다. 소속이 아니면 403.
 */
export function fetchStudio(workspaceId: number | string): Promise<StudioResponse> {
  return api(`/api/v1/studios/${workspaceId}`);
}

/**
 * 스튜디오 작업공간 생성. 요청 사용자가 OWNER가 되고, 기존 개인 작업공간과
 * 다른 스튜디오 소속은 유지된다.
 *
 * 실패 코드: STUDIO_400_1(형식 위반·예약어) · STUDIO_409_1(이미 스튜디오
 * 있음) · STUDIO_409_2(주소 중복).
 */
export function createStudio(
  request: CreateStudioRequest,
): Promise<StudioResponse> {
  return api("/api/v1/studios", { method: "POST", body: request });
}

export type StudioMemberResponse = {
  /** 내보내기·역할 변경에 쓰는 소속 id — 사용자 id가 아니다 */
  memberId: number;
  userId: number;
  nickname: string;
  email: string | null;
  role: "OWNER" | "MEMBER";
};

/** 스튜디오 멤버 목록 — 소속이면 누구나 볼 수 있다 */
export function listStudioMembers(
  workspaceId: number,
): Promise<StudioMemberResponse[]> {
  return api(`/api/v1/studios/${workspaceId}/members`);
}

export type StudioInviteResponse = {
  id: number;
  workspaceId: number;
  kind: "STUDIO_MEMBER" | "GALLERY_MEMBER" | "PERSONAL_PARTNER";
  /** 작가에게 그대로 전달하는 완성된 링크 */
  inviteUrl: string;
  /** 조회 시점에 계산한 상태 — ACTIVE만 쓸 수 있다 */
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "FULL" | "ALREADY_MEMBER";
  usedCount: number;
  expiresAt: string;
  revokedAt: string | null;
};

/** 현재 작가 초대 링크 조회. 발급한 적이 없으면 404 */
export function getStudioInviteLink(
  workspaceId: number,
): Promise<StudioInviteResponse> {
  return api(`/api/v1/studios/${workspaceId}/invite-link`);
}

/**
 * 작가 초대 링크 발급 — 스튜디오 멤버면 누구나. 7일 뒤 만료하고,
 * 재발급하면 이전 링크는 폐기된다. 갤러리가 없어도 발급할 수 있다.
 */
export function issueStudioInviteLink(
  workspaceId: number,
): Promise<StudioInviteResponse> {
  return api(`/api/v1/studios/${workspaceId}/invite-link`, { method: "POST" });
}
