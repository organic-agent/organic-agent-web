/**
 * 작가 — 라우트 레이아웃
 * 위치: src/app/(photographer)/layout.tsx
 *
 * 작가 영역 전체에 사이드바 접힘 상태 Provider를 연결한다.
 * 서버에서 쿠키를 읽어 첫 렌더부터 저장된 사이드바 상태를 반영한다.
 *
 * 주요 책임:
 * - 사이드바 접힘 쿠키 읽기
 * - SidebarProvider 초기값 전달
 * - 작가 하위 라우트 공통 상태 제공
 *
 * 참고:
 * - 쿠키를 읽으므로 이 경로들은 동적 렌더링으로 전환된다.
 */

import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/SidebarProvider";
import { SIDEBAR_COOKIE, parseCollapsedCookie } from "@/lib/sidebar";

export default async function PhotographerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collapsed = parseCollapsedCookie(
    (await cookies()).get(SIDEBAR_COOKIE)?.value,
  );
  return (
    <SidebarProvider initialCollapsed={collapsed}>{children}</SidebarProvider>
  );
}
