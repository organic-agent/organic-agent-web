/**
 * 갤러리 초대 API — 스웨거 [Gallery Invite] 계약의 타입화
 * 위치: src/lib/api/invites.ts
 */

import { api } from "@/lib/api/client";

/** 초대가 만드는 소속 종류 — 스튜디오 팀원 / 스튜디오 갤러리의 클라이언트 / 개인 갤러리의 파트너 */
export type InviteKind = "STUDIO_MEMBER" | "GALLERY_MEMBER" | "PERSONAL_PARTNER";

/** 지금 쓸 수 있는지 — 저장값이 아니라 조회 시점에 계산된다 */
export type InviteStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "FULL" | "ALREADY_MEMBER";

export type InvitePreviewResponse = {
  kind: InviteKind;
  status: InviteStatus;
  workspaceId: number;
  /** 개인 파트너 초대면 null */
  studioName: string | null;
  /** 스튜디오 팀원 초대면 null */
  galleryId: number | null;
  galleryTitle: string | null;
  maxUses: number | null;
  usedCount: number;
  remainingUses: number | null;
  expiresAt: string;
};

/**
 * 초대 미리보기 — 수락 전에 누가 어디로 부르는지와 상태(만료·회수·정원·기존 소속)를 본다.
 * 로그인이 필요하다. 없는 링크는 404(GALLERY_404_3).
 */
export function previewInvite(token: string): Promise<InvitePreviewResponse> {
  return api(`/api/v1/invites/${encodeURIComponent(token)}`);
}

export type InviteAcceptResponse = {
  /** 들어간 갤러리. 스튜디오 팀원 초대(STUDIO_MEMBER)면 null */
  galleryId: number | null;
  /** 들어간 작업공간 — 스튜디오 팀원 초대면 /studio/[workspaceId] */
  workspaceId: number;
  kind: InviteKind;
  /** 이 사용자의 갤러리 멤버 id. 이미 멤버였다면 그때 만들어진 값. */
  memberId: number | null;
};

export type GalleryInviteResponse = {
  id: number;
  galleryId: number;
  /** 예비 부부에게 그대로 전달하는 링크. 토큰이 아니라 완성된 URL이다. */
  inviteUrl: string;
  /** 지금 쓸 수 있는지 — 저장된 값이 아니라 조회 시점에 계산된다. */
  status: InviteStatus;
  expiresAt: string;
  /** 작가가 거둬들인 시각. 폐기하지 않았으면 null. */
  revokedAt: string | null;
  createdAt: string | null;
};

/**
 * 현재 초대 링크 조회. 담당 작가만(403). 살아 있는 링크 하나가 오고,
 * 만료된 링크도 폐기 전까지는 status=EXPIRED로 온다.
 * 아직 발급하지 않았거나 폐기만 해둔 상태면 404 — 발급 버튼을 보여주면
 * 되는 정상 상태다.
 */
export function getCurrentInvite(
  galleryId: number,
): Promise<GalleryInviteResponse> {
  return api(`/api/v1/galleries/${galleryId}/invite`);
}

/**
 * 초대 링크 발급(재발급). 유효 기간 7일, 갤러리 정원은 2명.
 * 갤러리당 유효한 링크는 항상 하나 — **재발급하면 이전 링크는 즉시
 * 쓸 수 없게 된다.** 화면은 재발급 전에 이 사실을 경고해야 한다.
 */
export function issueInvite(
  galleryId: number,
): Promise<GalleryInviteResponse> {
  return api(`/api/v1/galleries/${galleryId}/invites`, { method: "POST" });
}

/**
 * 초대 링크 폐기 — 링크가 엉뚱한 곳에 퍼졌을 때 거둬들인다.
 * 이미 들어온 멤버는 그대로 남는다. 멱등이라 재폐기도 204.
 */
export function revokeInvite(
  galleryId: number,
  inviteId: number,
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/invites/${inviteId}`, {
    method: "DELETE",
  });
}

/**
 * 초대 수락. 로그인은 필요하지만 갤러리 권한은 요구하지 않으며, 멱등이라
 * 같은 사람이 여러 번 불러도 매번 200이다. 종류 미정 계정은 이때 CLIENT로
 * 확정된다.
 *
 * 실패 코드: GALLERY_404_3(없는 링크) · GALLERY_410_1(만료) ·
 * GALLERY_410_2(폐기) · GALLERY_403_3(담당 작가 본인) · GALLERY_403_5(정원 참).
 */
export function acceptInvite(token: string): Promise<InviteAcceptResponse> {
  return api(`/api/v1/invites/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  });
}

/**
 * 개인 파트너 초대 수락 — PERSONAL_PARTNER 종류만 받고, 소유자를 포함한 정원 2명을 검증한다.
 * 갤러리·팀원 초대는 acceptInvite를 쓴다.
 */
export function acceptPartnerInvite(token: string): Promise<InviteAcceptResponse> {
  return api(`/api/v1/invites/partner/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  });
}
