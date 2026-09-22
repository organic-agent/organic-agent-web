"use client";

/**
 * 클라이언트 갤러리 사이드바 — 제목 · 상태줄 · 사진 내비
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientSidebar.tsx
 *
 * 작가 셸 사이드바와 같은 문법. 1단계(컨셉 분류)에서는 폴더가 폴더 열(3열)에 있으니 트리를 두지 않고,
 * "선택한 사진"은 폴더 확정 뒤, "보정 사진"은 셀렉 뒤에 열린다. 단계 진행은 상단바 가운데 세그먼트가 맡는다
 * (2026-09-15 — 여기 있던 2px 줄 삭제).
 */

import type { ReactNode } from "react";
import { BrushIcon, CheckCircleIcon, LockIcon, PhotoIcon, ScheduleIcon } from "@/components/icons";
import type { ClientPhase } from "./clientStages";

/** 개인 갤러리의 플랜 — 사진 상한 · 이용 기간(서버 planMaxPhotoCount · planExpiresAt) */
export type PlanInfo = { used: number; max: number | null; expiresAt: string | null };

function planDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  return Number.isNaN(days) ? null : days;
}
function planUntil(expiresAt: string | null): string {
  if (!expiresAt) return "기한 없음";
  const d = new Date(expiresAt);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}까지`;
}

function PlanCard({ plan }: { plan: PlanInfo }) {
  const days = planDaysLeft(plan.expiresAt);
  const ratio = plan.max ? Math.min(1, plan.used / plan.max) : 0;
  return (
    <div data-coach="plan" className="flex flex-col gap-2 rounded-(--radius-12) border border-border-default bg-surface-default-lightness px-3 py-2.5">
      <div className="flex items-center justify-between type-label-semibold-xs text-contents-light-bgd-default">
        플랜
        {days !== null && (
          <span className={`inline-flex items-center gap-1 rounded-(--pill) px-2 py-0.5 type-label-semibold-xs ${days <= 7 ? "bg-function-warning-background text-function-warning-default" : "bg-brand-secondary-background text-brand-secondary-dark"}`}>
            <ScheduleIcon size={12} />
            {days <= 0 ? "만료" : `${days}일 남음`}
          </span>
        )}
      </div>
      {plan.max !== null && (
        <div className="h-1 overflow-hidden rounded-(--pill) bg-surface-default-medium" aria-hidden>
          <i className={`block h-full rounded-(--pill) ${ratio >= 0.9 ? "bg-function-warning-default" : "bg-brand-secondary-default"}`} style={{ width: `${Math.max(2, ratio * 100)}%` }} />
        </div>
      )}
      <dl className="flex flex-col gap-0.5 type-content-xs text-contents-light-bgd-sub">
        <div className="flex justify-between">
          <dt>사진</dt>
          <dd className="font-semibold text-contents-light-bgd-default tabular-nums">
            {plan.used}
            {plan.max !== null ? ` / ${plan.max}장` : "장 · 제한 없음"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>이용 기간</dt>
          <dd className="font-semibold text-contents-light-bgd-default tabular-nums">{planUntil(plan.expiresAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

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
  photoCount,
  selectedCount,
  maxSelectable,
  view,
  onViewChange,
  folderTree,
  tabs,
  retouchCount,
  extra,
  plan,
  selectedLockNote = "폴더 확정 뒤",
  retouchLockNote = "셀렉 뒤",
}: {
  title: string;
  status: StatusLine;
  phase: ClientPhase;
  photoCount: number | null;
  selectedCount: number;
  maxSelectable: number | null;
  view: ClientView;
  onViewChange: (view: ClientView) => void;
  /** 내비 아래 폴더 트리(탭 없이) */
  folderTree?: ReactNode;
  /** 2단계부터 — 내비 아래 "폴더 | 공유" 탭. 공유는 C6 게스트에서 채운다 */
  tabs?: { tab: "folder" | "share"; onTabChange: (tab: "folder" | "share") => void; folder: ReactNode; share: ReactNode };
  /** 3단계부터 — 보정 대상 장수. 없으면 잠김 */
  retouchCount?: number | null;
  /** 내비 아래(회차 목록) — 작가 사이드바와 같은 형식 */
  extra?: ReactNode;
  /** 개인 갤러리 — 진행 표시 아래 플랜 카드 */
  plan?: PlanInfo;
  /** 잠긴 내비 행의 문구 — 개인은 "분류 뒤" · "내보낸 뒤" */
  selectedLockNote?: string;
  retouchLockNote?: string;
}) {
  const waiting = phase === "wait";
  const selectionOpen = phase !== "wait" && phase !== "sort";

  return (
    <aside className="flex w-66 shrink-0 flex-col border-r border-divider-default bg-background-default-main">
      <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-4.5 pb-3">
        <div>
          <h1 className="type-title-s leading-snug text-contents-light-bgd-default">{title}</h1>
          <p className={`mt-0.5 type-label-semibold-xs ${TONE_CLASS[status.tone]}`}>{status.text}</p>
        </div>

        {plan && <PlanCard plan={plan} />}

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
                <LockedNote>{selectedLockNote}</LockedNote>
              )
            }
            selected={view === "selected"}
            disabled={!selectionOpen}
            onClick={() => onViewChange("selected")}
          />
          <NavRow
            icon={<BrushIcon size={18} />}
            label="보정 사진"
            trailing={
              retouchCount !== undefined && retouchCount !== null ? (
                <span className="font-semibold text-contents-light-bgd-default tabular-nums">{retouchCount}</span>
              ) : (
                <LockedNote>{retouchLockNote}</LockedNote>
              )
            }
            selected={view === "retouch"}
            disabled={retouchCount === undefined || retouchCount === null}
            onClick={() => onViewChange("retouch")}
          />
        </nav>
        {extra}

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
