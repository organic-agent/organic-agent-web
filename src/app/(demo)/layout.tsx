import { SidebarProvider } from "@/components/SidebarProvider";
import { DemoShell } from "./_components/DemoShell";

/**
 * 체험 레이아웃 — 로그인 없이 열리는 실제 갤러리 화면(이슈 144)
 * 위치: src/app/(demo)/layout.tsx
 *
 * 클라이언트 레이아웃과 달리 인증 가드가 없고, 사이드바는 접힌 채 시작한다(쿠키를 읽지 않아 정적 렌더가 된다).
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider initialCollapsed initialHasPreference={false}>
      <DemoShell>{children}</DemoShell>
    </SidebarProvider>
  );
}
