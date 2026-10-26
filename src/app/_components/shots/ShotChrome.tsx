/**
 * 랜딩 흐름 화면의 공용 껍데기 — 개인 갤러리 셸의 상단바 · 사이드바를 같은 클래스로 그린 것
 * 위치: src/app/_components/shots/ShotChrome.tsx
 *
 * 실제 부품(ShellTopbar · ClientSidebar)은 사이드바 상태 · 알림 · 프로필 훅에 묶여 있어 랜딩에서 못 쓴다.
 * 모양만 옮겼다 — 클래스는 그 부품들 그대로이니 셸이 바뀌면 여기도 맞춘다. 버튼은 전부 span(그림).
 */

import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { BellIcon, BrushIcon, CheckCircleIcon, LockIcon, MenuIcon, PersonAddIcon, PhotoIcon, ScheduleIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";

/** 개인 갤러리 단계 5칸(clientStages.ts STAGES_PERSONAL) */
export const SHOT_STAGES = ["업로드", "컨셉 분류", "셀렉 & 보정 요청", "보정 확인", "완료"] as const;
export const SHOT_TITLE = "민지 · 준호 스튜디오 촬영";

const PILL = "rounded-(--pill) px-3 py-1 whitespace-nowrap type-label-medium-s";

export function ShotTopbar({ stageIndex }: { stageIndex: number }) {
  return (
    <header className="grid h-13 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-divider-default bg-background-default-main">
      <div className="flex h-10 items-center gap-x-1.5 pr-4 pl-2">
        <span className="inline-flex items-center justify-center rounded-(--radius-4) bg-brand-secondary-background p-1 text-contents-light-bgd-default">
          <MenuIcon size={20} />
        </span>
        <span className="ml-1 flex h-7 items-center text-contents-light-bgd-default">
          <BrandLogo size={26} />
        </span>
        <b className="ml-0.5 type-brand-wordmark whitespace-nowrap text-contents-light-bgd-default">Easy Select</b>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1 rounded-(--pill) bg-surface-default-light px-2.5 py-0.5 whitespace-nowrap type-label-medium-s text-contents-light-bgd-sub">
          <ScheduleIcon size={14} />
          목표일 없음
        </span>
        <ol className="flex items-center gap-0.5 rounded-(--pill) bg-surface-default-light p-0.75">
          {SHOT_STAGES.map((name, i) => (
            <li
              key={name}
              className={`${PILL} ${
                i === stageIndex
                  ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  : i < stageIndex
                    ? "text-contents-light-bgd-sub"
                    : "text-contents-light-bgd-weakness"
              }`}
            >
              {name}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-center justify-end gap-1 pr-3">
        <span className="inline-flex p-1 text-contents-light-bgd-default"><PersonAddIcon size={20} /></span>
        <span className="inline-flex p-1 text-contents-light-bgd-default"><BellIcon size={20} /></span>
        <span className="inline-flex p-1"><Avatar initial="민" /></span>
      </div>
    </header>
  );
}

function NavRow({ icon, label, trailing, selected = false, dim = false }: { icon: ReactNode; label: string; trailing: ReactNode; selected?: boolean; dim?: boolean }) {
  return (
    <div
      className={`relative flex w-full items-center gap-2 rounded-(--radius-8) px-2.5 py-2 text-left type-content-m ${
        selected
          ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-default before:content-['']"
          : dim
            ? "text-contents-light-bgd-weakness"
            : "text-contents-light-bgd-default"
      }`}
    >
      <span className="flex shrink-0 text-contents-light-bgd-sub">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness">{trailing}</span>
    </div>
  );
}

function Locked({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <LockIcon size={13} />
      {children}
    </span>
  );
}

export function ShotSidebar({
  status,
  statusTone = "muted",
  photoCount,
  selected,
  retouch,
  children,
}: {
  status: string;
  statusTone?: "muted" | "accent";
  photoCount: number;
  /** [고른 수, 상한] — 없으면 "폴더 확정 뒤" 잠김(개인 갤러리 문구) */
  selected?: [number, number];
  /** 보정 대상 장수 — 없으면 "선택 마친 뒤" 잠김(개인 갤러리 문구) */
  retouch?: number;
  /** 내비 아래(폴더 탭 · 트리) */
  children?: ReactNode;
}) {
  return (
    <aside className="flex w-66 shrink-0 flex-col border-r border-divider-default bg-background-default-main">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-4 pt-4.5 pb-3">
        <div>
          <h3 className="type-title-s leading-snug text-contents-light-bgd-default">{SHOT_TITLE}</h3>
          <p className={`mt-0.5 type-label-semibold-xs ${statusTone === "accent" ? "text-brand-secondary-dark" : "text-contents-light-bgd-weakness"}`}>{status}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-(--radius-12) border border-border-default bg-surface-default-lightness px-3 py-2.5">
          <div className="flex items-center justify-between type-label-semibold-xs text-contents-light-bgd-default">
            플랜
            <span className="inline-flex items-center gap-1 rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-semibold-xs text-brand-secondary-dark">
              <ScheduleIcon size={12} />
              27일 남음
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-(--pill) bg-surface-default-medium" aria-hidden>
            <i className="block h-full rounded-(--pill) bg-brand-secondary-default" style={{ width: `${Math.max(2, (photoCount / 500) * 100)}%` }} />
          </div>
          <dl className="flex flex-col gap-0.5 type-content-xs text-contents-light-bgd-sub">
            <div className="flex justify-between">
              <dt>사진</dt>
              <dd className="font-semibold text-contents-light-bgd-default tabular-nums">{photoCount} / 500장</dd>
            </div>
            <div className="flex justify-between">
              <dt>이용 기간</dt>
              <dd className="font-semibold text-contents-light-bgd-default tabular-nums">2026.11.22까지</dd>
            </div>
          </dl>
        </div>
        <nav className="flex flex-col gap-0.5">
          <NavRow icon={<PhotoIcon size={18} />} label="모든 사진" trailing={photoCount} selected />
          <NavRow
            icon={<CheckCircleIcon size={18} />}
            label="선택한 사진"
            dim={!selected}
            trailing={
              selected ? (
                <span className="font-semibold text-contents-light-bgd-default tabular-nums">
                  {selected[0]}
                  <span className="font-normal text-contents-light-bgd-weakness"> / {selected[1]}</span>
                </span>
              ) : (
                <Locked>폴더 확정 뒤</Locked>
              )
            }
          />
          <NavRow
            icon={<BrushIcon size={18} />}
            label="보정 사진"
            dim={retouch === undefined}
            trailing={retouch !== undefined ? <span className="font-semibold text-contents-light-bgd-default tabular-nums">{retouch}</span> : <Locked>선택 마친 뒤</Locked>}
          />
        </nav>
        {children}
      </div>
    </aside>
  );
}
