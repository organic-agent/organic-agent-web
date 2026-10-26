/**
 * 체험 모드 스위치 — /demo에서만 켜진다
 * 위치: src/lib/demo/demoMode.ts
 *
 * 켜져 있으면 API 관문(client.ts)이 서버 대신 브라우저 안 가짜 서버(demoServer.ts)에 묻고, 로그인은 가짜 사용자로 두며,
 * 분석은 demo_ 이벤트만 보낸다. 켜고 끄는 곳은 체험 레이아웃(DemoShell) 하나.
 */

import type { User } from "@/lib/api/auth";

let active = false;

export function isDemoActive(): boolean {
  return active;
}
export function setDemoActive(next: boolean): void {
  active = next;
}

export const DEMO_GALLERY_ID = 999;
export const DEMO_WORKSPACE_ID = 999;
export const DEMO_TITLE = "민지 · 준호 스튜디오 촬영";

/** 체험용 사용자 — 개인 갤러리 소유자. id는 실제 사용자와 겹치지 않게 음수 */
export const DEMO_USER: User = {
  id: -1,
  provider: "kakao",
  nickname: "홍길동",
  email: null,
  role: "USER",
  createdAt: null,
  workspaces: [
    {
      id: -1,
      kind: "GALLERY",
      workspaceId: DEMO_WORKSPACE_ID,
      galleryId: DEMO_GALLERY_ID,
      name: DEMO_TITLE,
      role: "OWNER",
      lastActivityAt: null,
      workspaceType: "PERSONAL",
    },
  ],
};
