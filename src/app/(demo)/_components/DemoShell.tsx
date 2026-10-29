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
 * 막힌 기능(AI 추천 · 게스트 초대 · 게스트 반응 · 공유폴더 · 프로필 메뉴)은 화면 코드가 blockInDemo()로 알리고 여기서 스낵바로 보여 준다.
 * 요청서를 내보내면(단계 review) 갤러리 화면 대신 "보정 확인부터는 실제 갤러리에서" 카드를 둔다(2026-10-26 수민).
 * 로그인 규칙(2026-10-26 수민 질문): 체험은 누구나 가짜 사용자로 본다. 나가는 버튼만 다르다 — 로그인한 적 없으면
 * "내 사진으로 시작하기"(회원가입 모달 · 개인), 저장된 토큰이 있으면 "내 갤러리로 가기"(마지막 사용자 기록의 공간으로 전체 새로 고침 —
 * 서버를 안 부르고 판단하고, 새로 고침으로 실제 세션이 복구된다).
 */

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { type AuthState, getAuthState, setAuthenticated, setGuest } from "@/lib/auth/authStore";
import { restoreSession } from "@/lib/auth/restoreSession";
import { useLastUser } from "@/lib/auth/lastUser";
import { spaceChip } from "@/lib/auth/loginFlow";
import { getRefreshToken } from "@/lib/auth/tokenStore";
import { DEMO_USER, clearDemoNotice, getDemoNotice, setDemoActive, subscribeDemoNotice } from "@/lib/demo/demoMode";
import { demoPhase, resetDemoState, subscribeDemoPhase } from "@/lib/demo/demoServer";
import { LoginModal } from "@/components/LoginModal";
import { Snackbar } from "@/components/app/Snackbar";
import { ArrowRightIcon, CheckCircleIcon, RefreshIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const NOTICE_MS = 2400;
const serverPhase = () => "sort" as const;
const noNotice = () => null;
const noSubscribe = () => () => {};
const hasToken = () => Boolean(getRefreshToken());
const noToken = () => false;

export function DemoShell({ children }: { children: ReactNode }) {
  const prev = useRef<AuthState | null>(null);
  // 자식이 그려지기 전에 — 가짜 서버가 첫 호출부터 받는다
  useState(() => {
    setDemoActive(true);
    return true;
  });
  const [signup, setSignup] = useState(false);
  // 로그인한 사람인가 — 저장된 토큰으로만 본다(서버를 부르면 가짜 서버가 받는다). 서버 렌더는 모름 = 손님으로
  const member = useSyncExternalStore(noSubscribe, hasToken, noToken);
  const lastUser = useLastUser();
  const phase = useSyncExternalStore(subscribeDemoPhase, demoPhase, serverPhase);
  const notice = useSyncExternalStore(subscribeDemoNotice, getDemoNotice, noNotice);

  useLayoutEffect(() => {
    setDemoActive(true);
    prev.current = getAuthState();
    setAuthenticated(DEMO_USER);
    return () => {
      setDemoActive(false);
      clearDemoNotice();
      const before = prev.current;
      if (before?.status === "authenticated") setAuthenticated(before.user);
      else if (before?.status === "guest") setGuest();
      else void restoreSession();
    };
  }, []);

  useEffect(() => {
    track("demo_opened", { phase: demoPhase() });
  }, []);

  // 스낵바는 잠깐만
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearDemoNotice, NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const reset = () => {
    resetDemoState();
    window.location.reload();
  };
  /** 나가는 버튼 — 손님은 회원가입 모달, 로그인한 사람은 제 공간으로(전체 새로 고침이라 실제 세션이 돌아온다) */
  const exitLabel = member ? "내 갤러리로 가기" : "내 사진으로 시작하기";
  const exit = () => {
    track("demo_signup_clicked", { phase: demoPhase() });
    if (member) {
      window.location.assign(lastUser ? spaceChip(lastUser).href : "/");
      return;
    }
    setSignup(true);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 bg-brand-accent-default px-4 type-label-medium-s text-brand-on-fill">
        <span className="min-w-0 truncate">체험 중 · 샘플 사진 250장 · 바뀐 것은 이 브라우저에만 남아요</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--radius-8) px-2.5 type-label-medium-xs text-contents-dark-bgd-default/85 transition-colors duration-fast hover:bg-white/15"
          >
            <RefreshIcon size={14} />
            처음부터
          </button>
          <button
            type="button"
            onClick={exit}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--radius-8) bg-background-default-main px-3 type-label-semibold-xs text-contents-light-bgd-default transition-opacity duration-fast hover:opacity-90"
          >
            {exitLabel}
            <ArrowRightIcon size={14} />
          </button>
        </span>
      </div>

      {phase === "review" ? (
        <div className="grid min-h-0 flex-1 place-items-center bg-background-default-main px-6">
          <div className="flex w-full max-w-105 flex-col items-center gap-3 rounded-(--radius-16) border border-divider-default px-8 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-brand-chip-background text-brand-chip-text">
              <CheckCircleIcon size={24} />
            </span>
            <h2 className="type-title-m text-contents-light-bgd-default">요청서까지 내보냈어요</h2>
            <p className="type-content-m text-contents-light-bgd-sub">보정 확인부터는 실제 갤러리에서 확인해 보세요.</p>
            <div className="mt-3 flex gap-2">
              <Button kind="ghost" onClick={reset}>
                처음부터 다시
              </Button>
              <Button icon={<ArrowRightIcon />} onClick={exit}>
                {exitLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 [&>div]:h-full!">{children}</div>
      )}

      {notice && (
        <Snackbar key={notice.at} kind="info" className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2">
          {notice.text}
        </Snackbar>
      )}
      <LoginModal open={signup} onClose={() => setSignup(false)} mode="signup" intent="personal" />
    </div>
  );
}
