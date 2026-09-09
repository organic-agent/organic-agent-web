/**
 * 워크스페이스 목록 레이아웃 — 인증 가드만 얹는다
 * 위치: src/app/(auth)/workspace/layout.tsx
 */

import { AuthGuard } from "@/components/AuthGuard";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
