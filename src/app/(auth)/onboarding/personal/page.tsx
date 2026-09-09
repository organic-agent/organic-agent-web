"use client";

/**
 * 개인 갤러리 온보딩 자리 — 임시 안내
 * 위치: src/app/(auth)/onboarding/personal/page.tsx
 *
 * 개인 결제 클라이언트 경로(플랜 선택 → 테스트 체크아웃 → 갤러리 만들기)는 진입 흐름
 * 5단계에서 시안 확정 후 이 파일을 교체한다. 그때까지 역할 선택과 랜딩 카드 버튼이
 * 도착할 자리만 마련해 둔다.
 */

import { EntryTopbar } from "@/components/app/EntryTopbar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/authStore";

export default function PersonalOnboardingPlaceholderPage() {
  const auth = useAuth();
  const initial = auth.user?.nickname.trim().slice(0, 1) || "?";

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar initial={initial} />
      <div className="grid flex-1 place-items-center px-6 py-14">
        <div className="flex max-w-100 flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="type-label-eyebrow text-brand-secondary-default">For Individuals</p>
            <h1 className="type-title-xl text-balance text-contents-light-bgd-default">
              개인 갤러리 만들기는 준비 중이에요
            </h1>
            <p className="type-content-m text-contents-light-bgd-sub">
              플랜 선택과 결제 화면을 만들고 있어요. 조금만 기다려 주세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Button kind="ghost" href="/onboarding/role">
              역할 선택으로
            </Button>
            <Button href="/">홈으로</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
