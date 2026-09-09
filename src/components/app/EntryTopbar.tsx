"use client";

/**
 * 진입 화면 상단바 — 로고 + 프로필 아바타 자리
 * 위치: src/components/app/EntryTopbar.tsx
 *
 * 역할 선택·초대 수락처럼 아직 어느 공간에도 들어가지 않은 화면이 쓴다.
 * 아바타는 자리만 있다 — 아래로 펼쳐지는 프로필 메뉴(이름·스위처·다크 토글·로그아웃)는
 * 진입 흐름 7단계에서 공통 컴포넌트로 붙인다.
 */

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Avatar } from "@/components/ui/Avatar";

export function EntryTopbar({ initial }: { initial: string }) {
  return (
    <header className="border-b border-divider-default bg-background-default-main">
      <div className="mx-auto flex h-16 w-full max-w-wrap items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-contents-light-bgd-default"
          aria-label="Easy Select 홈"
        >
          <BrandLogo size={32} />
          <b className="type-brand-wordmark">Easy Select</b>
        </Link>
        <button
          type="button"
          aria-label="프로필 메뉴"
          aria-haspopup="menu"
          aria-expanded={false}
          className="grid size-10 cursor-pointer place-items-center rounded-full transition-colors duration-fast hover:bg-surface-default-lightness"
        >
          <Avatar initial={initial} />
        </button>
      </div>
    </header>
  );
}
