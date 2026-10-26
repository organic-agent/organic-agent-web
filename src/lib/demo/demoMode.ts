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

/**
 * 체험 안내 스낵바 — 체험에서 막힌 기능(AI 추천 · 게스트 초대 · 게스트 반응)을 누르면 화면 코드가 showDemoNotice()를 부르고
 * DemoShell이 그린다. 하나만 두고 덮어쓴다.
 */
type DemoNotice = { text: string; at: number } | null;
let notice: DemoNotice = null;
const noticeListeners = new Set<() => void>();
export function showDemoNotice(text: string): void {
  notice = { text, at: Date.now() };
  noticeListeners.forEach((l) => l());
}
export function clearDemoNotice(): void {
  notice = null;
  noticeListeners.forEach((l) => l());
}
export function getDemoNotice(): DemoNotice {
  return notice;
}
export function subscribeDemoNotice(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => {
    noticeListeners.delete(listener);
  };
}
/** 받침에 따라 은/는 */
function topic(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}은(는)`;
  return `${word}${code % 28 ? "은" : "는"}`;
}
/** 막힌 기능을 눌렀을 때 — 체험이면 안내하고 true(호출한 쪽은 그만둔다) */
export function blockInDemo(feature: string): boolean {
  if (!active) return false;
  showDemoNotice(`${topic(feature)} 실제 갤러리에서 쓸 수 있어요`);
  return true;
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
