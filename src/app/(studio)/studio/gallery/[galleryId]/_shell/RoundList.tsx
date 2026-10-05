"use client";

/**
 * 사이드바 회차 목록 — "회차" 제목선 · 남은 횟수 + n차 보정 · 장수 · 상태 칩 (작가 · 클라이언트 공용)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/RoundList.tsx
 *
 * 남은 횟수는 회차 하나가 아니라 갤러리 전체의 값이라 제목 줄 오른쪽에 둔다(팀 노션 15번 — 목록 아래에 있으면 고른 회차의
 * 박스와 떨어져 어디에 딸린 값인지 흐렸다). 작가는 그 옆에 "횟수 바꾸기" 링크가 붙고(onChangeRounds), 클라이언트는 남은 횟수만.
 */

import type { RetouchRoundSummaryResponse } from "@/lib/api/retouch";

export function RoundList({
  rounds,
  activeRoundNo,
  remaining,
  maxRounds,
  onSelect,
  onChangeRounds,
}: {
  rounds: RetouchRoundSummaryResponse[];
  activeRoundNo: number | null;
  remaining: number | null;
  maxRounds: number | null;
  onSelect: (roundNo: number) => void;
  onChangeRounds?: () => void;
}) {
  const tag: Record<RetouchRoundSummaryResponse["status"], { label: string; cls: string }> = {
    DRAFTING: { label: "작성 중", cls: "bg-surface-default-light text-contents-light-bgd-weakness" },
    REQUESTED: { label: "요청 중", cls: "bg-function-warning-background text-function-warning-default" },
    COMPLETED: { label: "완료", cls: "bg-brand-secondary-background text-brand-secondary-dark" },
  };
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1.5 px-2.5 pt-1 pb-1 type-label-semibold-xs whitespace-nowrap text-contents-light-bgd-weakness">
        회차
        <span aria-hidden className="h-px min-w-3 flex-1 bg-divider-default" />
        <span className="type-content-xs tabular-nums">{maxRounds !== null ? `남은 횟수 ${remaining ?? "—"} / ${maxRounds}` : "횟수 제한 없음"}</span>
        {onChangeRounds && (
          <button type="button" onClick={onChangeRounds} className="cursor-pointer type-content-xs text-brand-secondary-dark underline underline-offset-2">
            횟수 바꾸기
          </button>
        )}
      </p>
      {rounds.map((r) => {
        const active = r.roundNo === activeRoundNo;
        return (
          <button
            key={r.roundNo}
            type="button"
            data-sidebar-item
            aria-current={active || undefined}
            onClick={() => onSelect(r.roundNo)}
            className={`relative flex w-full cursor-pointer items-center gap-2 rounded-(--radius-8) py-1.5 pr-2.5 pl-3.5 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness ${
              active
                ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-default before:content-['']"
                : "text-contents-light-bgd-sub"
            }`}
          >
            {r.roundNo}차 보정
            <span className="type-content-xs text-contents-light-bgd-weakness">{r.photoCount}장</span>
            <span className={`ml-auto rounded-(--pill) px-1.5 py-px type-label-semibold-xs ${tag[r.status].cls}`}>{tag[r.status].label}</span>
          </button>
        );
      })}
    </div>
  );
}

