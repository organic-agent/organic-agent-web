"use client";

/**
 * 작가 — 스튜디오 탑바 (와이어프레임 03 스튜디오 화면)
 * 위치: src/components/photographer/StudioTopbar.tsx
 *
 * 좌: 로고 락업(랜딩 링크) / 우: 초대 · 알림 · 프로필 메뉴. 홈에는 사이드바가 없어 메뉴 버튼도 없다.
 * 초대는 팀원(작가) 초대 모달(StudioInviteModal)을 연다 — 열림 상태는 홈 페이지가 가진다.
 * data-coach 속성은 첫 진입 코치마크(StudioCoachMarks)가 스포트라이트 대상을 찾는 표식이다.
 */

import Link from "next/link";
import { NotificationBell } from "@/components/app/NotificationBell";
import { ProfileAvatarButton } from "@/components/app/ProfileAvatarButton";
import { BrandLogo } from "@/components/BrandLogo";
import { PersonAddIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";

export function StudioTopbar({
  workspaceId,
  onInviteClick,
}: {
  /** 프로필 메뉴가 "현재"를 표시할 스튜디오. 아직 모르면 null */
  workspaceId: number | null;
  /** 초대 버튼 — 팀원 초대 모달 열기 */
  onInviteClick: () => void;
}) {
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
              onClick={onInviteClick}
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
    </header>
  );
}
