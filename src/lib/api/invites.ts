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
