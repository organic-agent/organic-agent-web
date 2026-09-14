"use client";

/**
 * 갤러리 셸 상단바 — 한 줄 (구조 확정 2026-09-11 · 가운데 개편 2026-09-15)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellTopbar.tsx
 *
 * 좌: 사이드바 토글(≡) · 로고(랜딩) | 스튜디오명(홈) / 중앙: [D-day 칩][단계 세그먼트] /
 * 우: 클라이언트 초대(소유자만) · 알림 · 프로필.
 * 세그먼트(디자이너 mainflow의 알약 세그먼트): 회색 트랙 안에 현재 칸만 흰 알약 · 굵게, 지난 칸은 회색,
 * 앞 칸은 더 흐리게. 누르는 것이 아니다(지난 단계 보기 없음). 1024 미만(max-lg)에서는 "n/5 단계명" 알약 하나만.
 * D-day 칩은 선택 마감 기준 — 마감 전엔 올리브(D-day 당일까지), 마감이 지났는데 아직 셀렉 단계(deadlineStage)
 * 를 넘지 못했으면 빨강, 셀렉이 끝난 뒤 단계 · 기한 없음 · 마지막 단계("완료")는 회색.
 * 클라이언트 셸도 같이 쓴다 — studioName을 주지 않으면 로고만(2026-09-11 수민), 알림 링크는 hrefFor로.
 */

import Link from "next/link";
import { ddayLabel, deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { NotificationBell } from "@/components/app/NotificationBell";
import type { UserNotificationResponse } from "@/lib/api/notifications";
import { ProfileAvatarButton } from "@/components/app/ProfileAvatarButton";
import { BrandLogo } from "@/components/BrandLogo";
import { MenuIcon, PersonAddIcon, ScheduleIcon } from "@/components/icons";
import { useSidebar } from "@/components/SidebarProvider";
import { IconButton } from "@/components/ui/IconButton";

type DdayTone = "olive" | "red" | "gray";

/** 칩 문구 · 색 — 마감이 지났어도 셀렉 단계를 넘었으면 따질 일이 아니라 회색 */
function ddayChip(
  deadline: string | null,
  stageIndex: number | null,
  stageCount: number,
  deadlineStage: number,
): { text: string; tone: DdayTone } {
  if (stageIndex !== null && stageIndex === stageCount - 1) return { text: "완료", tone: "gray" };
  const offset = deadlineOffset(deadline);
  if (offset === null) return { text: ddayLabel(deadline), tone: "gray" };
  if (offset > 0) return { text: ddayLabel(deadline), tone: stageIndex !== null && stageIndex <= deadlineStage ? "red" : "gray" };
  return { text: ddayLabel(deadline), tone: "olive" };
}

const DDAY_TONE_CLASS: Record<DdayTone, string> = {
  olive: "bg-brand-secondary-background text-brand-secondary-dark",
  red: "bg-function-error-background text-function-error-default",
  gray: "bg-surface-default-light text-contents-light-bgd-sub",
};

const PILL = "rounded-(--pill) px-3 py-1 whitespace-nowrap type-label-medium-s";
const PILL_CURRENT = "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-[0_1px_2px_rgba(0,0,0,0.08)]";

/** 알약 세그먼트 — 넓으면 전부, 1024 미만이면 "n/5 현재 단계" 하나 */
function StageSegments({ stages, stageIndex }: { stages: readonly string[]; stageIndex: number | null }) {
  const track = "items-center gap-0.5 rounded-(--pill) bg-surface-default-light p-0.75";
  return (
    <>
      <ol aria-label="진행 단계" className={`hidden lg:flex ${track}`}>
        {stages.map((name, i) => {
          const state = stageIndex === null ? "next" : i < stageIndex ? "done" : i === stageIndex ? "current" : "next";
          return (
            <li
              key={name}
              aria-current={state === "current" ? "step" : undefined}
              className={`${PILL} ${
                state === "current"
                  ? PILL_CURRENT
                  : state === "done"
                    ? "text-contents-light-bgd-sub"
                    : "text-contents-light-bgd-weakness"
              }`}
            >
              {name}
            </li>
          );
        })}
      </ol>
      <span aria-hidden className={`flex lg:hidden ${track}`}>
        <span className={`${PILL} ${PILL_CURRENT}`}>
          {stageIndex !== null && (
            <span className="mr-1.5 font-medium text-contents-light-bgd-sub tabular-nums">
              {stageIndex + 1}/{stages.length}
            </span>
          )}
          {stageIndex === null ? "…" : stages[stageIndex]}
        </span>
      </span>
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
}: {
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
  const chip = ddayChip(deadline, stageIndex, stages.length, deadlineStage);

  return (
    <header className="grid h-13 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-divider-default bg-background-default-main px-2 pr-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <IconButton
          icon={<MenuIcon size={20} />}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          onClick={toggle}
          className={collapsed ? "" : "bg-brand-secondary-background"}
        />
        <Link href="/" className="ml-1 flex items-center gap-2 text-contents-light-bgd-default">
          <BrandLogo size={26} />
          <b className="type-brand-wordmark">Easy Select</b>
        </Link>
        {studioName && studioHref && (
          <>
            <span aria-hidden className="mx-2 h-4.5 w-px bg-border-default" />
            <Link
              href={studioHref}
              className="truncate type-label-medium-m text-contents-light-bgd-default transition-colors duration-fast hover:text-brand-secondary-dark"
            >
              {studioName}
            </Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <span className={`inline-flex items-center gap-1 rounded-(--pill) px-2.5 py-0.5 type-label-medium-s ${DDAY_TONE_CLASS[chip.tone]}`}>
          <ScheduleIcon size={14} />
          {chip.text}
        </span>
        <StageSegments stages={stages} stageIndex={stageIndex} />
      </div>

      <div className="flex items-center justify-end gap-1">
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
    </header>
  );
}
