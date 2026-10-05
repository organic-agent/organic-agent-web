"use client";

/**
 * 부팅 시 세션 복구 실행자
 * 위치: src/components/AuthBootstrap.tsx
 *
 * 루트 레이아웃에 한 번 꽂혀 restoreSession()을 실행만 하고 아무것도 그리지
 * 않는다. 인증 상태는 authStore(모듈)에 있고 화면은 useAuth()로 구독하므로,
 * Context Provider처럼 children을 감쌀 필요가 없다 — 덕분에 루트 레이아웃은
 * 서버 컴포넌트로 남는다.
 *
 * 인증 상태를 따라 "지난 방문의 사용자 요약"(lastUser)도 맞춘다 — 로그인 · 복구 · 내 정보 갱신이
 * 될 때마다 적고, 토큰까지 없어진 게스트(로그아웃 · 로그인이 풀림)면 지운다. 토큰은 남았는데
 * 이번 부팅만 게스트인 경우(네트워크 실패)는 두었다가 다음 방문에 다시 쓴다.
 */

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/authStore";
import { forgetLastUser, rememberLastUser } from "@/lib/auth/lastUser";
import { restoreSession } from "@/lib/auth/restoreSession";
import { getRefreshToken } from "@/lib/auth/tokenStore";

export function AuthBootstrap() {
  const auth = useAuth();

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (auth.status === "authenticated") rememberLastUser(auth.user);
    else if (auth.status === "guest" && !getRefreshToken()) forgetLastUser();
  }, [auth]);

  return null;
}
