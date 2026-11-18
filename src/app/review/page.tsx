"use client";

/**
 * 심사용 링크 — 소셜 로그인 없이 심사용 개인 계정으로 바로 들어온다(서버 #407)
 * 위치: src/app/review/page.tsx
 *
 * 링크는 /review#code=… 이다. 코드를 # 조각에 두는 것은 쿠폰 링크와 같은 이유다 — 서버 · 분석 도구 로그에 남지 않는다.
 * 코드로 받은 토큰은 소셜 로그인 콜백과 같은 방식으로 저장하고, 같은 규칙(resolveDestination)으로 목적지를 정한다.
 * 이미 다른 계정으로 로그인한 브라우저여도 심사용 계정으로 바꿔 들어간다 — 링크를 연 것 자체가 그 의도다.
 * 서버는 꺼짐 · 만료 · 틀린 코드를 가리지 않고 같은 404로 답하므로 화면도 한 문구로 알린다.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, reviewLogin } from "@/lib/api/auth";
import { setAuthenticated } from "@/lib/auth/authStore";
import { resolveDestination } from "@/lib/auth/loginFlow";
import { markReviewMode } from "@/lib/auth/reviewMode";
import { setTokens } from "@/lib/auth/tokenStore";
import { useCouponCodeFromHash } from "@/lib/useCouponCodeFromHash";

export default function ReviewLoginPage() {
  const router = useRouter();
  // # 조각의 code를 읽는 규칙이 쿠폰 링크와 같아 그 훅을 그대로 쓴다
  const { ready, code } = useCouponCodeFromHash();
  const [loginFailed, setLoginFailed] = useState(false);
  // StrictMode(개발)가 effect를 두 번 돌려도 한 번만 로그인한다
  const started = useRef(false);
  const failed = loginFailed || (ready && !code);

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;
    (async () => {
      try {
        const tokens = await reviewLogin(code);
        setTokens(tokens);
        markReviewMode();
        const user = await getMe();
        setAuthenticated(user);
        router.replace(resolveDestination({ inviteToken: null, user, intent: "personal" }));
      } catch {
        setLoginFailed(true);
      }
    })();
  }, [code, router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background-default-main px-4">
      {failed ? (
        <div className="max-w-sm text-center">
          <p className="type-content-m font-medium text-contents-light-bgd-default">심사용 링크를 열 수 없어요</p>
          <p className="mt-2 type-content-xs text-contents-light-bgd-sub">
            링크가 만료됐거나 주소가 잘렸을 수 있어요. 받은 링크를 처음부터 다시 열어 주세요.
          </p>
        </div>
      ) : (
        <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">심사용 계정으로 들어가고 있어요…</p>
      )}
    </main>
  );
}
