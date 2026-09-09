"use client";

/**
 * 프로필 아바타 버튼 — 상단바 오른쪽의 자리
 * 위치: src/components/app/ProfileAvatarButton.tsx
 *
 * 아직 자리만 있다. 아래로 펼쳐지는 프로필 메뉴(이름·이메일·워크스페이스 스위처·
 * 다크 토글·설정·로그아웃)는 다음 PR에서 이 버튼에 붙는다.
 */

import { Avatar } from "@/components/ui/Avatar";

export function ProfileAvatarButton({ initial }: { initial: string }) {
  return (
    <button
      type="button"
      aria-label="프로필 메뉴"
      aria-haspopup="menu"
      aria-expanded={false}
      className="grid size-10 cursor-pointer place-items-center rounded-full transition-colors duration-fast hover:bg-surface-default-lightness"
    >
      <Avatar initial={initial} />
    </button>
  );
}

/** 닉네임 첫 글자 — 비어 있으면 물음표 */
export function initialOf(nickname: string | undefined): string {
  return nickname?.trim().slice(0, 1) || "?";
}
