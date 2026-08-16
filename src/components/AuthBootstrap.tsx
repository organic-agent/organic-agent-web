"use client";

/**
 * 부팅 시 세션 복구 실행자
 * 위치: src/components/AuthBootstrap.tsx
 *
 * 루트 레이아웃에 한 번 꽂혀 restoreSession()을 실행만 하고 아무것도 그리지
 * 않는다. 인증 상태는 authStore(모듈)에 있고 화면은 useAuth()로 구독하므로,
 * Context Provider처럼 children을 감쌀 필요가 없다 — 덕분에 루트 레이아웃은
 * 서버 컴포넌트로 남는다.
 */

import { useEffect } from "react";
import { restoreSession } from "@/lib/auth/restoreSession";

export function AuthBootstrap() {
  useEffect(() => {
    void restoreSession();
  }, []);

  return null;
}
