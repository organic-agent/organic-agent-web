/**
 * 작가 — 라우트 레이아웃
 * 위치: src/app/(studio)/layout.tsx
 *
 * 작가 영역 전체에 사이드바 접힘 상태 Provider를 연결한다.
 * 서버에서 쿠키를 읽어 첫 렌더부터 저장된 사이드바 상태를 반영한다.
 * 쿠키가 없으면 닫힘으로 그린다 — 갤러리의 사진 업로드 단계는 닫힌 채로 시작하고, 셀렉 대기부터는
 * 갤러리 화면이 hasPreference=false를 보고 연다(클라이언트 쪽 레이아웃과 같은 방식, 2026-10-05).
 *
 * 주요 책임:
 * - 사이드바 접힘 쿠키 읽기
 * - SidebarProvider 초기값 전달
 * - 작가 하위 라우트 공통 상태 제공
 * - 인증 가드: 로그인한 사용자만 통과, 게스트는 랜딩으로
 *
 * 참고:
 * - 쿠키를 읽으므로 이 경로들은 동적 렌더링으로 전환된다.
 */

import { cookies } from "next/headers";
import { AuthGuard } from "@/components/AuthGuard";
import { SidebarProvider } from "@/components/SidebarProvider";
import { SIDEBAR_COOKIE, parseCollapsedCookie } from "@/lib/sidebar";

export default async function PhotographerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = (await cookies()).get(SIDEBAR_COOKIE)?.value;
  const collapsed = raw === undefined ? true : parseCollapsedCookie(raw);
  return (
    <SidebarProvider initialCollapsed={collapsed} initialHasPreference={raw !== undefined}>
      <AuthGuard>{children}</AuthGuard>
    </SidebarProvider>
  );
}
