"use client";

/**
 * 하단 바 — 항상 있음. 왼쪽 상태 · 오른쪽 주 버튼(디자이너 CTA: 40px · 라운드 8 · 14px 글자)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar.tsx
 *
 * 오른쪽은 "상태(선택한 사진 n / 50 + 썸네일)" | 보조 버튼(연올리브) + 주 버튼(검정) 순(디자이너 문법).
 * 사진을 고르면 선택 액션바(n장 선택 · 폴더로 이동 · 선택 해제 · 모두 선택 · 삭제)로 바뀐다 — 흰 배경(순서 2026-09-11 수민).
 * "모두 선택"은 지금 보고 있는 사진 전부(폴더 · 필터 범위)를 고른다(2026-09-11 수민 선택: 액션바 자리, ⌘/Ctrl+A도 같음).
 * 휴지통 화면은 두지 않기로 해서(2026-09-11) 삭제는 휴지통 이동만(복원 UI 없음, 서버 보관 뒤 자동 삭제).
 * 업로드 · AI 분석 진행 막대(progress)는 왼쪽 문구(hint) 자리를 대신한다.
 */

import type { ReactNode } from "react";
import { DeleteForeverIcon, SelectAllIcon } from "@/components/icons";

export function ShellCta({
  children,
  kind = "primary",
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  kind?: "primary" | "secondary" | "ghost";
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
          : kind === "secondary"
            ? "bg-brand-secondary-background text-contents-light-bgd-default hover:bg-brand-secondary-surface1 disabled:bg-surface-default-light disabled:text-contents-light-bgd-disabled"
            : "text-contents-light-bgd-default hover:bg-surface-default-lightness disabled:text-contents-light-bgd-disabled"
      }`}
    >
      {children}
    </button>
  );
}

export function ShellBottomBar({
  selectionCount,
  visibleCount,
  onSelectAll,
  onClearSelection,
  onMoveSelection,
  onDeleteSelection,
  hint,
  progress,
  status,
  actions,
}: {
  selectionCount: number;
  /** 지금 보고 있는 사진 수 — 전부 골라졌으면 "모두 선택"을 숨긴다 */
  visibleCount?: number;
  /** 보고 있는 사진 전부 고르기 */
  onSelectAll?: () => void;
  onClearSelection: () => void;
  onMoveSelection: () => void;
  onDeleteSelection: () => void;
  /** 선택이 없을 때 왼쪽 문구 */
  hint: ReactNode;
  /** 있으면 왼쪽 문구 대신 진행 막대(업로드 · AI 분석) */
  progress?: ReactNode;
  /** 오른쪽 상태 표시(선택한 사진 n / 50 + 썸네일) — 버튼 앞, 구분선으로 나뉨 */
  status?: ReactNode;
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
          <ShellCta kind="ghost" onClick={onClearSelection}>
            선택 해제
          </ShellCta>
          {onSelectAll && visibleCount !== undefined && selectionCount < visibleCount && (
            <ShellCta kind="ghost" onClick={onSelectAll}>
              <SelectAllIcon size={18} />
              모두 선택 ({visibleCount})
            </ShellCta>
          )}
          <button
            type="button"
            onClick={onDeleteSelection}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-(--radius-8) px-4 type-label-medium-m text-function-error-default transition-colors duration-fast hover:bg-function-error-background"
          >
            <DeleteForeverIcon size={18} />
            삭제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-15 shrink-0 items-center justify-between gap-3 border-t border-divider-default bg-background-default-main px-5">
      {progress ? (
        <div className="flex min-w-0 flex-1 items-center gap-6">{progress}</div>
      ) : (
        <span className="min-w-0 truncate type-content-s text-contents-light-bgd-sub">{hint}</span>
      )}
      <div className="flex shrink-0 items-center gap-2.5">
        {status}
        {status && actions && <span aria-hidden className="mx-0.5 h-6 w-px bg-border-default" />}
        {actions}
      </div>
    </div>
  );
}
