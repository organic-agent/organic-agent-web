"use client";

/**
 * 작가 — 스튜디오 헤더 (와이어프레임 03 스튜디오 화면)
 * 위치: src/components/photographer/StudioHeader.tsx
 *
 * 좌: 스튜디오 이름 + 단계별 개수 요약 / 우: 이용권 pill + 단계 필터 버튼(현재 필터 이름을 항상
 * 표시, 기본 "전체") + 팝업. 필터는 전체(보관 제외) · 5단계 · 보관됨 — 목록을 한 번에 받아
 * 개수까지 보여주려고 목록 API의 stage 파라미터 대신 클라이언트에서 거른다.
 */

import { useEffect, useRef, useState } from "react";
import {
  ACTIVE_STAGES,
  STAGE_LABEL,
  type StageFilter,
  stageFilterLabel,
} from "@/app/(studio)/_lib/galleryStatus";
import type { GalleryListItem } from "@/app/(studio)/studio/_lib/useGalleryList";
import {
  ArchiveIcon,
  DropdownIcon,
  FilterIcon,
  TicketIcon,
} from "@/components/icons";
import { MenuItem } from "@/components/ui/MenuItem";
import type { GalleryStage } from "@/lib/api/galleries";
import type { StudioTickets } from "@/lib/studioTickets";

export function StudioHeader({
  studioName,
  galleries,
  stageFilter,
  onStageFilterChange,
  tickets,
  onTicketClick,
}: {
  studioName: string;
  galleries: GalleryListItem[];
  stageFilter: StageFilter;
  onStageFilterChange: (filter: StageFilter) => void;
  /** 스튜디오를 아직 모르면(서버 조회 전) null — pill을 그리지 않는다 */
  tickets: StudioTickets | null;
  /** pill의 "추가" — 이용권 결제 모달을 연다 */
  onTicketClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭·ESC로 닫기
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const countFor = (stage: GalleryStage) =>
    galleries.filter((g) => g.stage === stage).length;
  const activeCount = galleries.filter((g) => g.stage !== "ARCHIVED").length;
  const summary = ACTIVE_STAGES.map((stage) => [stage, countFor(stage)] as const).filter(
    ([, n]) => n > 0,
  );

  function pick(filter: StageFilter) {
    onStageFilterChange(filter);
    setOpen(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-wrap flex-wrap items-start justify-between gap-x-6 gap-y-3 px-6 pt-8 pb-1">
      <div className="min-w-0">
        <h1 className="truncate type-title-xl text-contents-light-bgd-default">
          {studioName}
        </h1>
        <p className="mt-1 type-content-s text-contents-light-bgd-sub">
          {summary.length === 0
            ? "아직 갤러리가 없어요"
            : summary.map(([stage, n], i) => (
                <span key={stage}>
                  {i > 0 && " · "}
                  {STAGE_LABEL[stage]}{" "}
                  <b className="font-semibold text-brand-secondary-dark">{n}</b>
                </span>
              ))}
        </p>
      </div>

      <div ref={menuRef} className="relative flex shrink-0 items-center gap-2">
        {tickets && <TicketPill tickets={tickets} onClick={onTicketClick} />}
        <button
          type="button"
          data-coach="filter"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-(--pill) border bg-background-default-main pr-2 pl-3 type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness ${
            open ? "border-contents-light-bgd-default" : "border-border-default"
          }`}
        >
          <FilterIcon size={18} />
          <span>{stageFilterLabel(stageFilter)}</span>
          <span className="flex text-contents-light-bgd-sub">
            <DropdownIcon size={18} />
          </span>
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute top-full right-0 z-20 mt-1 flex w-52 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover)"
          >
            <MenuItem
              label="전체"
              count={activeCount}
              selected={stageFilter === "ALL"}
              onClick={() => pick("ALL")}
            />
            {ACTIVE_STAGES.map((stage) => (
              <MenuItem
                key={stage}
                label={STAGE_LABEL[stage]}
                count={countFor(stage)}
                selected={stageFilter === stage}
                onClick={() => pick(stage)}
              />
            ))}
            <div className="my-1 h-px bg-divider-default" />
            <MenuItem
              label={STAGE_LABEL.ARCHIVED}
              icon={<ArchiveIcon size={18} />}
              count={countFor("ARCHIVED")}
              selected={stageFilter === "ARCHIVED"}
              onClick={() => pick("ARCHIVED")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** 이용권 pill — 없음(회색, 배너가 결제 동선을 맡음) · 남음(올리브 + 추가) · 다 씀(경고색 + 추가) */
function TicketPill({
  tickets,
  onClick,
}: {
  tickets: StudioTickets;
  onClick: () => void;
}) {
  if (tickets.state === "none") {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-(--pill) bg-surface-default-light px-3.5 type-label-semibold-xs text-contents-light-bgd-sub">
        <TicketIcon size={16} />
        이용권 없음
      </span>
    );
  }
  const full = tickets.state === "full";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-(--pill) px-3.5 type-label-semibold-xs transition-colors duration-fast ${
        full
          ? "bg-function-warning-background text-function-warning-default hover:bg-function-warning-surface"
          : "bg-brand-secondary-background text-brand-secondary-dark hover:bg-brand-secondary-surface1"
      }`}
    >
      <TicketIcon size={16} />
      이용권 {tickets.remaining}개 남음
      <span className="ml-0.5 font-normal underline underline-offset-2">추가</span>
    </button>
  );
}
