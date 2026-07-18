"use client";

/**
 * 공용 사이드바 (접기/펴기 · 상태 기억)
 * 위치: src/components/AppSidebar.tsx
 *
 * 펼침(248px, 아이콘+글자) ↔ 접힘(72px, 아이콘만)을 오가며, 접힘 상태는 쿠키 기반 SidebarProvider(useSidebar)에서 가져온다.
 * 작가/부부 공용 컴포넌트로 menu·subtitle·user를 props로 받고, 모바일(md 미만)에서는 하단 네비를 따로 쓰므로 숨겨진다.
 */

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { useSidebar } from "@/components/SidebarProvider";

type MenuItem = {
  key: string;
  label: string;
  href: string;
  icon: string; // svg path d
  active?: boolean;
};

type Props = {
  menu: MenuItem[];
  subtitle?: { title: string; caption: string };
  user: { initial: string; name: string; role: string };
  /** 로고 클릭 시 이동할 첫 화면 (부부: /gallery, 작가: /galleries) */
  homeHref?: string;
};

export function AppSidebar({ menu, subtitle, user, homeHref = "#" }: Props) {
  // 접힘 상태는 SidebarProvider(쿠키 기반)에서 가져온다.
  // 서버가 쿠키를 읽어 첫 렌더부터 올바른 폭으로 그리므로
  // 새로고침 시 깜빡임·하이드레이션 불일치가 없다.
  const { collapsed, toggle } = useSidebar();

  const width = collapsed ? "w-[72px]" : "w-[248px]";

  return (
    <aside
      className={`hidden md:flex ${width} shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 ease-out sticky top-0 h-dvh`}
    >
      {/* 브랜드 + 토글 버튼 */}
      <div
        className={`h-16 flex items-center border-b border-line ${collapsed ? "justify-center px-0" : "justify-between px-6"}`}
      >
        {!collapsed && (
          <Link
            href={homeHref}
            className="flex items-center gap-2.5 min-w-0"
            aria-label="홈"
          >
            <BrandLogo size={26} className="shrink-0 text-ink" />
            <b className="font-display-en font-semibold text-[15px] text-ink truncate">
              Wedding Easy Select
            </b>
          </Link>
        )}
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-md grid place-items-center text-ink-3 hover:bg-paper-deep hover:text-ink transition-colors shrink-0"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          title={collapsed ? "펼치기" : "접기"}
        >
          {/* 접힘: 오른쪽 화살표 / 펼침: 왼쪽 화살표 (패널 아이콘) */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
            {collapsed ? (
              <path d="M14 9l3 3-3 3" />
            ) : (
              <path d="M16 9l-3 3 3 3" />
            )}
          </svg>
        </button>
      </div>

      {/* 서브타이틀 (부부: 커플명 / 작가: 생략 가능) — 접히면 숨김 */}
      {subtitle && !collapsed && (
        <div className="h-17 flex flex-col justify-center px-6 border-b border-line shrink-0">
          <p className="font-display-ko font-medium text-[15px] text-ink truncate">
            {subtitle.title}
          </p>
          <p className="text-[11px] text-ink-3 mt-0.5 truncate">
            {subtitle.caption}
          </p>
        </div>
      )}

      {/* 메뉴 */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-5 px-3">
        {menu.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-label={item.label}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center h-11 rounded-md text-sm mb-1 transition-colors ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            } ${item.active ? "bg-ink text-on-ink font-medium" : "text-ink-2 hover:bg-paper-deep"}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* 하단 프로필 */}
      <div
        className={`border-t border-line p-4 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div className="w-9 h-9 rounded-full bg-ink text-on-ink grid place-items-center text-[13px] font-medium shrink-0">
          {user.initial}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-ink-3 truncate">{user.role}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
