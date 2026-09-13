"use client";

/**
 * 게스트 상단바 — 로고 | 가운데 작은 제목(그리드 화면만) | 프로필(이름 바꾸기 · 링크 복사)
 * 위치: src/app/(guest)/collab/[token]/_shell/GuestTopbar.tsx
 *
 * 알림 없음(2026-09-13). 로고는 링크가 아니다 — 게스트를 서비스 밖으로 보내지 않는다. 홈(표지 헤더)에서는 가운데를 비우고,
 * 그리드 화면에서만 갤러리 이름을 작게 둔다.
 */

import { useEffect, useId, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { CheckCircleIcon, EditIcon, LinkIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { guestInitial } from "./randomName";

export function GuestTopbar({ mid, nickname, onRename }: { mid?: string | null; nickname: string | null; onRename?: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
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
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      setOpen(false);
    }
  }

  return (
    <header className="grid h-13 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-divider-default bg-background-default-main px-4 pr-3">
      <span className="flex items-center gap-2 text-contents-light-bgd-default">
        <BrandLogo size={26} />
        <b className="type-brand-wordmark">Easy Select</b>
      </span>
      <span className="truncate type-content-s text-contents-light-bgd-weakness">{mid ?? ""}</span>
      <div className="flex items-center justify-end">
        {nickname && (
          <div ref={wrapRef} className="relative">
            <button
              type="button"
              aria-label="프로필 메뉴"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              onClick={() => setOpen((v) => !v)}
              className={`grid size-10 cursor-pointer place-items-center rounded-full transition-colors duration-fast hover:bg-surface-default-lightness ${open ? "bg-surface-default-lightness" : ""}`}
            >
              <Avatar initial={guestInitial(nickname)} className="bg-brand-secondary-background text-brand-secondary-dark" />
            </button>
            {open && (
              <div id={menuId} role="menu" className="absolute right-0 top-full z-30 mt-1 w-60 rounded-(--radius-12) border border-border-default bg-background-default-main p-1.5 shadow-(--shadow-modal)">
                <div className="flex items-center gap-2.5 border-b border-divider-default px-2.5 pt-1.5 pb-2.5">
                  <Avatar initial={guestInitial(nickname)} large className="bg-brand-secondary-background text-brand-secondary-dark" />
                  <b className="truncate type-label-semibold-m text-contents-light-bgd-default">{nickname}</b>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onRename?.();
                  }}
                  className="mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) px-2.5 py-2 text-left type-content-m text-contents-light-bgd-default hover:bg-surface-default-lightness"
                >
                  <EditIcon size={18} className="text-contents-light-bgd-sub" />
                  이름 바꾸기
                </button>
                <button type="button" role="menuitem" onClick={() => void copyLink()} className="flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) px-2.5 py-2 text-left type-content-m text-contents-light-bgd-default hover:bg-surface-default-lightness">
                  {copied ? <CheckCircleIcon size={18} className="text-brand-secondary-dark" /> : <LinkIcon size={18} className="text-contents-light-bgd-sub" />}
                  {copied ? "복사됨" : "이 앨범 링크 복사"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
