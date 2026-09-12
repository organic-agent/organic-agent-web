"use client";

/**
 * 갤러리 셸 상단바 — 한 줄 (구조 확정 2026-09-11)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellTopbar.tsx
 *
 * 좌: 사이드바 토글(≡) · 로고(랜딩) | 스튜디오명(홈) / 중앙: D-day 칩 + 현재 단계명 /
 * 우: 클라이언트 초대(소유자만) · 알림 · 프로필. D-day는 선택 마감 기준.
 * 클라이언트 셸도 같이 쓴다 — studioName을 주지 않으면 로고만(2026-09-11 수민), 알림 링크는 hrefFor로.
 */

import Link from "next/link";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { NotificationBell } from "@/components/app/NotificationBell";
import type { UserNotificationResponse } from "@/lib/api/notifications";
import { ProfileAvatarButton } from "@/components/app/ProfileAvatarButton";
import { BrandLogo } from "@/components/BrandLogo";
import { MenuIcon, PersonAddIcon, ScheduleIcon } from "@/components/icons";
import { useSidebar } from "@/components/SidebarProvider";
import { IconButton } from "@/components/ui/IconButton";

function ddayLabel(deadline: string | null): string {
  const offset = deadlineOffset(deadline);
  if (offset === null) return "기한 없음";
  if (offset < 0) return `D-${-offset}`;
  if (offset === 0) return "D-day";
  return `+${offset}일`;
}

export function ShellTopbar({
  studioName,
  studioHref,
  workspaceId = null,
  stageLabel,
  deadline,
  onInviteClick,
  notificationHrefFor,
}: {
  /** 없으면 로고만(클라이언트 셸) */
  studioName?: string;
  studioHref?: string;
  workspaceId?: number | null;
  stageLabel: string;
  deadline: string | null;
  /** 소유자가 아니면 주지 않는다 — 버튼 숨김 */
  onInviteClick?: () => void;
  /** 알림 행을 눌렀을 때 갈 주소 — 클라이언트는 /gallery/{id} */
  notificationHrefFor?: (n: UserNotificationResponse) => string | null;
}) {
  const { collapsed, toggle } = useSidebar();

  return (
    <header className="grid h-13 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-divider-default bg-background-default-main px-2 pr-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <IconButton
          icon={<MenuIcon size={20} />}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          onClick={toggle}
          className={collapsed ? "" : "bg-brand-secondary-background"}
        />
        <Link href="/" className="ml-1 flex items-center gap-2 text-contents-light-bgd-default">
          <BrandLogo size={26} />
          <b className="type-brand-wordmark">Easy Select</b>
        </Link>
        {studioName && studioHref && (
          <>
            <span aria-hidden className="mx-2 h-4.5 w-px bg-border-default" />
            <Link
              href={studioHref}
              className="truncate type-label-medium-m text-contents-light-bgd-default transition-colors duration-fast hover:text-brand-secondary-dark"
            >
              {studioName}
            </Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap type-content-m text-contents-light-bgd-default">
        <span className="inline-flex items-center gap-1 rounded-(--pill) bg-brand-secondary-background px-2.5 py-0.5 type-label-medium-s text-brand-secondary-dark">
          <ScheduleIcon size={14} />
          {ddayLabel(deadline)}
        </span>
        <span>{stageLabel}</span>
      </div>

      <div className="flex items-center justify-end gap-1">
        {onInviteClick && (
          <IconButton
            icon={<PersonAddIcon size={20} />}
            aria-label="클라이언트 초대"
            onClick={onInviteClick}
          />
        )}
        <NotificationBell hrefFor={notificationHrefFor} />
        <ProfileAvatarButton
          current={workspaceId !== null ? { kind: "STUDIO", workspaceId } : undefined}
        />
      </div>
    </header>
  );
}
