"use client";

/**
 * 로그인 / 회원가입 모달 (+ /login 페이지 공용)
 * 위치: src/components/LoginModal.tsx
 *
 * 사용법:
 *   모달로: <LoginModal open onClose={fn} mode="signup" intent="studio" />
 *   페이지로: <LoginModal asPage intent="couple" />
 *
 * - 좌: 브랜드 패널(연올리브) — 로고·회사명은 여기에만. 우: 제목·부제·소셜 버튼·동의 문구(왼쪽 정렬)
 * - mode는 문구(로그인 / 회원가입)만 정한다. 로그인 뒤 목적지는 intent가 정한다(loginFlow).
 *   신규 여부는 로그인 전에 알 수 없어 랜딩 카드 버튼은 항상 회원가입 모달을 연다 — 기존 회원도 그대로 로그인된다.
 * - 소셜 로그인 3종(카카오·네이버·구글), 첫 로그인 = 가입. 버튼 색은 각 사 가이드 고정값 — 테마(토큰) 비대상
 * - 접근성: role=dialog·aria-modal·aria-labelledby, 열릴 때 첫 소셜 버튼 포커스, Tab 순환, 닫히면 연 곳으로 포커스 복원, ESC
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { CloseIcon, InfoIcon } from "@/components/icons";
import {
  loginErrorMessage,
  startLogin,
  type LoginIntent,
} from "@/lib/auth/loginFlow";

export type LoginMode = "login" | "signup";

/** 모달을 여는 쪽이 넘기는 값 — 문구(mode)와 목적지(intent)는 따로 간다 */
export type LoginRequest = { mode: LoginMode; intent: LoginIntent };

type Provider = "kakao" | "naver" | "google";

const COPY: Record<
  LoginMode,
  { title: string; sub: string; who: string; line: ReactNode }
> = {
  login: {
    title: "다시 오신 걸 환영해요",
    sub: "간편하게 로그인하고 이어서 진행하세요",
    who: "Welcome back",
    line: (
      <>
        우리의 순간을,
        <br />
        함께 고르다.
      </>
    ),
  },
  signup: {
    title: "회원가입",
    sub: "소셜 계정으로 시작하세요. 첫 로그인이 곧 가입이에요",
    who: "Get started",
    line: (
      <>
        업로드부터 보정 요청까지,
        <br />
        사진의 여정을 한 곳에서.
      </>
    ),
  },
};

const OAUTH: {
  key: Provider;
  name: string;
  label: string;
  bg: string;
  fg: string;
  border?: boolean;
  spinStroke: string;
}[] = [
  {
    key: "kakao",
    name: "카카오",
    label: "카카오 로그인",
    bg: "#FEE500",
    fg: "rgba(0,0,0,0.85)",
    spinStroke: "rgba(0,0,0,0.85)",
  },
  {
    key: "naver",
    name: "네이버",
    label: "네이버 로그인",
    bg: "#03C75A",
    fg: "#fff",
    spinStroke: "#fff",
  },
  {
    key: "google",
    name: "구글",
    label: "구글 로그인",
    bg: "#fff",
    fg: "#1F1F1F",
    border: true, // 보더 색은 구글 브랜드 가이드 #747775
    spinStroke: "#5f6368",
  },
];

const FOCUSABLE = "button:not([disabled]), a[href]";

export function LoginModal({
  open,
  onClose,
  mode = "login",
  intent = "couple",
  inviteToken = null,
  errorCode = null,
  asPage = false,
}: {
  open?: boolean;
  onClose?: () => void;
  mode?: LoginMode;
  intent?: LoginIntent;
  inviteToken?: string | null;
  /** OAuth 콜백이 실패를 되돌려보낼 때의 에러 코드 (/login?error=...) */
  errorCode?: string | null;
  asPage?: boolean;
}) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);

  // onClose는 매 렌더 새 함수일 수 있어 ref로 받는다 — 아래 효과가 열림/닫힘에만 반응하도록.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 모달 모드: 포커스 이동·Tab 순환·ESC, 배경 스크롤 잠금, 닫히면 연 곳으로 포커스 복원
  useEffect(() => {
    if (asPage || !open) return;
    const card = cardRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(card?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    // 첫 소셜 버튼으로 — 닫기보다 할 일이 먼저다
    focusables().find((el) => el.dataset.provider)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      const inside = card?.contains(active) ?? false;
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [asPage, open]);

  async function handleSignIn(provider: Provider) {
    setLoadingProvider(provider);
    setStartError(null);
    try {
      await startLogin(provider, { intent, inviteToken });
      // 성공하면 페이지가 provider로 통째로 떠난다 — 로딩을 해제하지 않는 게 맞다.
    } catch {
      setLoadingProvider(null);
      setStartError("로그인을 시작하지 못했어요. 네트워크 확인 후 다시 시도해주세요.");
    }
  }

  const copy = COPY[mode];
  const busy = loadingProvider !== null;
  // 시작 실패(이 화면에서 발생)가 콜백 실패(쿼리로 전달)보다 최신 정보다.
  const errorMessage =
    startError ?? (errorCode ? loginErrorMessage(errorCode) : null);

  const card = (
    <div
      ref={cardRef}
      role={asPage ? undefined : "dialog"}
      aria-modal={asPage ? undefined : true}
      aria-labelledby={titleId}
      className={`relative grid w-full max-w-190 grid-cols-[5fr_7fr] overflow-hidden overscroll-contain rounded-(--radius-16) bg-background-default-main max-[700px]:grid-cols-1 ${
        asPage ? "border border-divider-default" : ""
      }`}
    >
      {/* 닫기 (모달 모드) — 40px 히트 영역 */}
      {!asPage && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-3 right-3 z-10 grid size-10 cursor-pointer place-items-center rounded-full text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
        >
          <CloseIcon />
        </button>
      )}

      {/* 브랜드 패널 — 로고·회사명은 여기에만. 좁은 화면에선 위 띠로 */}
      <div className="flex flex-col justify-between gap-10 bg-brand-secondary-background p-7 max-[700px]:flex-row max-[700px]:items-center max-[700px]:gap-4 max-[700px]:px-6 max-[700px]:py-5">
        <div className="flex items-center gap-2.5 text-brand-secondary-dark">
          <BrandLogo size={32} className="shrink-0" />
          <b className="type-brand-wordmark">Easy Select</b>
        </div>
        <div>
          <p className="type-label-eyebrow mb-2 text-brand-secondary-default max-[700px]:hidden">
            {copy.who}
          </p>
          <p className="type-title-l text-balance text-brand-secondary-dark">
            {copy.line}
          </p>
        </div>
      </div>

      {/* 로그인 영역 */}
      <div className="flex flex-col gap-6 p-9 max-[700px]:p-6">
        <div>
          <h2
            id={titleId}
            className="type-title-xl text-balance text-contents-light-bgd-default"
          >
            {copy.title}
          </h2>
          <p className="type-content-m mt-1.5 text-contents-light-bgd-sub">
            {copy.sub}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {errorMessage && (
            <p
              role="alert"
              className="type-content-s flex items-start gap-2 rounded-(--radius-8) bg-function-warning-surface px-3 py-2 text-contents-light-bgd-default"
            >
              <InfoIcon
                size={18}
                className="mt-px shrink-0 text-function-warning-default"
              />
              {errorMessage}
            </p>
          )}
          {OAUTH.map((o) => {
            const loading = loadingProvider === o.key;
            return (
              <button
                key={o.key}
                type="button"
                data-provider={o.key}
                onClick={() => handleSignIn(o.key)}
                disabled={busy}
                aria-busy={loading}
                className="type-label-medium-m relative h-12 w-full cursor-pointer touch-manipulation rounded-(--pill) transition-[filter,box-shadow,transform] duration-fast ease-out hover:shadow-(--shadow-hover) hover:brightness-[.96] active:scale-[0.985] disabled:pointer-events-none"
                style={{
                  background: o.bg,
                  color: o.fg,
                  border: o.border ? "1px solid #747775" : "none",
                  opacity: busy && !loading ? 0.45 : 1,
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="mx-auto h-4.5 w-4.5 animate-spin"
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
                    {/* 스피너만 남으면 버튼 이름이 사라진다 — 읽히는 이름을 유지 */}
                    <span className="sr-only">{o.name}로 로그인 중…</span>
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <SocialIcon provider={o.key} />
                    {o.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 동의 문구 (간주 방식) */}
        <p className="type-content-xs text-contents-light-bgd-additional">
          로그인 시{" "}
          <a
            href="/terms"
            className="underline underline-offset-2 transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            이용약관
          </a>{" "}
          및{" "}
          <a
            href="/privacy"
            className="underline underline-offset-2 transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            개인정보 처리방침
          </a>
          에 동의합니다
        </p>
      </div>
    </div>
  );

  // 페이지 모드: 전체 화면 중앙 배치
  if (asPage) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background-default-main px-6 py-12">
        {card}
      </main>
    );
  }

  // 모달 모드: 오버레이 + 중앙 카드
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-150 grid place-items-center overscroll-contain px-4">
      {/* Backdrop — 클릭 닫기. 키보드 대안은 ESC와 닫기 버튼 */}
      <div
        className="absolute inset-0 bg-surface-default-medium backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Card — 래퍼에 w-full을 줘야 카드의 max-w가 실제로 작동한다 */}
      <div className="modal-enter relative z-10 w-full max-w-190">{card}</div>
    </div>
  );
}

/* ───────────────── 소셜 아이콘 (각 사 브랜드 마크 — 크기는 시안 기준) ───────────────── */

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
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M15.03 12.62 8.78 3.5H4v17h4.97v-9.12l6.25 9.12H20v-17h-4.97v9.12z"
        />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
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
