"use client";

/**
 * 프로필 메뉴 — 피그마 Menu/Profile 대응 (260px 팝업)
 * 위치: src/components/guest/ProfileMenu.tsx
 *
 * 계정 항목들은 OAuth·계정 기능 연동 전까지 준비 중 토스트만 띄운다.
 */

import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { Avatar } from "@/components/ui/Avatar";
import { MenuItem } from "@/components/ui/MenuItem";

function Divider() {
  return <div className="h-px w-full shrink-0 bg-divider-default" />;
}

export function ProfileMenu({
  name,
  email,
  initial,
}: {
  name: string;
  email: string;
  initial: string;
}) {
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  return (
    <div className="absolute right-0 top-full z-50 mt-2 flex w-65 flex-col gap-2 rounded-(--radius-12) border border-border-default bg-background-default-main p-3 shadow-(--shadow-modal)">
      <div className="flex w-full items-center gap-3">
        <Avatar initial={initial} large />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate type-content-l text-contents-light-bgd-default">{name}</p>
          <p className="truncate type-content-xs text-contents-light-bgd-default">{email}</p>
        </div>
      </div>
      <Divider />
      <div className="flex w-full flex-col gap-1">
        <MenuItem label="언어 변경" onClick={showComingSoon} />
        <MenuItem label="계정 정보" onClick={showComingSoon} />
        <MenuItem label="프로필 사진 편집" onClick={showComingSoon} />
      </div>
      <Divider />
      <MenuItem label="로그아웃" onClick={() => {}} />
      {comingSoonToast}
    </div>
  );
}
