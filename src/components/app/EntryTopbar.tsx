"use client";

/**
 * 진입 화면 상단바 — 로고 + 알림 종 + 프로필 아바타 자리
 * 위치: src/components/app/EntryTopbar.tsx
 *
 * 역할 선택·초대 수락·설정·워크스페이스처럼 아직 어느 공간에도 들어가지 않은 화면이 쓴다.
 * 아바타(ProfileAvatarButton)를 누르면 프로필 메뉴가 펼쳐진다. 알림 종은 로그인했을 때만 —
 * 설정의 "알림은 오른쪽 위 종 아이콘에서 볼 수 있어요"가 어디서나 맞게(문구 점검 A02, 2026-10-06).
 */

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { ProfileAvatarButton } from "@/components/app/ProfileAvatarButton";
import type { UserNotificationResponse } from "@/lib/api/notifications";
import { useAuth } from "@/lib/auth/authStore";

export function EntryTopbar() {
  const auth = useAuth();
  const workspaces = auth.status === "authenticated" ? auth.user.workspaces : [];
  /** 어느 공간에도 들어가 있지 않으니 소속 목록으로 가른다 — 내 소속에 그 갤러리가 있으면 클라이언트 갤러리, 아니면 작가 갤러리 */
  function hrefFor(n: UserNotificationResponse): string | null {
    if (n.scopeId === null) return null;
    if (n.scope === "STUDIO") return `/studio/${n.scopeId}`;
    if (n.scope !== "GALLERY") return null;
    return workspaces.some((w) => w.kind === "GALLERY" && w.galleryId === n.scopeId) ? `/gallery/${n.scopeId}` : `/studio/gallery/${n.scopeId}`;
  }
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
        <div className="flex items-center gap-1">
          {auth.status === "authenticated" && <NotificationBell hrefFor={hrefFor} />}
          <ProfileAvatarButton />
        </div>
      </div>
    </header>
  );
}
