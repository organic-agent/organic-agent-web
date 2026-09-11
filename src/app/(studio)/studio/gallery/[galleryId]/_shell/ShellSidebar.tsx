"use client";

/**
 * 갤러리 셸 사이드바 — 제목 · 상태줄 · 단계 진행 · 사진 내비 (버튼 없음, 주 버튼은 하단 바)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellSidebar.tsx
 *
 * 접으면 통째로 사라진다(상단 ≡로 여닫음). 단계 진행은 얇은 5칸 줄 + "n/5 단계명 · 다음".
 * 선택 사진은 클라이언트가 제출하기 전까지 잠김(WF: 제출 전 열람 불가).
 */

import type { ReactNode } from "react";
import {
  BrushIcon,
  CheckCircleIcon,
  LockIcon,
  PhotoIcon,
} from "@/components/icons";
import { SHELL_STAGES } from "./stages";

export type ShellView = "all" | "selected" | "retouch";

export type StatusLine = {
  text: string;
  tone: "muted" | "accent" | "warning" | "error";
};

const TONE_CLASS: Record<StatusLine["tone"], string> = {
  muted: "text-contents-light-bgd-weakness",
  accent: "text-brand-secondary-dark",
  warning: "text-function-warning-default",
  error: "text-function-error-default",
};

function NavRow({
  icon,
  label,
  trailing,
  selected,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailing: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={selected || undefined}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex w-full cursor-pointer items-center gap-2 rounded-(--radius-8) px-2.5 py-2 text-left type-content-m transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:text-contents-light-bgd-weakness disabled:hover:bg-transparent ${
        selected
          ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-default before:content-['']"
          : "text-contents-light-bgd-default"
      }`}
    >
      <span className="flex shrink-0 text-contents-light-bgd-sub">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness">{trailing}</span>
    </button>
  );
}

export function ShellSidebar({
  title,
  status,
  stageIndex,
  photoCount,
  selectedLocked,
  view,
  onViewChange,
}: {
  title: string;
  status: StatusLine;
  stageIndex: number;
  photoCount: number;
  /** 클라이언트 제출 전 — 선택 사진 항목 잠김 */
  selectedLocked: boolean;
  view: ShellView;
  onViewChange: (view: ShellView) => void;
}) {
  const next = SHELL_STAGES[stageIndex + 1];

  return (
    <aside className="flex w-66 shrink-0 flex-col border-r border-divider-default bg-background-default-main">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-4.5 pb-3">
        <div>
          <h1 className="type-title-s leading-snug text-contents-light-bgd-default">{title}</h1>
          <p className={`mt-0.5 type-label-semibold-xs ${TONE_CLASS[status.tone]}`}>{status.text}</p>
        </div>

        {/* 단계 진행 — 얇은 5칸 줄 + 한 줄 문구. 전환 버튼은 하단 바 우측 */}
        <div className="flex flex-col gap-1.5" aria-label={`${SHELL_STAGES.length}단계 중 ${stageIndex + 1}단계`}>
          <div className="flex gap-1" aria-hidden>
            {SHELL_STAGES.map((name, i) => (
              <span
                key={name}
                className={`h-0.5 flex-1 rounded-(--pill) ${
                  i <= stageIndex ? "bg-brand-secondary-default" : "bg-divider-default"
                }`}
              />
            ))}
          </div>
          <p className="type-content-xs text-contents-light-bgd-weakness">
            <span className="font-semibold text-contents-light-bgd-default">
              {stageIndex + 1}/{SHELL_STAGES.length} {SHELL_STAGES[stageIndex]}
            </span>
            {next && <> · 다음 {next}</>}
          </p>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="사진 보기">
          <NavRow
            icon={<PhotoIcon size={18} />}
            label="모든 사진"
            trailing={photoCount}
            selected={view === "all"}
            onClick={() => onViewChange("all")}
          />
          <NavRow
            icon={<CheckCircleIcon size={18} />}
            label="선택 사진"
            trailing={
              selectedLocked ? (
                <span className="inline-flex items-center gap-0.5">
                  <LockIcon size={13} />
                  셀렉 대기부터
                </span>
              ) : (
                "—"
              )
            }
            selected={view === "selected"}
            disabled={selectedLocked}
            onClick={() => onViewChange("selected")}
          />
          <NavRow
            icon={<BrushIcon size={18} />}
            label="보정 사진"
            trailing="—"
            selected={view === "retouch"}
            disabled
            onClick={() => onViewChange("retouch")}
          />
        </nav>
      </div>
    </aside>
  );
}
