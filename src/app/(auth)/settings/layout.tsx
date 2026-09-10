/**
 * 설정 레이아웃 — 인증 가드만 얹는다
 * 위치: src/app/(auth)/settings/layout.tsx
 */

import { AuthGuard } from "@/components/AuthGuard";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
