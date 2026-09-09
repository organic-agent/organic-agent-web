/**
 * 진입 온보딩(역할 선택·개인 갤러리) 레이아웃 — 인증 가드만 얹는다
 * 위치: src/app/(auth)/onboarding/layout.tsx
 *
 * 스튜디오 온보딩(/onboarding/studio·gallery)은 (studio) 그룹 레이아웃의 가드가 맡는다.
 */

import { AuthGuard } from "@/components/AuthGuard";

export default function EntryOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
