"use client";

/**
 * 사이드바 접힘 상태 공급자 (쿠키 기반)
 * 위치: src/components/SidebarProvider.tsx
 *
 * 서버 레이아웃이 쿠키에서 읽은 초기값(initialCollapsed)을 받아 Context로 내려준다.
 */

import { createContext, useContext, useState } from "react";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

const ONE_YEAR = 60 * 60 * 24 * 365;

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
});

export function SidebarProvider({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      // 다음 새로고침 때 서버가 읽도록 쿠키에 저장(1년 유지).
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
      return next;
    });
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

// AppSidebar 등에서 접힘 상태와 토글 함수를 가져온다.
export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}
