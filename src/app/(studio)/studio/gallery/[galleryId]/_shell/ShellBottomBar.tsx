"use client";

/**
 * 하단 바 — 항상 있음. 왼쪽 상태 · 오른쪽 주 버튼(디자이너 CTA: 40px · 라운드 8 · 14px 글자)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar.tsx
 *
 * 오른쪽은 "상태(선택한 사진 n / 50 + 썸네일)" | 보조 버튼(연올리브) + 주 버튼(검정) 순(디자이너 문법).
 * 사진을 고르면 선택 액션바(n장 선택 · 폴더로 이동 · 선택 해제 · 모두 선택 · 삭제)로 바뀐다 — 흰 배경(순서 2026-09-11 수민),
 * 버튼은 테두리형(outline — 투명 버튼은 눈에 안 띈다는 2026-09-12 피드백).
 * "모두 선택"은 지금 보고 있는 사진 전부(폴더 · 필터 범위)를 고른다(2026-09-11 수민 선택: 액션바 자리, ⌘/Ctrl+A도 같음).
 * 휴지통 화면은 두지 않기로 해서(2026-09-11) 삭제는 휴지통 이동만(복원 UI 없음, 서버 보관 뒤 자동 삭제).
 * 업로드 · AI 분석 진행 막대(progress)는 왼쪽 문구(hint) 자리를 대신한다.
 * 좁은 폭(QA 이슈 84): 버튼이 잘리지 않도록 왼쪽 안내 문구는 860 미만에서 숨긴다(알림 문구는 hintIsNotice로 남김).
 * 640 미만에서는 아이콘이 있는 보조 버튼이 아이콘만 남고 상태와 버튼 사이 구분선이 사라지며, 480 미만에서는 주 버튼이
 * 짧은 이름(short)을 쓰고 좌우 여백이 12px로 준다.
 */

import { Children, isValidElement, type ReactNode } from "react";
import { DeleteForeverIcon, SelectAllIcon } from "@/components/icons";

/** 버튼 내용이 "아이콘 + 글자"인지 — 맨 앞이 요소(아이콘)이고 나머지가 전부 글자 · 숫자일 때만 */
function splitIconLabel(children: ReactNode): { icon: ReactNode; label: string } | null {
  const parts = Children.toArray(children);
  if (parts.length < 2 || !isValidElement(parts[0])) return null;
  const rest = parts.slice(1);
  if (!rest.every((part) => typeof part === "string" || typeof part === "number")) return null;
  const label = rest.join("").trim();
  return label ? { icon: parts[0], label } : null;
}

export function ShellCta({
  children,
  kind = "primary",
  disabled = false,
  onClick,
  short,
}: {
  children: ReactNode;
  kind?: "primary" | "secondary" | "outline" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
  /** 480 미만에서 대신 쓸 짧은 이름("작가에게 전달하기" → "전달하기") — 내용이 글자뿐인 버튼에 준다 */
  short?: string;
}) {
  // 주 버튼이 아니고 "아이콘 + 글자"면 640 미만에서 아이콘만 남긴다 — 글자는 이름(aria-label · title)으로 옮긴다
  const iconLabel = kind === "primary" ? null : splitIconLabel(children);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={iconLabel?.label}
      title={iconLabel?.label}
      className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-(--radius-8) px-6 type-label-medium-m whitespace-nowrap transition-colors duration-fast disabled:cursor-not-allowed ${
        iconLabel ? "max-sm:px-2.75" : "max-[480px]:px-4"
      } ${
        kind === "primary"
          ? "bg-brand-primary-default text-contents-dark-bgd-default hover:bg-brand-primary-light disabled:bg-surface-default-light disabled:text-contents-light-bgd-disabled"
          : kind === "secondary"
            ? "bg-brand-secondary-background text-contents-light-bgd-default hover:bg-brand-secondary-surface1 disabled:bg-surface-default-light disabled:text-contents-light-bgd-disabled"
            : kind === "outline"
              ? "border border-border-default bg-transparent text-contents-light-bgd-default hover:bg-surface-default-lightness disabled:border-border-light disabled:text-contents-light-bgd-disabled"
              : "text-contents-light-bgd-default hover:bg-surface-default-lightness disabled:text-contents-light-bgd-disabled"
      }`}
    >
      {iconLabel ? (
        <>
          {iconLabel.icon}
          <span className="max-sm:hidden">{iconLabel.label}</span>
        </>
      ) : short ? (
        <>
          <span className="max-[480px]:hidden">{children}</span>
          <span className="hidden max-[480px]:inline">{short}</span>
        </>
      ) : (
        children
      )}
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
  hintIsNotice = false,
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
  /** 없으면 삭제 버튼을 두지 않는다(클라이언트 — 사진은 작가의 것) */
  onDeleteSelection?: () => void;
  /** 선택이 없을 때 왼쪽 문구 — 860 미만에서는 버튼에 자리를 내주고 숨는다 */
  hint: ReactNode;
  /** 지금 문구가 안내가 아니라 알림(오류 · 방금 일어난 일)일 때 — 좁아도 숨기지 않는다 */
  hintIsNotice?: boolean;
  /** 있으면 왼쪽 문구 대신 진행 막대(업로드 · AI 분석) */
  progress?: ReactNode;
  /** 오른쪽 상태 표시(선택한 사진 n / 50 + 썸네일) — 버튼 앞, 구분선으로 나뉨 */
  status?: ReactNode;
  /** 선택이 없을 때 오른쪽 버튼들 */
  actions: ReactNode;
}) {
  if (selectionCount > 0) {
    return (
      <div className="flex h-15 shrink-0 items-center justify-between gap-3 border-t border-divider-default bg-background-default-main px-5 max-[480px]:px-3">
        <span className="type-content-m whitespace-nowrap text-contents-light-bgd-sub">
          <b className="type-label-semibold-l text-contents-light-bgd-default">{selectionCount}장</b> 선택
        </span>
        <div className="flex items-center gap-2">
          <ShellCta kind="outline" onClick={onMoveSelection}>
            폴더로 이동
          </ShellCta>
          <ShellCta kind="outline" onClick={onClearSelection}>
            선택 해제
          </ShellCta>
          {onSelectAll && visibleCount !== undefined && selectionCount < visibleCount && (
            <ShellCta kind="outline" onClick={onSelectAll}>
              <SelectAllIcon size={18} />
              모두 선택 ({visibleCount})
            </ShellCta>
          )}
          {onDeleteSelection && (
            <button
              type="button"
              onClick={onDeleteSelection}
              aria-label="삭제"
              className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-(--radius-8) border border-border-default px-4 type-label-medium-m whitespace-nowrap text-function-error-default transition-colors duration-fast hover:border-function-error-default hover:bg-function-error-background max-sm:px-2.75"
            >
              <DeleteForeverIcon size={18} />
              <span className="max-sm:hidden">삭제</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-15 shrink-0 items-center justify-between gap-3 border-t border-divider-default bg-background-default-main px-5 max-[480px]:px-3 ${
        progress || hintIsNotice ? "" : "max-[860px]:justify-end"
      }`}
    >
      {progress ? (
        <div className="flex min-w-0 flex-1 items-center gap-6">{progress}</div>
      ) : (
        <span className={`min-w-0 truncate type-content-s text-contents-light-bgd-sub ${hintIsNotice ? "" : "max-[860px]:hidden"}`}>{hint}</span>
      )}
      <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
        {status}
        {status && actions && <span aria-hidden className="mx-0.5 h-6 w-px bg-border-default max-sm:hidden" />}
        {actions}
      </div>
    </div>
  );
}
