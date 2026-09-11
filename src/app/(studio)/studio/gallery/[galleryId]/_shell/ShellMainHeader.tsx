"use client";

/**
 * 메인 헤더 — 제목(경로) · 줌 슬라이더 · 보기 토글 · 정렬/필터 버튼 (디자이너 시안 문법)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader.tsx
 *
 * 장수는 사이드바가 보여주고 여기서는 보는 방법만 다룬다. 촬영 순은 사진에 촬영 시각이 없어
 * 준비 중(백엔드 요청). 한 장 보기는 B1 뒤.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CheckCircleIcon,
  GridViewIcon,
  SingleViewIcon,
  SwapVertIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";

export type SortKey = "uploaded" | "name";
export type FilterKey = "none" | "review" | "unsorted";

const SORT_LABEL: Record<SortKey, string> = { uploaded: "업로드 순", name: "이름 순" };
const FILTER_LABEL: Record<Exclude<FilterKey, "none">, string> = {
  review: "검토 필요만",
  unsorted: "미분류만",
};

export function ShellMainHeader({
  title,
  zoom,
  onZoomChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  onSingleView,
  sortable = true,
}: {
  title: ReactNode;
  /** 0~100 — 타일 폭으로 바뀐다 */
  zoom: number;
  onZoomChange: (zoom: number) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  filter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  onSingleView: () => void;
  /** false면 정렬 · 필터 버튼을 숨긴다(선택한 사진 보기 — 고른 순 고정) */
  sortable?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const buttonLabel = filter === "none" ? SORT_LABEL[sort] : FILTER_LABEL[filter];

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
      <h2 className="flex min-w-0 items-center gap-1.5 type-title-s text-contents-light-bgd-default">
        {title}
      </h2>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1.5 type-content-xs text-contents-light-bgd-weakness">
          <span className="w-8 text-right tabular-nums">{zoom}%</span>
          <button
            type="button"
            aria-label="사진 작게"
            disabled={zoom <= 0}
            onClick={() => onZoomChange(Math.max(0, zoom - 10))}
            className="grid size-6 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-weakness transition-colors duration-fast hover:bg-surface-default-light hover:text-contents-light-bgd-default disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ZoomOutIcon size={16} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            aria-label="사진 크기"
            className="h-1 w-24 cursor-pointer appearance-none rounded-(--pill) bg-border-default accent-contents-light-bgd-default"
          />
          <button
            type="button"
            aria-label="사진 크게"
            disabled={zoom >= 100}
            onClick={() => onZoomChange(Math.min(100, zoom + 10))}
            className="grid size-6 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-weakness transition-colors duration-fast hover:bg-surface-default-light hover:text-contents-light-bgd-default disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ZoomInIcon size={16} />
          </button>
        </div>

        <div className="flex gap-0.5" role="group" aria-label="보기">
          <IconButton icon={<GridViewIcon size={18} />} aria-label="그리드" selected />
          <IconButton icon={<SingleViewIcon size={18} />} aria-label="한 장 보기" onClick={onSingleView} />
        </div>

        {sortable && <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-(--radius-8) bg-surface-default-light px-3 type-content-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-medium ${
              filter !== "none" ? "font-semibold" : ""
            }`}
          >
            {buttonLabel}
            <span className="flex text-contents-light-bgd-sub">
              <SwapVertIcon size={18} />
            </span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 z-20 mt-1 flex w-44 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover)"
            >
              <p className="px-2.5 pt-1.5 pb-0.5 type-label-semibold-xs text-contents-light-bgd-weakness">정렬</p>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <MenuRow
                  key={key}
                  label={SORT_LABEL[key]}
                  checked={sort === key}
                  onClick={() => {
                    onSortChange(key);
                    setMenuOpen(false);
                  }}
                />
              ))}
              <MenuRow label="촬영 순" trailing="준비 중" disabled onClick={() => {}} />
              <div className="my-1 h-px bg-divider-default" />
              <p className="px-2.5 pt-0.5 pb-0.5 type-label-semibold-xs text-contents-light-bgd-weakness">필터</p>
              {(Object.keys(FILTER_LABEL) as Exclude<FilterKey, "none">[]).map((key) => (
                <MenuRow
                  key={key}
                  label={FILTER_LABEL[key]}
                  checked={filter === key}
                  onClick={() => {
                    onFilterChange(filter === key ? "none" : key);
                    setMenuOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}

function MenuRow({
  label,
  checked = false,
  trailing,
  disabled = false,
  onClick,
}: {
  label: string;
  checked?: boolean;
  trailing?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-(--radius-4) px-2.5 py-2 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:text-contents-light-bgd-disabled disabled:hover:bg-transparent ${
        checked ? "font-semibold text-contents-light-bgd-default" : "text-contents-light-bgd-default"
      }`}
    >
      {label}
      {checked && (
        <span className="flex text-brand-secondary-default">
          <CheckCircleIcon size={16} />
        </span>
      )}
      {trailing && <span className="type-content-xs text-contents-light-bgd-weakness">{trailing}</span>}
    </button>
  );
}
