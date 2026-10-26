"use client";

/**
 * 체험 껍데기 — 체험 모드를 켜고 가짜 사용자로 로그인한 채 실제 갤러리 화면을 감싼다(이슈 144)
 * 위치: src/app/(demo)/_components/DemoShell.tsx
 *
 * 순서가 중요하다. 체험 모드 스위치는 첫 렌더 초기화(useState)에서 켜서 자식(갤러리 화면)의 effect가 돌기 전에 가짜 서버가
 * 받게 하고, 가짜 로그인은 layout effect에서(자식의 데이터 effect보다 먼저, 렌더 중 스토어 갱신은 피해서). 나갈 때는 스위치를
 * 끄고 들어올 때의 로그인 상태로 되돌린다(부팅이 끝나기 전이었으면 복구를 다시 돈다).
 * 위 띠: 체험 중 안내 · "처음부터"(진행 지우기) · "내 사진으로 시작하기"(회원가입 모달, 개인 갤러리로). 갤러리 화면은 h-dvh라
 * 띠 높이만큼 안쪽 높이를 100%로 눌러 넣는다.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { type AuthState, getAuthState, setAuthenticated, setGuest } from "@/lib/auth/authStore";
import { restoreSession } from "@/lib/auth/restoreSession";
import { DEMO_USER, setDemoActive } from "@/lib/demo/demoMode";
import { demoPhase, resetDemoState } from "@/lib/demo/demoServer";
import { LoginModal } from "@/components/LoginModal";
import { ArrowRightIcon, RefreshIcon } from "@/components/icons";

export function DemoShell({ children }: { children: ReactNode }) {
  const prev = useRef<AuthState | null>(null);
  // 자식이 그려지기 전에 — 가짜 서버가 첫 호출부터 받는다
  useState(() => {
    setDemoActive(true);
    return true;
  });
  const [signup, setSignup] = useState(false);

  useLayoutEffect(() => {
    setDemoActive(true);
    prev.current = getAuthState();
    setAuthenticated(DEMO_USER);
    return () => {
      setDemoActive(false);
      const before = prev.current;
      if (before?.status === "authenticated") setAuthenticated(before.user);
      else if (before?.status === "guest") setGuest();
      else void restoreSession();
    };
  }, []);

  useEffect(() => {
    track("demo_opened", { phase: demoPhase() });
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 bg-brand-secondary-default px-4 type-label-medium-s text-contents-dark-bgd-default">
        <span className="min-w-0 truncate">체험 중 · 샘플 사진 250장 · 바뀐 것은 이 브라우저에만 남아요</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              resetDemoState();
              window.location.reload();
            }}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--radius-8) px-2.5 type-label-medium-xs text-contents-dark-bgd-default/85 transition-colors duration-fast hover:bg-white/15"
          >
            <RefreshIcon size={14} />
            처음부터
          </button>
          <button
            type="button"
            onClick={() => {
              track("demo_signup_clicked", { phase: demoPhase() });
              setSignup(true);
            }}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--radius-8) bg-background-default-main px-3 type-label-semibold-xs text-contents-light-bgd-default transition-opacity duration-fast hover:opacity-90"
          >
            내 사진으로 시작하기
            <ArrowRightIcon size={14} />
          </button>
        </span>
      </div>
      <div className="min-h-0 flex-1 [&>div]:h-full!">{children}</div>
      <LoginModal open={signup} onClose={() => setSignup(false)} mode="signup" intent="personal" />
    </div>
  );
}
