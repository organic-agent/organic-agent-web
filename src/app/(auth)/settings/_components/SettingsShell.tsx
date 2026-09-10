/**
 * 설정 화면 공통 조각 — 좌측 내비 · 상단 탭 · 섹션 · 읽기 전용 상자
 * 위치: src/app/(auth)/settings/_components/SettingsShell.tsx
 */

import type { ReactNode } from "react";
import { LockIcon } from "@/components/icons";

export function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pb-2 type-label-semibold-xs tracking-wide text-contents-light-bgd-weakness">
        {label}
      </p>
      {children}
    </div>
  );
}

export function NavItem({
  icon,
  label,
  meta,
  selected = false,
  locked = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  /** 오른쪽 작은 글자 — 역할 · 잠김 */
  meta?: string;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={selected || undefined}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) px-3 py-2 text-left type-content-m text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness aria-pressed:bg-surface-default-light aria-pressed:font-semibold aria-pressed:text-contents-light-bgd-default disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
    >
      <span className="flex shrink-0 text-contents-light-bgd-weakness">
        {locked ? <LockIcon size={18} /> : icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta && (
        <span className="shrink-0 type-content-xs font-normal text-contents-light-bgd-weakness">
          {meta}
        </span>
      )}
    </button>
  );
}

/** 내비의 사각 이니셜 — 스튜디오 · 계정 */
export function NavInitial({ text }: { text: string }) {
  return (
    <span className="grid size-6 place-items-center rounded-(--radius-4) bg-brand-secondary-background type-label-semibold-xs text-brand-secondary-dark">
      {text.trim().slice(0, 1) || "?"}
    </span>
  );
}

export function SettingsTabs<T extends string>({
  tabs,
  current,
  dangerKey,
  onChange,
}: {
  tabs: ReadonlyArray<readonly [T, string]>;
  current: T;
  /** 빨강으로 표시할 탭 (삭제 · 나가기) */
  dangerKey?: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div role="tablist" className="mb-6 flex gap-0.5 border-b border-divider-default">
      {tabs.map(([key, label]) => {
        const danger = key === dangerKey;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={current === key}
            onClick={() => onChange(key)}
            className={`-mb-px cursor-pointer border-b-2 px-3.5 py-2.5 type-label-medium-m transition-colors duration-fast ${
              current === key
                ? danger
                  ? "border-function-error-default font-semibold text-function-error-default"
                  : "border-contents-light-bgd-default font-semibold text-contents-light-bgd-default"
                : "border-transparent text-contents-light-bgd-sub hover:text-contents-light-bgd-default"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="mb-4 type-title-s text-contents-light-bgd-default">{title}</h3>
      {children}
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor?: string;
  children: string;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
    >
      {children}
      {optional && (
        <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
      )}
    </label>
  );
}

/** 바꿀 수 없는 값 — 입력창 모양의 회색 상자 */
export function ReadOnlyBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex min-h-12 items-center rounded-(--radius-8) border border-divider-default bg-surface-default-lightness px-4 type-content-m text-contents-light-bgd-sub ${className}`}
    >
      {children}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-(--radius-8) bg-function-info-background px-3.5 py-2.5 type-content-xs text-contents-light-bgd-default">
      {children}
    </p>
  );
}

/** 빨간 테두리 카드 — 삭제 · 나가기 · 탈퇴 */
export function DangerCard({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-(--radius-12) border border-function-error-default bg-function-error-background px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="type-label-semibold-m text-contents-light-bgd-default">{title}</p>
        <p className="mt-0.5 type-content-xs text-contents-light-bgd-sub">{desc}</p>
      </div>
      {action}
    </div>
  );
}

/** 위험 동작 버튼 — 빨간 테두리 */
export function DangerButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-(--pill) border border-function-error-default px-5 type-label-medium-m text-function-error-default transition-colors duration-fast hover:bg-function-error-surface"
    >
      {children}
    </button>
  );
}
