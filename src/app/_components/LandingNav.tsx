"use client";

/**
 * 랜딩 상단 바 — 로고 + 로그인·회원가입
 * 위치: src/app/_components/LandingNav.tsx
 *
 * 로그인 모달은 페이지가 하나만 들고 있다(대상 카드 버튼과 공유). 여기서는 열어 달라고만 한다.
 * "로그인"은 기존 couple 카피가 이미 역할 중립이라 그대로 쓴다 — 역할 중립 intent 정리는 진입 흐름 PR에서.
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import type { LoginIntent } from "@/lib/auth/loginFlow";

export function LandingNav({
  onOpenLogin,
}: {
  onOpenLogin: (intent: LoginIntent) => void;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-100 bg-background-default-main border-b border-divider-default">
      <div className="max-w-wrap mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-[10px]"
          aria-label="Easy Select 홈"
        >
          <BrandLogo size={32} className="text-contents-light-bgd-default shrink-0" />
          <b className="type-brand-wordmark text-contents-light-bgd-default">Easy Select</b>
        </Link>

        {/* Nav buttons */}
        <nav className="flex items-center gap-2">
          <Button kind="ghost" onClick={() => onOpenLogin("couple")}>
            로그인
          </Button>
          <Button onClick={() => onOpenLogin("signup")}>회원가입</Button>
        </nav>
      </div>
    </header>
  );
}
