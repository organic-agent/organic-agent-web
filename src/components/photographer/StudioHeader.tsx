"use client";

/**
 * 작가 — 스튜디오 헤더 (피그마 Photographer/Header 대응)
 * 위치: src/components/photographer/StudioHeader.tsx
 *
 * 좌: 스튜디오 이름 / 우: 상태 필터 버튼 + 팝업.
 * 필터는 서버 status 3종(준비 중/진행 중/마감) + 전체 — 목록 API에 필터가
 * 없어 클라이언트에서 거른다. 필터가 걸려 있으면 버튼 옆에 현재 필터
 * 라벨을 보여줘 활성 상태를 드러낸다.
 * 내용은 랜딩과 같은 중앙 컨테이너(max-w-wrap)에 맞추고 보더만 전체 폭을 쓴다.
 */

import { useEffect, useRef, useState } from "react";
import { STATUS_LABEL } from "@/app/(photographer)/_lib/galleryStatus";
import type { GalleryListItem } from "@/app/(photographer)/galleries/_lib/useGalleryList";
import { FilterIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/MenuItem";

export const STATUS_FILTERS = [
  "전체",
  STATUS_LABEL.DRAFT,
  STATUS_LABEL.OPEN,
  STATUS_LABEL.CLOSED,
];

export function StudioHeader({
  studioName,
  galleries,
  statusFilter,
  onStatusFilterChange,
}: {
  studioName: string;
  galleries: GalleryListItem[];
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function countFor(filter: string) {
    if (filter === "전체") return galleries.length;
    return galleries.filter((g) => STATUS_LABEL[g.status] === filter).length;
  }

  return (
    <div className="border-b border-divider-default bg-background-default-main">
      <div className="mx-auto flex h-12 w-full max-w-wrap items-center justify-between px-6">
        <h1 className="truncate type-title-l text-contents-light-bgd-default">
          {studioName}
        </h1>

        <div ref={menuRef} className="relative flex shrink-0 items-center gap-2">
          {statusFilter !== "전체" && (
            <span className="type-label-medium-m text-contents-light-bgd-default">
              {statusFilter}
            </span>
          )}
          <IconButton
            icon={<FilterIcon size={20} />}
            aria-label="상태 필터"
            selected={open || statusFilter !== "전체"}
            onClick={() => setOpen((v) => !v)}
          />

          {open && (
            <div
              role="listbox"
              className="absolute right-0 top-full z-20 mt-1 flex w-48 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover)"
            >
              {STATUS_FILTERS.map((filter) => (
                <MenuItem
                  key={filter}
                  label={filter}
                  count={countFor(filter)}
                  selected={filter === statusFilter}
                  onClick={() => {
                    onStatusFilterChange(filter);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
