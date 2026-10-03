/**
 * 진입 온보딩(역할 선택·개인 갤러리) 레이아웃 — 인증 가드만 얹는다
 * 위치: src/app/(auth)/onboarding/layout.tsx
 *
 * 스튜디오 온보딩(/onboarding/studio·gallery)은 (studio) 그룹 레이아웃의 가드가 맡는다.
 * 가드는 OnboardingGate가 감싼다 — 쿠폰 선물 링크(#code)를 가드보다 먼저 받기 위해(이슈 81).
 */

import { OnboardingGate } from "./_components/OnboardingGate";

export default function EntryOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OnboardingGate>{children}</OnboardingGate>;
}
