"use client";

/**
 * 프로필 메뉴 — 아바타 아래로 펼쳐지는 패널 (M1 한 덩어리)
 * 위치: src/components/app/ProfileMenu.tsx
 *
 * 이름·이메일 → 워크스페이스(최근 활동순 4개, 현재 공간 표시) → 모두 보기(5개 이상) →
 * 새 공간 만들기 → 다크 모드 토글 → 설정(/settings) → 로그아웃.
 * 열고 닫는 것과 바깥 클릭·ESC는 ProfileAvatarButton이 맡는다.
 */

import { useRouter } from "next/navigation";
import {
  DarkModeIcon,
  GridViewIcon,
  HeartIcon,
  LightModeIcon,
  LogoutIcon,
  PhotoIcon,
  PlusIcon,
  SettingIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { MenuItem } from "@/components/ui/MenuItem";
import type { User, UserWorkspace } from "@/lib/api/auth";
import { sortByRecentActivity, workspacePath } from "@/lib/auth/loginFlow";
import { logout } from "@/lib/auth/logout";
import { useTheme } from "@/lib/theme";

/** 지금 보고 있는 공간 — 메뉴가 "현재"를 표시하는 기준 */
export type CurrentSpace =
  | { kind: "STUDIO"; workspaceId: number }
  | { kind: "GALLERY"; galleryId: number };

const MAX_LISTED = 4;

function isCurrent(space: UserWorkspace, current: CurrentSpace | undefined): boolean {
  if (!current || space.kind !== current.kind) return false;
  return current.kind === "STUDIO"
    ? space.workspaceId === current.workspaceId
    : space.galleryId === current.galleryId;
}

function Divider() {
  return <div className="my-1 h-px w-full shrink-0 bg-divider-default" />;
}

const ROLE_LABEL: Record<UserWorkspace["role"], string> = { OWNER: "소유자", MEMBER: "멤버" };

/** 워크스페이스 한 줄 — 올리브 칩 아이콘 + 이름 + (종류 · 역할), 현재 공간이면 오른쪽에 "현재" */
function SpaceItem({
  space,
  current,
  onClick,
}: {
  space: UserWorkspace;
  current: boolean;
  onClick: () => void;
}) {
  const Icon = space.kind === "STUDIO" ? PhotoIcon : HeartIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "true" : undefined}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) px-2 py-2 text-left transition-colors duration-fast ease-out hover:bg-surface-default-lightness ${
        current ? "bg-surface-default-lightness" : ""
      }`}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-(--radius-8) bg-brand-secondary-background text-brand-secondary-default">
        <Icon size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate type-label-medium-m text-contents-light-bgd-default">
          {space.name}
        </span>
        <span className="type-content-xs text-contents-light-bgd-weakness">
          {space.kind === "STUDIO" ? "스튜디오" : "갤러리"} · {ROLE_LABEL[space.role]}
        </span>
      </span>
      {current && (
        <span className="shrink-0 rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-medium-xs text-brand-secondary-dark">
          현재
        </span>
      )}
    </button>
  );
}

export function ProfileMenu({
  id,
  user,
  current,
  onClose,
}: {
  id: string;
  user: User;
  current?: CurrentSpace;
  onClose: () => void;
}) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const spaces = sortByRecentActivity(user.workspaces ?? []);
  const listed = spaces.slice(0, MAX_LISTED);
  const dark = theme === "dark";

  function go(path: string) {
    onClose();
    router.push(path);
  }

  async function handleLogout() {
    onClose();
    await logout();
    router.replace("/");
  }

  return (
    <div
      id={id}
      aria-label="프로필 메뉴"
      className="absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-1 rounded-(--radius-12) border border-border-default bg-background-default-main p-2 shadow-(--shadow-modal)"
    >
      {/* 계정 */}
      <div className="flex items-center gap-3 px-2 pt-1.5 pb-2">
        <Avatar initial={user.nickname.trim().slice(0, 1) || "?"} large />
        <div className="flex min-w-0 flex-col">
          <p className="truncate type-label-semibold-m text-contents-light-bgd-default">
            {user.nickname}
          </p>
          {user.email && (
            <p className="truncate type-content-xs text-contents-light-bgd-weakness">
              {user.email}
            </p>
          )}
        </div>
      </div>
      <Divider />

      {/* 워크스페이스 */}
      <p className="px-3 pt-1 pb-0.5 type-label-eyebrow text-contents-light-bgd-weakness">
        워크스페이스
      </p>
      {listed.map((space) => (
        <SpaceItem
          key={space.id}
          space={space}
          current={isCurrent(space, current)}
          onClick={() => go(workspacePath(space))}
        />
      ))}
      {spaces.length > MAX_LISTED && (
        <MenuItem
          label={`모두 보기 (${spaces.length})`}
          icon={<GridViewIcon size={20} />}
          onClick={() => go("/workspace")}
        />
      )}
      <MenuItem
        label="새 공간 만들기"
        icon={<PlusIcon size={20} />}
        onClick={() => go("/onboarding/role")}
      />
      <Divider />

      {/* 화면·계정 */}
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        onClick={toggle}
        className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-3 py-2 text-left transition-colors duration-fast ease-out hover:bg-surface-default-lightness"
      >
        <span className="flex shrink-0 items-center justify-center text-contents-light-bgd-default">
          {dark ? <DarkModeIcon size={20} /> : <LightModeIcon size={20} />}
        </span>
        <span className="flex-1 type-content-m text-contents-light-bgd-default">다크 모드</span>
        <span
          aria-hidden
          className={`relative h-5 w-9 shrink-0 rounded-(--pill) border transition-colors duration-fast ${
            dark
              ? "border-brand-secondary-default bg-brand-secondary-default"
              : "border-border-default bg-surface-default-light"
          }`}
        >
          <span
            className={`absolute top-0.5 size-3.5 rounded-full bg-background-default-main shadow-(--shadow-hover) transition-[left] duration-fast ${
              dark ? "left-4.5" : "left-0.5"
            }`}
          />
        </span>
      </button>
      <MenuItem
        label="설정"
        icon={<SettingIcon size={20} />}
        onClick={() => {
          onClose();
          // 설정의 "돌아가기"가 여기로 돌아오도록 현재 위치를 실어 보낸다
          const from = `${window.location.pathname}${window.location.search}`;
          router.push(`/settings?from=${encodeURIComponent(from)}`);
        }}
      />
      <Divider />
      {/* 로그아웃 — 되돌리기 어려운 동작이라 error 색으로 구분 */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-3 py-2 text-left text-function-error-default transition-colors duration-fast ease-out hover:bg-function-error-background"
      >
        <span className="flex shrink-0 items-center justify-center">
          <LogoutIcon size={20} />
        </span>
        <span className="flex-1 type-content-m">로그아웃</span>
      </button>
    </div>
  );
}
