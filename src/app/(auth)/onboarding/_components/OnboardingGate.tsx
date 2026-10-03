"use client";

/**
 * 진입 온보딩의 문 — 인증 가드 앞에서 쿠폰 선물 링크를 먼저 받는다 (이슈 81)
 * 위치: src/app/(auth)/onboarding/_components/OnboardingGate.tsx
 *
 * 백오피스 선물 링크는 /onboarding/personal#code=토큰이다. 가드가 비로그인 사용자를 랜딩으로 보내 버리면
 * # 조각의 코드가 사라지므로, 가드보다 먼저 #code를 읽어 쿠폰 등록 화면으로 주소를 바꾼다.
 * 쿠폰 등록 화면(COUPON_PATH)은 가드를 거치지 않는다 — 비로그인이면 그 화면이 직접 로그인(LoginModal asPage)을
 * 띄우고, 코드를 로그인 왕복 컨텍스트에 실어 로그인 뒤 같은 화면으로 돌아온다. 나머지 온보딩은 지금처럼 가드 안이다.
 */

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { COUPON_PATH, couponRedemptionPath } from "@/lib/couponLink";
import { useCouponCodeFromHash } from "@/lib/useCouponCodeFromHash";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { code } = useCouponCodeFromHash();
  const redirecting = pathname === "/onboarding/personal" && code !== null;

  useEffect(() => {
    if (redirecting && code) router.replace(couponRedemptionPath(code));
  }, [redirecting, code, router]);

  if (pathname === COUPON_PATH) return <>{children}</>;
  if (redirecting) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background-default-main">
        <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">쿠폰을 확인하고 있어요…</p>
      </main>
    );
  }
  return <AuthGuard>{children}</AuthGuard>;
}
