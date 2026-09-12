import { cookies } from "next/headers";
import { AuthGuard } from "@/components/AuthGuard";
import { SidebarProvider } from "@/components/SidebarProvider";
import { SIDEBAR_COOKIE, parseCollapsedCookie } from "@/lib/sidebar";

/**
 * 부부 쪽 레이아웃 (사이드바 접힘 상태를 쿠키에서 읽어 SidebarProvider에 전달)
 * 위치: src/app/(client)/layout.tsx
 *
 * 서버가 첫 렌더부터 올바른 사이드바 폭으로 그려서 새로고침 시 깜빡임·하이드레이션 불일치가 없다.
 * 인증 가드로 로그인한 사용자만 통과시킨다(게스트는 랜딩으로).
 * (쿠키를 읽으므로 이 경로들은 동적 렌더링으로 전환된다 — 앱 화면이라 무방.)
 */
export default async function CoupleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 클라이언트는 1단계 닫힘 · 2단계부터 열림이 기본(2026-09-12) — 쿠키가 있으면 그 값을 따른다.
  // 쿠키가 없으면 닫힘으로 그리고, 페이지가 단계를 알게 되면 hasPreference=false를 보고 2단계 기본값(열림)을 적용한다.
  const raw = (await cookies()).get(SIDEBAR_COOKIE)?.value;
  const collapsed = raw === undefined ? true : parseCollapsedCookie(raw);
  return (
    <SidebarProvider initialCollapsed={collapsed} initialHasPreference={raw !== undefined}>
      <AuthGuard>{children}</AuthGuard>
    </SidebarProvider>
  );
}
