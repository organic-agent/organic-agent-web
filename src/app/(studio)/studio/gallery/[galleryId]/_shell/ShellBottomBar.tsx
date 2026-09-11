"use client";

/**
 * 하단 바 — 항상 있음. 왼쪽 상태 · 오른쪽 주 버튼(디자이너 CTA: 40px · 라운드 8 · 14px 글자)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar.tsx
 *
 * 사진을 고르면 선택 액션바(n장 선택 · 폴더로 이동 · 삭제 · 선택 해제)로 바뀐다 — 흰 배경.
 * 휴지통 화면은 두지 않기로 해서(2026-09-11) 삭제는 갤러리와 같이 완전 삭제로 갈 예정(B2).
 * 업로드 진행 막대는 B2에서 왼쪽 자리에 들어온다.
 */

import type { ReactNode } from "react";
import { DeleteForeverIcon } from "@/components/icons";

export function ShellCta({
  children,
  kind = "primary",
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  kind?: "primary" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-(--radius-8) px-6 type-label-medium-m whitespace-nowrap transition-colors duration-fast disabled:cursor-not-allowed ${
        kind === "primary"
          ? "bg-brand-primary-default text-contents-dark-bgd-default hover:bg-brand-primary-light disabled:bg-surface-default-light disabled:text-contents-light-bgd-disabled"
          : "text-contents-light-bgd-default hover:bg-surface-default-lightness disabled:text-contents-light-bgd-disabled"
      }`}
    >
      {children}
    </button>
  );
}

export function ShellBottomBar({
  selectionCount,
  onClearSelection,
  onMoveSelection,
  onDeleteSelection,
  hint,
  actions,
}: {
  selectionCount: number;
  onClearSelection: () => void;
  onMoveSelection: () => void;
  onDeleteSelection: () => void;
  /** 선택이 없을 때 왼쪽 문구 */
  hint: ReactNode;
  /** 선택이 없을 때 오른쪽 버튼들 */
  actions: ReactNode;
}) {
  if (selectionCount > 0) {
    return (
      <div className="flex h-15 shrink-0 items-center justify-between gap-3 border-t border-divider-default bg-background-default-main px-5">
        <span className="type-content-m text-contents-light-bgd-sub">
          <b className="type-label-semibold-l text-contents-light-bgd-default">{selectionCount}장</b> 선택
        </span>
        <div className="flex items-center gap-1">
          <ShellCta kind="ghost" onClick={onMoveSelection}>
            폴더로 이동
          </ShellCta>
          <button
            type="button"
            onClick={onDeleteSelection}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-(--radius-8) px-4 type-label-medium-m text-function-error-default transition-colors duration-fast hover:bg-function-error-background"
          >
            <DeleteForeverIcon size={18} />
            삭제
          </button>
          <ShellCta kind="ghost" onClick={onClearSelection}>
            선택 해제
          </ShellCta>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-15 shrink-0 items-center justify-between gap-3 border-t border-divider-default bg-background-default-main px-5">
      <span className="min-w-0 truncate type-content-s text-contents-light-bgd-sub">{hint}</span>
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    </div>
  );
}
