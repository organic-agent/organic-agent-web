"use client";

/**
 * 사이드바 접힘 상태 공급자 (쿠키 기반)
 * 위치: src/components/SidebarProvider.tsx
 *
 * 서버 레이아웃이 쿠키에서 읽은 초기값(initialCollapsed)을 받아 Context로 내려준다.
 * hasPreference = 사용자가 한 번이라도 여닫아 쿠키가 있는지. 없으면 화면이 단계에 맞는 기본값을 고를 수 있다
 * (클라이언트 갤러리: 1단계 닫힘 · 2단계부터 열림 — 2026-09-12). setCollapsed는 그 기본값 적용용(쿠키 안 씀).
 * 640 미만에서는 사이드바가 본문 대신 화면을 채운다 — 항목을 고르면 closeIfNarrow로 닫아 사진으로 돌아간다(쿠키 안 씀).
 */

import { createContext, useContext, useState } from "react";
import { SIDEBAR_COOKIE, SIDEBAR_ONLY_QUERY } from "@/lib/sidebar";

/** 지금 화면이 "사이드바만 보이는 폭"인지 — 이벤트 핸들러 · 이펙트 안에서만 부른다(서버에는 window가 없다) */
export function isSidebarOnlyViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(SIDEBAR_ONLY_QUERY).matches;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
  /** 사용자가 직접 여닫은 기록(쿠키)이 있는지 */
  hasPreference: boolean;
  /** 화면이 정한 기본값 적용 — 쿠키는 쓰지 않는다(사용자 선호가 아니므로) */
  setCollapsed: (collapsed: boolean) => void;
  /** 좁은 화면(640 미만)에서 사이드바 항목을 골랐을 때 — 사이드바를 닫아 사진으로 돌아간다. 넓은 화면에서는 아무 일도 없다 */
  closeIfNarrow: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  hasPreference: false,
  setCollapsed: () => {},
  closeIfNarrow: () => {},
});

export function SidebarProvider({
  initialCollapsed,
  initialHasPreference = true,
  children,
}: {
  initialCollapsed: boolean;
  initialHasPreference?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [hasPreference, setHasPreference] = useState(initialHasPreference);

  function toggle() {
    setHasPreference(true);
    setCollapsed((prev) => {
      const next = !prev;
      // 다음 새로고침 때 서버가 읽도록 쿠키에 저장(1년 유지).
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
      return next;
    });
  }

  function closeIfNarrow() {
    if (isSidebarOnlyViewport()) setCollapsed(true);
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, hasPreference, setCollapsed, closeIfNarrow }}>
      {children}
    </SidebarContext.Provider>
  );
}

// 워크스페이스 사이드바·탑바에서 접힘 상태와 토글 함수를 가져온다.
export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}
