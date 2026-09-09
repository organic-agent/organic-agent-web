"use client";

/**
 * 프로필 아바타 버튼 — 누르면 아래로 프로필 메뉴가 펼쳐진다
 * 위치: src/components/app/ProfileAvatarButton.tsx
 *
 * 로그인 사용자 전용이라 인증 상태에서 이름을 읽는다. 바깥 클릭과 ESC로 닫히고,
 * 열림 상태를 aria-expanded로 알린다. current를 주면 메뉴가 그 공간에 "현재"를 표시한다.
 */

import { useEffect, useId, useRef, useState } from "react";
import { ProfileMenu, type CurrentSpace } from "@/components/app/ProfileMenu";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth/authStore";

export function ProfileAvatarButton({ current }: { current?: CurrentSpace }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (auth.status !== "authenticated") return null;
  const user = auth.user;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="프로필 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`grid size-10 cursor-pointer place-items-center rounded-full transition-colors duration-fast hover:bg-surface-default-lightness ${
          open ? "bg-surface-default-lightness" : ""
        }`}
      >
        <Avatar initial={user.nickname.trim().slice(0, 1) || "?"} />
      </button>
      {open && (
        <ProfileMenu id={menuId} user={user} current={current} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
