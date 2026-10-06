"use client";

/**
 * 메인 헤더 — 제목(경로) · 줌 슬라이더 · 정렬/필터 버튼 (디자이너 시안 문법)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader.tsx
 *
 * 장수는 사이드바가 보여주고 여기서는 보는 방법만 다룬다. 촬영 순은 사진에 촬영 시각이 없어
 * 준비 중(백엔드 요청). 정렬 · 필터 항목은 기본(업로드 · 이름 · 별점 / 미분류)이고, 화면이 다른 항목을
 * 쓰면(보정 작업: 결과 없는 것 먼저 · 메모 있는 것만) customSort · customFilter로 같은 버튼 · 메뉴에 바꿔 끼운다.
 * 보기 전환(그리드 · 한 장 보기) 버튼은 두지 않는다 — 디자이너 시안의 헤더에 없고, 크게 보기는 썸네일을 눌러 여는
 * 팝업이라 전환할 상태가 없다(늘 선택된 그리드 버튼 · 화면마다 다르게 돌던 한 장 보기 버튼을 뺌, QA 2026-09-29 · 이슈 84).
 * 좁은 폭(QA 이슈 84): 제목은 줄바꿈하지 않는다. 상위 폴더 이름(titleParent)은 1024 미만이면 늘, 그 이상이면 자리가
 * 모자랄 때 › 와 함께 통째로 사라져 "하위 폴더 이름 + 장수"만 남는다. 줌 퍼센트 · 슬라이더는 1100 미만에서, 줌 전체는
 * 640 미만에서 숨기고, 정렬 버튼은 640 미만에서 아이콘만 남긴다. 좌우 여백은 480 미만에서 12px.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  SwapVertIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";

export type SortKey = "uploaded" | "name" | "score";
export type FilterKey = "none" | "unsorted";
export type MenuOption = { key: string; label: string; trailing?: string };
export type CustomMenu = { value: string; options: MenuOption[]; onChange: (key: string) => void };

const SORT_LABEL: Record<SortKey, string> = { uploaded: "업로드 순", name: "이름 순", score: "별점 순" };

/** 정렬 — 별점 순은 높은 점수부터, 같은 점수 · 없음은 업로드 순. 작가 · 클라이언트 그리드 공용 */
export function sortPhotos(list: PhotoResponse[], sort: SortKey): PhotoResponse[] {
  const sorted = [...list];
  if (sort === "name") sorted.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName, "ko"));
  else if (sort === "score") sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.displayOrder - b.displayOrder || a.photoId - b.photoId);
  else sorted.sort((a, b) => a.displayOrder - b.displayOrder || a.photoId - b.photoId);
  return sorted;
}
const FILTER_LABEL: Record<Exclude<FilterKey, "none">, string> = {
  unsorted: "미분류만",
};

export function ShellMainHeader({
  title,
  titleParent,
  zoom,
  onZoomChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  sortable = true,
  scoreSort = true,
  showFilters = true,
  leading,
  customSort,
  customFilter,
}: {
  title: ReactNode;
  /** 제목 앞에 흐리게 붙는 상위 폴더 이름("컨셉 › 세부 폴더"의 컨셉) — 좁으면 › 와 함께 통째로 사라진다 */
  titleParent?: ReactNode;
  /** 0~100 — 타일 폭으로 바뀐다 */
  zoom: number;
  onZoomChange: (zoom: number) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  filter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  /** false면 정렬 · 필터 버튼을 숨긴다(선택한 사진 보기 — 고른 순 고정) */
  sortable?: boolean;
  /** false면 정렬 메뉴에서 별점 순을 뺀다 — 아직 별점을 매길 수 없는 단계(작가 사진 업로드 · 컨셉 분류) */
  scoreSort?: boolean;
  /** false면 정렬 메뉴에서 필터(미분류만)를 뺀다 — 클라이언트 셀렉 */
  showFilters?: boolean;
  /** 줌 앞에 놓는 버튼(클라이언트 "AI 추천") */
  leading?: ReactNode;
  /** 기본 정렬 항목 대신 쓸 것 — 같은 버튼 · 메뉴 모양 */
  customSort?: CustomMenu;
  /** 기본 필터 항목 대신 쓸 것 — value "none"이면 필터 없음 */
  customFilter?: CustomMenu;
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

  const filterActive = customFilter ? customFilter.value !== "none" : filter !== "none";
  const buttonLabel = customFilter && customFilter.value !== "none"
    ? customFilter.options.find((o) => o.key === customFilter.value)?.label ?? ""
    : !customFilter && filter !== "none"
      ? FILTER_LABEL[filter]
      : customSort
        ? customSort.options.find((o) => o.key === customSort.value)?.label ?? ""
        : SORT_LABEL[sort];

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5 max-[480px]:px-3">
      {/* 한 줄 높이로 자르고 줄바꿈을 허용한다. 뒤에서부터 채워(row-reverse) 제목 묶음이 먼저 자리를 잡고,
          상위 폴더 묶음은 같은 줄에 못 들어가면 다음 줄로 넘어가 보이지 않는다. 제목 묶음만으로도 넘치면 그 안의 이름이 말줄임.
          바깥 여백(-m · p 1.5)은 잘리는 상자 안에 포커스 테두리가 들어갈 자리다 */}
      <h2 className="-m-1.5 flex h-10 min-w-0 flex-1 flex-row-reverse flex-wrap content-start justify-end gap-x-1.5 gap-y-4 overflow-hidden p-1.5 whitespace-nowrap type-title-s text-contents-light-bgd-default">
        {titleParent && (
          <span className="order-2 flex h-7 shrink-0 items-center gap-1.5 font-normal text-contents-light-bgd-weakness max-lg:hidden">
            {titleParent}
            <span className="flex">
              <ChevronRightIcon size={18} />
            </span>
          </span>
        )}
        <span className="order-1 flex h-7 max-w-full min-w-0 items-center gap-1.5">{title}</span>
      </h2>

      <div className="flex shrink-0 items-center gap-3">
        {leading}
        <div className="flex items-center gap-1.5 type-content-xs text-contents-light-bgd-weakness max-sm:hidden">
          <span className="w-8 text-right tabular-nums max-[1100px]:hidden">{zoom}%</span>
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
            className="h-1 w-24 cursor-pointer appearance-none rounded-(--pill) bg-border-default accent-contents-light-bgd-default max-[1100px]:hidden"
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

        {sortable && <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={buttonLabel}
            title={buttonLabel}
            onClick={() => setMenuOpen((v) => !v)}
            className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-(--radius-8) bg-surface-default-light px-3 whitespace-nowrap type-content-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-medium max-sm:px-2.25 ${
              filterActive ? "font-semibold" : ""
            }`}
          >
            <span className="max-sm:hidden">{buttonLabel}</span>
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
              {customSort
                ? customSort.options.map((o) => (
                    <MenuRow
                      key={o.key}
                      label={o.label}
                      trailing={o.trailing}
                      checked={customSort.value === o.key}
                      onClick={() => {
                        customSort.onChange(o.key);
                        setMenuOpen(false);
                      }}
                    />
                  ))
                : (Object.keys(SORT_LABEL) as SortKey[])
                    .filter((key) => scoreSort || key !== "score")
                    .map((key) => (
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
              {customFilter ? (
                <>
                  <div className="my-1 h-px bg-divider-default" />
                  <p className="px-2.5 pt-0.5 pb-0.5 type-label-semibold-xs text-contents-light-bgd-weakness">필터</p>
                  {customFilter.options.map((o) => (
                    <MenuRow
                      key={o.key}
                      label={o.label}
                      trailing={o.trailing}
                      checked={customFilter.value === o.key}
                      onClick={() => {
                        customFilter.onChange(customFilter.value === o.key ? "none" : o.key);
                        setMenuOpen(false);
                      }}
                    />
                  ))}
                </>
              ) : (
                showFilters && (
                  <>
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
                  </>
                )
              )}
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
