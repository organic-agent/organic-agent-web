"use client";

/**
 * 랜딩 상단 바 — 로고 + (게스트) 로그인·회원가입 / (로그인) 소속 칩 + 프로필 아바타
 * 위치: src/app/_components/LandingNav.tsx
 *
 * 로그인 모달은 페이지가 하나만 들고 있다(대상 카드 버튼과 공유). 여기서는 열어 달라고만 한다.
 * 문구는 mode(로그인/회원가입)가, 로그인 뒤 목적지는 intent가 정한다 — nav에서는 역할을 모르니 couple.
 *
 * 로그인 상태의 소속 칩: 최근 활동 공간 이름 + 꼬리표(스튜디오 / 갤러리 / 외 n). 누르면 그 공간으로.
 * 소속이 없으면 "시작하기" → 역할 선택. 아바타를 누르면 프로필 메뉴가 펼쳐진다.
 *
 * 인증 복구 중: 지난 방문 때 보관한 이름 · 소속(lastUser)이 있으면 그것으로 칩과 아바타를 먼저 그리고,
 * 복구가 끝나면 받은 정보로 바꾼다(팀 노션 60번 — 요청 두 번을 기다리는 동안 회색 자리만 보였다).
 * 보관한 것이 없으면 자리표시자만 둔다. 먼저 그린 아바타는 메뉴가 없다 — 메뉴는 로그인이 확인된 뒤에만 연다.
 */

import Link from "next/link";
import { ProfileAvatarButton } from "@/components/app/ProfileAvatarButton";
import { BrandLogo } from "@/components/BrandLogo";
import { ArrowRightIcon } from "@/components/icons";
import type { LoginRequest } from "@/components/LoginModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/authStore";
import { useLastUser, type LastUser } from "@/lib/auth/lastUser";
import { spaceChip } from "@/lib/auth/loginFlow";

export function LandingNav({
  onOpenLogin,
}: {
  onOpenLogin: (req: LoginRequest) => void;
}) {
  const auth = useAuth();
  const lastUser = useLastUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-100 bg-background-default-main border-b border-divider-default">
      <div className="max-w-wrap mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-[10px]"
          aria-label="Easy Select 홈"
        >
          <BrandLogo size={32} className="text-contents-light-bgd-default shrink-0" />
          <b className="type-brand-wordmark text-contents-light-bgd-default">Easy Select</b>
        </Link>

        <nav className="flex items-center gap-2">
          {auth.status === "loading" ? (
            lastUser ? (
              <SpaceChipLink user={lastUser} pending />
            ) : (
              // 복구가 끝날 때까지 자리만 — 서버 렌더와 첫 클라이언트 렌더가 같은 모양이다
              <span
                aria-hidden
                className="h-10 w-50 rounded-(--pill) bg-surface-default-light"
              />
            )
          ) : auth.status === "guest" ? (
            <>
              <Button
                kind="ghost"
                onClick={() => onOpenLogin({ mode: "login", intent: "couple" })}
              >
                로그인
              </Button>
              <Button
                onClick={() => onOpenLogin({ mode: "signup", intent: "couple" })}
              >
                회원가입
              </Button>
            </>
          ) : (
            <SpaceChipLink user={auth.user} />
          )}
        </nav>
      </div>
    </header>
  );
}

/** pending이면 로그인 확인 전 — 보관한 정보로 그린 것이라 아바타는 메뉴 없이 모양만 둔다 */
function SpaceChipLink({ user, pending = false }: { user: LastUser; pending?: boolean }) {
  const chip = spaceChip(user);
  return (
    <>
      <Link
        href={chip.href}
        className="inline-flex h-10 items-center gap-2 rounded-(--pill) border border-border-default pl-3.5 pr-1.5 type-label-medium-m text-contents-light-bgd-default transition-colors duration-fast hover:border-brand-secondary-light hover:bg-brand-secondary-background"
      >
        <span className="max-w-40 truncate">{chip.label}</span>
        {chip.tag && (
          <span className="rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-medium-xs text-brand-secondary-dark">
            {chip.tag}
          </span>
        )}
        <ArrowRightIcon size={18} className="text-contents-light-bgd-weakness" />
      </Link>
      {pending ? (
        <span className="grid size-10 place-items-center">
          <Avatar initial={user.nickname.trim().slice(0, 1) || "?"} />
        </span>
      ) : (
        <ProfileAvatarButton />
      )}
    </>
  );
}
