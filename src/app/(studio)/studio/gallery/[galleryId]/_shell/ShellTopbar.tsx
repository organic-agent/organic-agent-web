"use client";

/**
 * 갤러리 셸 상단바 — 한 줄 (구조 확정 2026-09-11 · 가운데 개편 2026-09-15)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellTopbar.tsx
 *
 * 좌: 사이드바 토글(≡) · 로고(랜딩) | 스튜디오명(홈) / 중앙: [D-day 칩][단계 세그먼트] /
 * 우: 클라이언트 초대(소유자만) · 알림 · 프로필.
 * 세그먼트(디자이너 mainflow의 알약 세그먼트): 회색 트랙 안에 현재 칸만 흰 알약 · 굵게, 지난 칸은 회색,
 * 앞 칸은 더 흐리게. 누르는 것이 아니다(지난 단계 보기 없음).
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
import { ddayLabel, deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { guardNavigate } from "@/components/app/LeaveGuard";
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

const TRACK = "items-center gap-0.5 rounded-(--pill) bg-surface-default-light p-0.75";
const DOTS = "px-1.5 py-1 tracking-[1px] whitespace-nowrap type-label-medium-s text-contents-light-bgd-weakness";

function StagePill({ name, state }: { name: string; state: "done" | "current" | "next" }) {
  return (
    <li
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
}

/** 알약 세그먼트 — 1024 이상은 전부, 640~1023은 지금 단계와 양옆(가려진 쪽에 "···"). 640 미만은 그리지 않는다(단계 이름이 로고 옆으로) */
function StageSegments({ stages, stageIndex }: { stages: readonly string[]; stageIndex: number | null }) {
  const stateOf = (i: number) =>
    stageIndex === null ? "next" : i < stageIndex ? "done" : i === stageIndex ? "current" : "next";
  // 중간형이 보여 줄 창 — 지금 단계(아직 모르면 첫 칸)의 앞뒤 한 칸씩
  const center = stageIndex ?? 0;
  const from = Math.max(0, center - 1);
  const to = Math.min(stages.length - 1, center + 1);
  return (
    <>
      <ol aria-label="진행 단계" className={`hidden lg:flex ${TRACK}`}>
        {stages.map((name, i) => (
          <StagePill key={name} name={name} state={stateOf(i)} />
        ))}
      </ol>
      <ol aria-label="진행 단계" className={`hidden sm:flex lg:hidden ${TRACK}`}>
        {from > 0 && (
          <li aria-hidden className={DOTS}>
            ···
          </li>
        )}
        {stages.slice(from, to + 1).map((name, k) => (
          <StagePill key={name} name={name} state={stateOf(from + k)} />
        ))}
        {to < stages.length - 1 && (
          <li aria-hidden className={DOTS}>
            ···
          </li>
        )}
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
    <header className="grid h-13 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-divider-default bg-background-default-main">
      {/* 좌우 여백(왼쪽 8 · 오른쪽 12)은 헤더가 아니라 양옆 칸이 갖는다 — 헤더에 두면 두 값의 차이만큼 가운데가 밀린다.
          한 줄 높이로 자르고 줄바꿈을 허용한다 — 들어가지 못한 조각(스튜디오 이름, 그다음 워드마크)은 다음 줄로 넘어가 보이지 않는다.
          위아래 여백(-my · py 1.5)은 잘리는 상자 안에 포커스 테두리가 들어갈 자리다. 640 미만은 한 줄(단계 이름이 말줄임) */}
      <div className="-my-1.5 flex h-10 min-w-0 flex-wrap content-start items-center gap-x-1.5 gap-y-4 overflow-hidden py-1.5 pr-4 pl-2 max-sm:flex-nowrap max-sm:pr-2">
        <span data-coach="sidebar" className="inline-flex shrink-0">
          <IconButton
            icon={<MenuIcon size={20} />}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            onClick={toggle}
            className={collapsed ? "" : "bg-brand-secondary-background"}
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
        {stageIndex !== null && (
          <b className="ml-0.5 hidden min-w-0 truncate type-label-semibold-m text-contents-light-bgd-default max-sm:block">
            {stages[stageIndex]}
          </b>
        )}
        {studioName && studioHref && (
          <span className="flex h-7 shrink-0 items-center max-lg:hidden">
            <span aria-hidden className="mx-2 h-4.5 w-px bg-border-default" />
            <Link
              href={studioHref}
              onNavigate={guardNavigate}
              className="max-w-72 truncate type-label-medium-m text-contents-light-bgd-default transition-colors duration-fast hover:text-brand-secondary-dark"
            >
              {studioName}
            </Link>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <span className={`inline-flex items-center gap-1 rounded-(--pill) px-2.5 py-0.5 whitespace-nowrap type-label-medium-s ${DDAY_TONE_CLASS[chip.tone]}`}>
          <ScheduleIcon size={14} />
          {chip.text}
        </span>
        <StageSegments stages={stages} stageIndex={stageIndex} />
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
    </header>
  );
}
