/**
 * 작가 — 스튜디오 탑바 (피그마 Photographer/Topbar 대응)
 * 위치: src/components/photographer/StudioTopbar.tsx
 *
 * 좌: 로고 락업(홈 링크 겸직) / 우: 알림 · 프로필. 홈에는 사이드바가 없어 메뉴 버튼도 없다.
 */

import Link from "next/link";
import { NotificationBell } from "@/components/app/NotificationBell";
import { BrandLogo } from "@/components/BrandLogo";
import { Avatar } from "@/components/ui/Avatar";

export function StudioTopbar({ studioInitial }: { studioInitial: string }) {
  return (
    <header className="border-b border-divider-default bg-background-default-main">
      <div className="mx-auto flex h-12 w-full max-w-wrap items-center justify-between px-6">
        <Link
          href="/galleries"
          className="flex items-center gap-2 text-contents-light-bgd-default"
        >
          <BrandLogo size={32} />
          <b className="type-brand-wordmark">Easy Select</b>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Avatar initial={studioInitial} />
        </div>
      </div>
    </header>
  );
}
