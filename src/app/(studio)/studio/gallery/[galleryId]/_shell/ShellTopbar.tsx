"use client";

/**
 * 갤러리 셸 상단바 — 한 줄 (구조 확정 2026-09-11 · 가운데 개편 2026-09-15)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellTopbar.tsx
 *
 * 좌: 사이드바 토글(≡) · 로고(랜딩) | 스튜디오명(홈) / 중앙: [D-day 칩][단계 세그먼트] /
 * 우: 클라이언트 초대(소유자만) · 알림 · 프로필.
 * 세그먼트(디자이너 mainflow의 알약 세그먼트): 회색 트랙 안에 현재 칸만 흰 알약 · 굵게, 지난 칸은 회색,
 * 앞 칸은 더 흐리게. 작가 셸에서는 표시만 한다. 개인 갤러리(클라이언트 셸)는 stageStates · onStageSelect를 주면 칸을 눌러
 * 단계를 오간다(이슈 147) — 갈 수 있는 칸은 hover에만 배경(다크는 보라 틴트), 잠긴 칸은 흐리고 누르면 쓰는 쪽이 스낵바를 띄운다.
 * 640 미만은 로고 옆 단계 이름(▾)을, 640~1023은 "···"를 눌러 같은 5칸 메뉴를 연다.
 * 폭에 따른 모양(디자이너 시안 "GNB 반응형" · QA 이슈 84): 1024 이상은 단계 전부, 640~1023은 지금 단계와 양옆 +
 * 가려진 쪽 "···"(중간형), 640 미만은 가운데에 D-day만 두고 지금 단계 이름을 로고 옆에 쓴다(좁은형).
 * 가운데 묶음은 어느 폭에서나 화면 한가운데 — 양옆 칸을 같은 폭(minmax(0,1fr))으로 두어 내용이 길어도 밀지 못한다.
 * 왼쪽은 자리가 모자라면 말줄임 없이 뒤에서부터 통째로 사라진다: 스튜디오 이름 → 워드마크(≡ · 로고는 남음).
 * 스튜디오 이름은 1024 미만에서는 늘 숨긴다 — 중간형으로 가운데가 줄면서 자리가 다시 생겨 이름이 되살아나지 않게.
 * D-day 칩은 선택 마감 기준 — 마감 전엔 올리브(D-day 당일까지), 마감이 지났는데 아직 셀렉 단계(deadlineStage)
 * 를 넘지 못했으면 빨강, 셀렉이 끝난 뒤 단계 · 기한 없음 · 마지막 단계("완료")는 회색.
 * 클라이언트 셸도 같이 쓴다 — studioName을 주지 않으면 로고만(2026-09-11 수민), 알림 링크는 hrefFor로.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ddayLabel, deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { guardNavigate } from "@/components/app/LeaveGuard";
import { NotificationBell } from "@/components/app/NotificationBell";
import type { UserNotificationResponse } from "@/lib/api/notifications";
import { ProfileAvatarButton } from "@/components/app/ProfileAvatarButton";
import { BrandLogo } from "@/components/BrandLogo";
import { DropdownIcon, MenuIcon, PersonAddIcon, ScheduleIcon } from "@/components/icons";
import { useSidebar } from "@/components/SidebarProvider";
import { IconButton } from "@/components/ui/IconButton";

type DdayTone = "olive" | "red" | "gray";
/** 칸을 눌러 이동할 때(이슈 147) 지금 칸이 아닌 칸의 상태 — can: 갈 수 있음 · locked: 흐리게(누르면 쓰는 쪽이 스낵바) */
export type StageChipState = "can" | "locked";
type PillState = "done" | "current" | "next" | StageChipState;

/** 칩 문구 · 색 — 마감이 지났어도 셀렉 단계를 넘었으면 따질 일이 아니라 회색 */
function ddayChip(
  deadline: string | null,
  stageIndex: number | null,
  stageCount: number,
  deadlineStage: number,
  noDeadlineText?: string,
): { text: string; tone: DdayTone } {
  if (stageIndex !== null && stageIndex === stageCount - 1) return { text: "완료", tone: "gray" };
  const offset = deadlineOffset(deadline);
  const text = ddayLabel(deadline, noDeadlineText);
  if (offset === null) return { text, tone: "gray" };
  if (offset > 0) return { text, tone: stageIndex !== null && stageIndex <= deadlineStage ? "red" : "gray" };
  return { text, tone: "olive" };
}

const DDAY_TONE_CLASS: Record<DdayTone, string> = {
  olive: "bg-surface-default-light text-contents-light-bgd-sub",
  red: "bg-function-error-background text-function-error-default",
  gray: "bg-surface-default-light text-contents-light-bgd-sub",
};

const PILL = "rounded-(--pill) px-3 py-1 whitespace-nowrap type-label-medium-s";
const PILL_CURRENT = "bg-brand-step-background font-semibold text-contents-light-bgd-default";

const TRACK = "items-center gap-0.5 rounded-(--pill) bg-surface-default-light p-0.75";
const DOTS = "px-1.5 py-1 tracking-[1px] whitespace-nowrap type-label-medium-s text-contents-light-bgd-weakness";

const PILL_STATE_CLASS: Record<PillState, string> = {
  current: PILL_CURRENT,
  done: "text-contents-light-bgd-sub",
  next: "text-contents-light-bgd-weakness",
  // 갈 수 있는 칸 — 조용히: 지금 색 그대로, hover에만 배경(다크는 보라 틴트)
  can: "cursor-pointer text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-light hover:text-contents-light-bgd-default dark:hover:bg-brand-primary-surface1 dark:hover:text-brand-on-fill",
  // 잠긴 칸 — 흐리게만. 눌리긴 해서 쓰는 쪽이 왜 못 가는지 스낵바로 알린다
  locked: "cursor-pointer text-contents-light-bgd-disabled",
};

function StagePill({ name, state, onClick }: { name: string; state: PillState; onClick?: () => void }) {
  if (onClick && state !== "current") {
    return (
      <li>
        <button type="button" onClick={onClick} className={`${PILL} ${PILL_STATE_CLASS[state]}`}>
          {name}
        </button>
      </li>
    );
  }
  return (
    <li aria-current={state === "current" ? "step" : undefined} className={`${PILL} ${PILL_STATE_CLASS[state]}`}>
      {name}
    </li>
  );
}

/** 중간형의 "···" — 칸을 누를 수 있는 셸에서는 5칸 메뉴를 여는 버튼 */
function Dots({ onMore }: { onMore?: () => void }) {
  if (onMore) {
    return (
      <li>
        <button type="button" data-stage-menu-trigger aria-label="단계 전체 보기" onClick={onMore} className={`${DOTS} cursor-pointer rounded-(--pill) transition-colors duration-fast hover:bg-surface-default-light`}>
          ···
        </button>
      </li>
    );
  }
  return (
    <li aria-hidden className={DOTS}>
      ···
    </li>
  );
}

/** 알약 세그먼트 — 1024 이상은 전부, 640~1023은 지금 단계와 양옆(가려진 쪽에 "···"). 640 미만은 그리지 않는다(단계 이름이 로고 옆으로) */
function StageSegments({
  stages,
  stageIndex,
  chipStates,
  onSelect,
  onMore,
}: {
  stages: readonly string[];
  stageIndex: number | null;
  /** 칸을 누를 수 있을 때 지금 칸이 아닌 칸의 상태 */
  chipStates?: readonly StageChipState[];
  onSelect?: (index: number) => void;
  onMore?: () => void;
}) {
  const stateOf = (i: number): PillState =>
    stageIndex === null ? "next" : i === stageIndex ? "current" : chipStates ? (chipStates[i] ?? "locked") : i < stageIndex ? "done" : "next";
  const clickOf = (i: number) => (onSelect && chipStates ? () => onSelect(i) : undefined);
  // 중간형이 보여 줄 창 — 지금 단계(아직 모르면 첫 칸)의 앞뒤 한 칸씩
  const center = stageIndex ?? 0;
  const from = Math.max(0, center - 1);
  const to = Math.min(stages.length - 1, center + 1);
  return (
    <>
      <ol aria-label="진행 단계" className={`hidden lg:flex ${TRACK}`}>
        {stages.map((name, i) => (
          <StagePill key={name} name={name} state={stateOf(i)} onClick={clickOf(i)} />
        ))}
      </ol>
      <ol aria-label="진행 단계" className={`hidden sm:flex lg:hidden ${TRACK}`}>
        {from > 0 && <Dots onMore={onMore} />}
        {stages.slice(from, to + 1).map((name, k) => (
          <StagePill key={name} name={name} state={stateOf(from + k)} onClick={clickOf(from + k)} />
        ))}
        {to < stages.length - 1 && <Dots onMore={onMore} />}
      </ol>
    </>
  );
}

export function ShellTopbar({
  studioName,
  studioHref,
  workspaceId = null,
  stages,
  stageIndex,
  deadlineStage = 1,
  deadline,
  onInviteClick,
  inviteLabel = "클라이언트 초대",
  inviteCoachKey,
  notificationHrefFor,
  noDeadlineText,
  stageStates,
  onStageSelect,
}: {
  /** 마감이 비었을 때 칩에 적는 말 — 개인 갤러리는 "목표일 없음" */
  noDeadlineText?: string;
  /** 칸을 눌러 단계를 오가는 셸(개인 갤러리, 이슈 147) — 지금 칸이 아닌 칸의 상태. onStageSelect와 함께 줘야 칸이 눌린다 */
  stageStates?: readonly StageChipState[];
  /** 칸(또는 좁은 폭의 메뉴 항목)을 눌렀을 때 — 잠긴 칸도 부르니 쓰는 쪽이 스낵바로 알린다 */
  onStageSelect?: (index: number) => void;
  /** 없으면 로고만(클라이언트 셸) */
  studioName?: string;
  studioHref?: string;
  workspaceId?: number | null;
  /** 이 셸의 단계 이름(작가 5칸 · 클라이언트 4 · 5칸) */
  stages: readonly string[];
  /** 지금 단계(0부터) — null이면 아직 모름(불러오는 중 · 준비 중): 현재 칸 없음 */
  stageIndex: number | null;
  /** 선택 마감이 붙는 단계 번호 — 이 단계를 넘으면 마감이 지나도 빨강이 아니다(기본 1 = 셀렉) */
  deadlineStage?: number;
  deadline: string | null;
  /** 소유자가 아니면 주지 않는다 — 버튼 숨김 */
  onInviteClick?: () => void;
  /** 초대 버튼 이름 — 클라이언트 셸은 "게스트 초대" */
  inviteLabel?: string;
  /** 초대 버튼에 붙는 코치마크 대상 이름 */
  inviteCoachKey?: string;
  /** 알림 행을 눌렀을 때 갈 주소 — 클라이언트는 /gallery/{id} */
  notificationHrefFor?: (n: UserNotificationResponse) => string | null;
}) {
  const { collapsed, toggle } = useSidebar();
  const chip = ddayChip(deadline, stageIndex, stages.length, deadlineStage, noDeadlineText);
  const clickable = onStageSelect !== undefined && stageStates !== undefined;
  // 좁은 폭(640 미만 · 640~1023)의 5칸 메뉴 — 트리거(로고 옆 이름 · ···)와 메뉴가 다른 칸에 있어 트리거는 바깥 클릭에서 뺀다
  const [stageMenu, setStageMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stageMenu) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (target?.closest("[data-stage-menu-trigger]")) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setStageMenu(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setStageMenu(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stageMenu]);

  return (
    <header className="relative grid h-13 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-divider-default bg-background-default-main">
      {/* 좌우 여백(왼쪽 8 · 오른쪽 12)은 헤더가 아니라 양옆 칸이 갖는다 — 헤더에 두면 두 값의 차이만큼 가운데가 밀린다.
          한 줄 높이로 자르고 줄바꿈을 허용한다 — 들어가지 못한 조각(스튜디오 이름, 그다음 워드마크)은 다음 줄로 넘어가 보이지 않는다.
          위아래 여백(-my · py 1.5)은 잘리는 상자 안에 포커스 테두리가 들어갈 자리다. 640 미만은 한 줄(단계 이름이 말줄임) */}
      <div className="-my-1.5 flex h-10 min-w-0 flex-wrap content-start items-center gap-x-1.5 gap-y-4 overflow-hidden py-1.5 pr-4 pl-2 max-sm:flex-nowrap max-sm:pr-2">
        <span data-coach="sidebar" className="inline-flex shrink-0">
          <IconButton
            icon={<MenuIcon size={20} />}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            onClick={toggle}
            className={collapsed ? "" : "bg-brand-step-background"}
          />
        </span>
        {/* 업로드 중에는 세 링크 모두 이동하지 않는다(guardNavigate) */}
        <Link
          href="/"
          onNavigate={guardNavigate}
          aria-label="Easy Select 홈"
          className="ml-1 flex h-7 shrink-0 items-center text-contents-light-bgd-default"
        >
          <BrandLogo size={26} />
        </Link>
        {/* 워드마크는 로고와 따로 사라져야 해서 칸을 나눴다 — 같은 곳으로 가는 링크라 탭 순서 · 읽기에서는 뺀다 */}
        <Link
          href="/"
          onNavigate={guardNavigate}
          tabIndex={-1}
          aria-hidden
          className="ml-0.5 flex h-7 shrink-0 items-center whitespace-nowrap text-contents-light-bgd-default max-sm:hidden"
        >
          <b className="type-brand-wordmark">Easy Select</b>
        </Link>
        {stageIndex !== null &&
          (clickable ? (
            <button
              type="button"
              data-stage-menu-trigger
              aria-haspopup="menu"
              aria-expanded={stageMenu}
              onClick={() => setStageMenu((v) => !v)}
              className="ml-0.5 hidden min-w-0 cursor-pointer items-center gap-0.5 type-label-semibold-m text-contents-light-bgd-default max-sm:flex"
            >
              <span className="truncate">{stages[stageIndex]}</span>
              <span className="flex shrink-0 text-contents-light-bgd-sub">
                <DropdownIcon size={16} />
              </span>
            </button>
          ) : (
            <b className="ml-0.5 hidden min-w-0 truncate type-label-semibold-m text-contents-light-bgd-default max-sm:block">
              {stages[stageIndex]}
            </b>
          ))}
        {studioName && studioHref && (
          <span className="flex h-7 shrink-0 items-center max-lg:hidden">
            <span aria-hidden className="mx-2 h-4.5 w-px bg-border-default" />
            <Link
              href={studioHref}
              onNavigate={guardNavigate}
              className="max-w-72 truncate type-label-medium-m text-contents-light-bgd-default transition-colors duration-fast hover:text-brand-accent-text"
            >
              {studioName}
            </Link>
          </span>
        )}
      </div>

      <div data-coach="stages" className="flex items-center gap-2.5">
        <span className={`inline-flex items-center gap-1 rounded-(--pill) px-2.5 py-0.5 whitespace-nowrap type-label-medium-s ${DDAY_TONE_CLASS[chip.tone]}`}>
          <ScheduleIcon size={14} />
          {chip.text}
        </span>
        <StageSegments
          stages={stages}
          stageIndex={stageIndex}
          chipStates={clickable ? stageStates : undefined}
          onSelect={clickable ? onStageSelect : undefined}
          onMore={clickable ? () => setStageMenu((v) => !v) : undefined}
        />
      </div>

      <div className="flex items-center justify-end gap-1 pr-3">
        {onInviteClick && (
          <span data-coach={inviteCoachKey} className="inline-flex">
            <IconButton
              icon={<PersonAddIcon size={20} />}
              aria-label={inviteLabel}
              onClick={onInviteClick}
            />
          </span>
        )}
        <NotificationBell hrefFor={notificationHrefFor} />
        <ProfileAvatarButton
          current={workspaceId !== null ? { kind: "STUDIO", workspaceId } : undefined}
        />
      </div>

      {/* 좁은 폭의 5칸 메뉴 — 640 미만은 로고 옆 이름 아래(왼쪽), 640~1023은 가운데 */}
      {stageMenu && clickable && stageIndex !== null && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="진행 단계"
          className="absolute top-full left-2 z-30 mt-1 flex w-52 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover) sm:left-1/2 sm:-translate-x-1/2"
        >
          {stages.map((name, i) => {
            const state: PillState = i === stageIndex ? "current" : (stageStates[i] ?? "locked");
            return (
              <button
                key={name}
                type="button"
                role="menuitem"
                aria-current={state === "current" ? "step" : undefined}
                onClick={() => {
                  setStageMenu(false);
                  if (state !== "current") onStageSelect(i);
                }}
                className={`flex w-full cursor-pointer items-center rounded-(--radius-4) px-3 py-2 text-left type-content-s transition-colors duration-fast ${
                  state === "current"
                    ? "bg-brand-chip-background font-semibold text-brand-chip-text dark:bg-brand-step-background dark:text-brand-on-fill"
                    : state === "can"
                      ? "text-contents-light-bgd-default hover:bg-surface-default-lightness"
                      : "text-contents-light-bgd-disabled"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
