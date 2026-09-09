"use client";

/**
 * 인증 가드 — 로그인한 사람만 지나가는 문
 * 위치: src/components/AuthGuard.tsx
 *
 * 앱 화면(스튜디오·클라이언트·온보딩) 레이아웃이 children을 이걸로 감싼다.
 *  - loading: 부팅 복구(restoreSession)가 끝날 때까지 기다린다. 여기서 guest로
 *    속단하면 로그인돼 있던 사용자가 랜딩으로 튕기는 깜빡임이 생긴다.
 *  - guest: 랜딩으로 보낸다. 로그인은 랜딩 상단의 로그인·회원가입에서 시작한다.
 *  - authenticated: 그대로 보여준다.
 * 세션이 만료돼 재발급이 죽으면 refreshTokens가 guest로 바꾸고, 그 순간 여기서 잡힌다.
 *
 * 서버 스냅샷은 항상 loading이라 서버 렌더와 클라이언트 첫 렌더가 같은 문구를 그린다.
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authStore";

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "guest") router.replace("/");
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return (
      <main className="grid min-h-dvh place-items-center bg-background-default-main">
        <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">
          {auth.status === "loading"
            ? "로그인 상태를 확인하고 있어요…"
            : "로그인이 필요해요. 홈으로 이동합니다…"}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
