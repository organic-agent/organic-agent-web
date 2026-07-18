/**
 * 작가 — 갤러리 상태 필터
 * 위치: src/app/(photographer)/galleries/_components/GalleryStatusFilter.tsx
 *
 * 갤러리 목록 상단의 상태 필터 드롭다운을 렌더링한다.
 * 상태별 갤러리 수를 함께 보여주고, 바깥 클릭 시 닫는다.
 *
 * 주요 책임:
 * - 상태 필터 드롭다운 열림 상태 관리
 * - 상태별 개수 표시
 * - 선택된 상태 변경 이벤트 전달
 */

import { useRef, useState } from "react";
import { useClickOutside } from "../../_hooks/useClickOutside";
import type { Gallery } from "@/lib/galleries";
import { getGalleryBadge } from "@/lib/galleries";
import { STATUS_FILTERS, statusDotColor } from "../_lib/galleryList";

type Props = {
  galleries: Gallery[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
};

export function GalleryStatusFilter({
  galleries,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterRef, filterOpen, () => setFilterOpen(false));

  function statusCount(status: string) {
    if (status === "전체") return galleries.length;
    return galleries.filter((g) => getGalleryBadge(g).label === status).length;
  }

  return (
    <div className="relative inline-block" ref={filterRef}>
      <button
        type="button"
        onClick={() => setFilterOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={filterOpen}
        className="h-10 pl-4 pr-3 rounded-pill border border-line text-[13px] font-medium text-ink-2 bg-white outline-none hover:border-line-strong focus:border-ink-3 transition-colors inline-flex items-center gap-2"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${statusDotColor(statusFilter)}`}
        />
        {statusFilter}
        <span className="text-ink-3 font-normal">
          ({statusCount(statusFilter)})
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-ink-3 transition-transform ${filterOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {filterOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[168px] bg-white border border-line rounded-lg shadow-md py-1.5"
        >
          {STATUS_FILTERS.map((status) => {
            const active = status === statusFilter;
            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onStatusFilterChange(status);
                  setFilterOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left transition-colors ${
                  active
                    ? "text-ink font-medium bg-paper-deep"
                    : "text-ink-2 hover:bg-paper-deep"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${statusDotColor(status)}`}
                />
                <span className="flex-1">{status}</span>
                <span className="text-ink-3 font-normal">
                  {statusCount(status)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
