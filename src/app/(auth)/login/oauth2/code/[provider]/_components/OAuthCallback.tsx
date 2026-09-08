"use client";

/**
 * OAuth 콜백 처리 — 인가 코드를 우리 토큰으로 교환하고 목적지로 보낸다
 * 위치: src/app/(auth)/login/oauth2/code/[provider]/_components/OAuthCallback.tsx
 *
 * 세 갈래를 모두 다룬다:
 *  ① provider가 에러를 돌려보냄(취소 등) → /login?error= 로 복귀
 *  ② 교환 실패(무효 코드 등) → 같은 방식으로 복귀
 *  ③ 성공 → 토큰 저장, 인증 상태 전환, 목적지로 이동
 * 복귀할 땐 컨텍스트(역할·inviteToken)를 쿼리로 복원해 재시도가 이어지게 한다.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe, login, type OAuthProvider } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { setAuthenticated } from "@/lib/auth/authStore";
import { readLoginContext, resolveDestination } from "@/lib/auth/loginFlow";
import { setTokens } from "@/lib/auth/tokenStore";

// 인가 코드는 일회용이다. StrictMode(개발)가 effect를 두 번 돌려 같은 코드로
// 두 번 교환하면 두 번째가 반드시 실패해 "성공했는데 에러"가 되므로,
// 한 번 다룬 코드는 다시 교환하지 않는다.
const handledCodes = new Set<string>();

export function OAuthCallback({
  provider,
  code,
  state,
  error,
}: {
  provider: OAuthProvider;
  code: string | null;
  state: string | null;
  error: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const ctx = readLoginContext();

    function backToLogin(errorCode: string) {
      const query = new URLSearchParams({
        role: ctx?.intent === "studio" ? "photographer" : "couple",
        error: errorCode,
      });
      if (ctx?.inviteToken) query.set("inviteToken", ctx.inviteToken);
      router.replace(`/login?${query.toString()}`);
    }

    if (error) {
      backToLogin(error);
      return;
    }
    if (!code) {
      backToLogin("missing_code");
      return;
    }
    if (handledCodes.has(code)) return;
    handledCodes.add(code);

    (async () => {
      try {
        const result = await login(provider, { code, state });
        setTokens(result);
        const user = await getMe();
        setAuthenticated(user);
        router.replace(
          resolveDestination(result.galleryId, user, ctx?.intent ?? "couple"),
        );
      } catch (err) {
        backToLogin(err instanceof ApiError ? err.code : "network");
      }
    })();
  }, [provider, code, state, error, router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background-default-main">
      <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">
        로그인하고 있어요…
      </p>
    </main>
  );
}
