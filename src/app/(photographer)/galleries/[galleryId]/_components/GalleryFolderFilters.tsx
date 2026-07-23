"use client";

/**
 * 작가 — 갤러리 폴더 필터
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryFolderFilters.tsx
 *
 * 장면/인물 기준으로 폴더나 선택본 목록을 걸러볼 때 쓰는 공통 필터 UI다.
 * 사진 탭과 최종 선택본 탭이 같은 필터 경험을 공유한다.
 *
 * 주요 책임:
 * - 장면 필터 드롭다운 렌더링
 * - 인물 필터 드롭다운 렌더링
 * - 필터 변경 이벤트 전달
 */

import { useRef, useState, type ReactNode } from "react";
import { useClickOutside } from "../../../_hooks/useClickOutside";
import { PERSON_FILTERS, SCENE_FILTERS } from "@/lib/galleryPhotos";

function SceneIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M21 16l-4.5-4.5L9 19" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-ink-3 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconFilterDropdown({
  icon,
  prefix,
  values,
  options,
  onChange,
  align = "left",
}: {
  icon: ReactNode;
  prefix: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => setOpen(false));
  const displayValue =
    values.length === 0
      ? "전체"
      : values.length === 1
        ? values[0]
        : `${values.length}개`;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-9 pl-3 pr-2.5 rounded-pill border border-line text-[12.5px] font-medium text-ink-2 bg-white outline-none hover:border-line-strong focus:border-ink-3 transition-colors inline-flex items-center gap-1.5"
      >
        <span className="text-ink-3">{icon}</span>
        {prefix} {displayValue}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+6px)] z-20 w-[104px] bg-white border border-line rounded-lg shadow-md py-1.5`}
        >
          {options.map((opt) => {
            const active = opt === "전체" ? values.length === 0 : values.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  if (opt === "전체") {
                    onChange([]);
                    return;
                  }
                  onChange(
                    active
                      ? values.filter((value) => value !== opt)
                      : [...values, opt],
                  );
                }}
                className={`w-full text-left px-2.5 py-2.5 text-[13px] transition-colors flex items-center gap-2 ${
                  active
                    ? "text-ink font-medium bg-paper-deep"
                    : "text-ink-2 hover:bg-paper-deep"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border grid place-items-center text-[10px] ${
                    active
                      ? "bg-ink border-ink text-on-ink"
                      : "border-line-strong text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                {opt}
              </button>
            );
          })}
          <div className="border-t border-line mt-1.5 pt-1.5 px-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full h-8 rounded-md bg-ink text-on-ink text-[11px] font-medium"
            >
              선택 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  sceneFilters: string[];
  personFilters: string[];
  onSceneFiltersChange: (values: string[]) => void;
  onPersonFiltersChange: (values: string[]) => void;
};

export function GalleryFolderFilters({
  sceneFilters,
  personFilters,
  onSceneFiltersChange,
  onPersonFiltersChange,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <IconFilterDropdown
        icon={<SceneIcon />}
        prefix="장면"
        values={sceneFilters}
        options={SCENE_FILTERS}
        onChange={onSceneFiltersChange}
      />
      <IconFilterDropdown
        icon={<PersonIcon />}
        prefix="인물"
        values={personFilters}
        options={PERSON_FILTERS}
        onChange={onPersonFiltersChange}
        align="right"
      />
    </div>
  );
}
