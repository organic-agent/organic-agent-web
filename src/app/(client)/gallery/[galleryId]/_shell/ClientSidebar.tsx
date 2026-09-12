"use client";

/**
 * 클라이언트 갤러리 사이드바 — 제목 · 상태줄 · 단계 진행(4 · 5칸) · 사진 내비
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientSidebar.tsx
 *
 * 작가 셸 사이드바와 같은 문법. 1단계(컨셉 분류)에서는 폴더가 폴더 열(3열)에 있으니 트리를 두지 않고,
 * "선택한 사진"은 폴더 확정 뒤, "보정 사진"은 셀렉 뒤에 열린다. 단계 이름 · 칸 수는 clientStages가 정한다
 * (앨범 갤러리만 5칸).
 */

import type { ReactNode } from "react";
import { BrushIcon, CheckCircleIcon, LockIcon, PhotoIcon } from "@/components/icons";
import type { ClientPhase } from "./clientStages";

export type ClientView = "all" | "selected" | "retouch";

export type StatusLine = { text: string; tone: "muted" | "accent" | "warning" | "error" };

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

function LockedNote({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <LockIcon size={13} />
      {children}
    </span>
  );
}

export function ClientSidebar({
  title,
  status,
  phase,
  stages,
  stageIndex,
  photoCount,
  selectedCount,
  maxSelectable,
  view,
  onViewChange,
  folderTree,
  tabs,
}: {
  title: string;
  status: StatusLine;
  phase: ClientPhase;
  /** 이 갤러리의 단계 이름(4 · 5칸) */
  stages: readonly string[];
  /** 지금 단계(0부터) */
  stageIndex: number;
  photoCount: number | null;
  selectedCount: number;
  maxSelectable: number | null;
  view: ClientView;
  onViewChange: (view: ClientView) => void;
  /** 내비 아래 폴더 트리(탭 없이) */
  folderTree?: ReactNode;
  /** 2단계부터 — 내비 아래 "폴더 | 공유" 탭. 공유는 C6 게스트에서 채운다 */
  tabs?: { tab: "folder" | "share"; onTabChange: (tab: "folder" | "share") => void; folder: ReactNode; share: ReactNode };
}) {
  const index = stageIndex;
  const waiting = phase === "wait";
  const next = stages[index + 1];
  const selectionOpen = phase !== "wait" && phase !== "sort";

  return (
    <aside className="flex w-66 shrink-0 flex-col border-r border-divider-default bg-background-default-main">
      <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-4.5 pb-3">
        <div>
          <h1 className="type-title-s leading-snug text-contents-light-bgd-default">{title}</h1>
          <p className={`mt-0.5 type-label-semibold-xs ${TONE_CLASS[status.tone]}`}>{status.text}</p>
        </div>

        {!waiting && (
          <div className="flex flex-col gap-1.5" aria-label={`${stages.length}단계 중 ${index + 1}단계`}>
            <div className="flex gap-1" aria-hidden>
              {stages.map((name, i) => (
                <span
                  key={name}
                  className={`h-0.5 flex-1 rounded-(--pill) ${i <= index ? "bg-brand-secondary-default" : "bg-divider-default"}`}
                />
              ))}
            </div>
            <p className="type-content-xs text-contents-light-bgd-weakness">
              <span className="font-semibold text-contents-light-bgd-default">
                {index + 1}/{stages.length} {stages[index]}
              </span>
              {next && <> · 다음 {next}</>}
            </p>
          </div>
        )}

        <nav className="flex flex-col gap-0.5" aria-label="사진 보기">
          <NavRow
            icon={<PhotoIcon size={18} />}
            label="모든 사진"
            trailing={photoCount === null ? "—" : photoCount}
            selected={view === "all"}
            disabled={waiting}
            onClick={() => onViewChange("all")}
          />
          <NavRow
            icon={<CheckCircleIcon size={18} />}
            label="선택한 사진"
            trailing={
              selectionOpen ? (
                <span className="font-semibold text-contents-light-bgd-default tabular-nums">
                  {selectedCount}
                  {maxSelectable !== null && (
                    <span className="font-normal text-contents-light-bgd-weakness"> / {maxSelectable}</span>
                  )}
                </span>
              ) : (
                <LockedNote>폴더 확정 뒤</LockedNote>
              )
            }
            selected={view === "selected"}
            disabled={!selectionOpen}
            onClick={() => onViewChange("selected")}
          />
          <NavRow
            icon={<BrushIcon size={18} />}
            label="보정 사진"
            trailing={<LockedNote>셀렉 뒤</LockedNote>}
            selected={view === "retouch"}
            disabled
            onClick={() => onViewChange("retouch")}
          />
        </nav>

        {tabs && (
          <div role="tablist" aria-label="사이드바 탭" className="flex rounded-(--radius-8) bg-surface-default-medium p-0.75">
            {(["folder", "share"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tabs.tab === key}
                onClick={() => tabs.onTabChange(key)}
                className={`flex-1 cursor-pointer rounded-(--radius-4) py-1.5 type-label-medium-s transition-colors duration-fast ${
                  tabs.tab === key
                    ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                    : "text-contents-light-bgd-weakness hover:text-contents-light-bgd-sub"
                }`}
              >
                {key === "folder" ? "폴더" : "공유"}
              </button>
            ))}
          </div>
        )}
        {tabs ? (tabs.tab === "folder" ? tabs.folder : tabs.share) : folderTree}
      </div>
    </aside>
  );
}
