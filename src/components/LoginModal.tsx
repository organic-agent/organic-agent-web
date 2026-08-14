"use client";

/**
 * 로그인 / 회원가입 모달 (+ 페이지 공용)
 * 위치: src/components/LoginModal.tsx
 *
 * 사용법:
 *   모달로: <LoginModal open={true} onClose={fn} intent="couple" />
 *   페이지로: <LoginModal asPage intent="couple" />
 *
 * - 소셜 로그인 3종 (카카오·네이버·구글), 첫 로그인 = 가입
 * - intent에 따라 카피가 달라짐 (couple / studio)
 * - 부부 정책: 첫 진입은 반드시 초대 링크 필요 (서버에서 차단)
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

type Provider = "kakao" | "naver" | "google";

// OAuth 연동 시 복구: 로그인 후 역할·초대토큰을 담아 리다이렉트할 콜백 URL을 만든다.
// const AFTER_LOGIN_ROUTER = "/auth/redirect";
//
// function buildCallbackUrl(intent: string, inviteToken?: string | null): string {
//   const role = intent === "studio" ? "photographer" : "couple";
//   const params = new URLSearchParams({ role });
//   if (inviteToken) params.set("inviteToken", inviteToken);
//   return `${AFTER_LOGIN_ROUTER}?${params.toString()}`;
// }

const COPY = {
  couple: {
    title: "다시 오신 걸 환영해요",
    sub: "간편하게 로그인하고 사진을 확인하세요",
  },
  studio: {
    title: "스튜디오 로그인",
    sub: "로그인 후 갤러리를 개설할 수 있어요",
  },
};

const OAUTH = [
  {
    key: "kakao" as Provider,
    label: "카카오로 시작하기",
    bg: "#FEE500",
    fg: "rgba(0,0,0,0.85)",
    spinStroke: "rgba(0,0,0,0.85)",
  },
  {
    key: "naver" as Provider,
    label: "네이버로 시작하기",
    bg: "#03C75A",
    fg: "#fff",
    spinStroke: "#fff",
  },
  {
    key: "google" as Provider,
    label: "Google로 시작하기",
    bg: "#fff",
    fg: "#1F1F1F",
    border: true,
    spinStroke: "#5f6368",
  },
];

export function LoginModal({
  open,
  onClose,
  intent = "couple",
  // inviteToken,  // OAuth 연동 시 복구: buildCallbackUrl에서 사용
  asPage = false,
}: {
  open?: boolean;
  onClose?: () => void;
  intent?: "couple" | "studio";
  inviteToken?: string | null;
  asPage?: boolean;
}) {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

  // ESC 닫기 (모달 모드)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!asPage && open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [asPage, open, handleKeyDown]);

  function handleSignIn(provider: Provider) {
    setLoadingProvider(provider);
    // 백엔드 OAuth API 연동 시 실제 로그인 요청 후 콜백에서 오류 처리·역할 분기
    // OAuth 미연동 임시: 로그인 성공으로 간주하고 역할에 맞는 화면으로 바로 이동
    router.push(intent === "studio" ? "/onboarding/studio" : "/gallery");
  }

  const copy = COPY[intent];
  const busy = loadingProvider !== null;

  const card = (
    <div className="relative w-full max-w-[440px] bg-white rounded-2xl p-9 max-[480px]:px-6 max-[480px]:py-8">
      {/* 닫기 (모달 모드) */}
      {!asPage && onClose && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-ink-3 hover:bg-paper-deep transition-colors"
          aria-label="닫기"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}

      {/* 로고 + 카피 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2.5 mb-5">
          <BrandLogo size={27} className="text-ink" />
          <b className="font-display-en font-semibold text-[17px] tracking-[0.01em] text-ink">
            Wedding Easy Select
          </b>
        </div>
        <h2 className="text-[26px] font-semibold leading-snug tracking-[-0.02em] text-ink">
          {copy.title}
        </h2>
        <p className="text-sm mt-1 text-ink-2">{copy.sub}</p>
      </div>

      {/* 소셜 버튼 */}
      <div className="flex flex-col gap-3">
        {OAUTH.map((o) => (
          <button
            key={o.key}
            onClick={() => handleSignIn(o.key)}
            disabled={busy}
            aria-busy={loadingProvider === o.key}
            className="relative w-full h-12 rounded-pill text-sm font-medium transition-transform active:scale-[0.98] disabled:pointer-events-none"
            style={{
              background: o.bg,
              color: o.fg,
              border: o.border ? "1px solid #DADCE0" : "none",
              opacity: busy && loadingProvider !== o.key ? 0.45 : 1,
            }}
          >
            {loadingProvider === o.key ? (
              <svg
                className="mx-auto h-[18px] w-[18px] animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeDasharray="42 60"
                  stroke={o.spinStroke}
                />
              </svg>
            ) : (
              <span className="flex items-center justify-center gap-2.5">
                <SocialIcon provider={o.key} />
                {o.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 동의 문구 (간주 방식) */}
      <p className="text-center text-xs mt-7 text-ink-3">
        로그인 시{" "}
        <a
          href="/terms"
          className="underline underline-offset-2 decoration-line-strong hover:text-accent-deep hover:decoration-accent"
        >
          이용약관
        </a>{" "}
        및{" "}
        <a
          href="/privacy"
          className="underline underline-offset-2 decoration-line-strong hover:text-accent-deep hover:decoration-accent"
        >
          개인정보 처리방침
        </a>
        에 동의합니다
      </p>
    </div>
  );

  // 페이지 모드: 전체 화면 중앙 배치
  if (asPage) {
    return (
      <main className="grid min-h-dvh place-items-center bg-white px-6 py-12">
        {card}
      </main>
    );
  }

  // 모달 모드: 오버레이 + 중앙 카드
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Card */}
      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {card}
      </div>
    </div>
  );
}

/* ───────────────── 소셜 아이콘 ───────────────── */

function SocialIcon({ provider }: { provider: Provider }) {
  if (provider === "kakao")
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3.5C6.75 3.5 2.5 6.79 2.5 10.85c0 2.62 1.77 4.92 4.42 6.22-.15.53-.79 2.77-.83 2.96-.05.24.09.24.18.17.08-.05 2.46-1.67 3.49-2.37.66.1 1.34.15 2.04.15 5.25 0 9.5-3.29 9.5-7.36S17.25 3.5 12 3.5z"
        />
      </svg>
    );
  if (provider === "naver")
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M15.03 12.62 8.78 3.5H4v17h4.97v-9.12l6.25 9.12H20v-17h-4.97v9.12z"
        />
      </svg>
    );
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
