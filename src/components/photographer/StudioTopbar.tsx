"use client";

/**
 * 작가 — 스튜디오 탑바 (와이어프레임 03 스튜디오 화면)
 * 위치: src/components/photographer/StudioTopbar.tsx
 *
 * 좌: 로고 락업(랜딩 링크) / 우: 초대 · 알림 · 프로필 메뉴. 홈에는 사이드바가 없어 메뉴 버튼도 없다.
 * 초대는 팀원(작가) 초대라 C2 범위 밖 — 자리만 두고 "준비 중" 토스트를 띄운다.
 * data-coach 속성은 첫 진입 코치마크(StudioCoachMarks)가 스포트라이트 대상을 찾는 표식이다.
 */

import Link from "next/link";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { NotificationBell } from "@/components/app/NotificationBell";
import { ProfileAvatarButton } from "@/components/app/ProfileAvatarButton";
import { BrandLogo } from "@/components/BrandLogo";
import { PersonAddIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";

export function StudioTopbar({
  workspaceId,
}: {
  /** 프로필 메뉴가 "현재"를 표시할 스튜디오. 아직 모르면 null */
  workspaceId: number | null;
}) {
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  return (
    <header className="border-b border-divider-default bg-background-default-main">
      <div className="mx-auto flex h-12 w-full max-w-wrap items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-contents-light-bgd-default">
          <BrandLogo size={32} />
          <b className="type-brand-wordmark">Easy Select</b>
        </Link>
        <div className="flex items-center gap-2">
          <div data-coach="invite" className="flex">
            <IconButton
              icon={<PersonAddIcon size={20} />}
              aria-label="팀원 초대"
              onClick={showComingSoon}
            />
          </div>
          <div data-coach="bell" className="flex">
            <NotificationBell />
          </div>
          <ProfileAvatarButton
            current={workspaceId !== null ? { kind: "STUDIO", workspaceId } : undefined}
          />
        </div>
      </div>
      {comingSoonToast}
    </header>
  );
}
