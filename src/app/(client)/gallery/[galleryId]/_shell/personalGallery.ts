/**
 * 개인 결제 클라이언트 판정 — 갤러리 응답엔 작업공간 종류가 없어 내 소속 목록(users/me → workspaces)으로 가른다
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/personalGallery.ts
 *
 * 소유자(OWNER)와 파트너(MEMBER)는 업로드 · 폴더 · 확정 · 셀렉 · 보정 요청을 함께 하고, 초대 발급 · 사진 삭제 ·
 * 갤러리 설정 · 종료는 소유자만(서버 requireManager). 개인 갤러리는 만들자마자 OPEN이라 "갤러리 열기"가 없다.
 */

import type { User } from "@/lib/api/auth";
import type { GalleryResponse } from "@/lib/api/galleries";

export type PersonalMembership = { owner: boolean };

export function personalMembershipOf(user: User | null, gallery: GalleryResponse | null): PersonalMembership | null {
  if (!user || !gallery) return null;
  const w = user.workspaces.find(
    (ws) => ws.workspaceType === "PERSONAL" && (ws.galleryId === gallery.id || ws.workspaceId === gallery.workspaceId),
  );
  return w ? { owner: w.role === "OWNER" } : null;
}

