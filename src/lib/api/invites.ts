/**
 * 갤러리 초대 API — 스웨거 [Gallery Invite] 계약의 타입화
 * 위치: src/lib/api/invites.ts
 */

import { api } from "@/lib/api/client";

export type InviteAcceptResponse = {
  galleryId: number;
  /** 이 사용자의 갤러리 멤버 id. 이미 멤버였다면 그때 만들어진 값. */
  memberId: number;
};

export type GalleryInviteResponse = {
  id: number;
  galleryId: number;
  /** 예비 부부에게 그대로 전달하는 링크. 토큰이 아니라 완성된 URL이다. */
  inviteUrl: string;
  /** 지금 쓸 수 있는지 — 저장된 값이 아니라 조회 시점에 계산된다. */
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
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
