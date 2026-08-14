"use client";

/**
 * 작가 — 스튜디오 헤더 (피그마 Photographer/Header 대응)
 * 위치: src/components/photographer/StudioHeader.tsx
 *
 * 좌: 스튜디오 이름 / 우: 상태 필터 버튼 + 팝업.
 * 카드에서 상태 배지를 없앤 결정의 대응물로, 상태별 조회는 전부 이 필터가 담당한다.
 * 필터가 걸려 있으면 버튼 옆에 현재 필터 라벨을 보여줘 활성 상태를 드러낸다.
 * 내용은 랜딩과 같은 중앙 컨테이너(max-w-wrap)에 맞추고 보더만 전체 폭을 쓴다.
 */

import { useEffect, useRef, useState } from "react";
import { FilterIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/MenuItem";
import {
  GALLERY_STAGES,
  getGalleryBadge,
  type Gallery,
} from "@/lib/galleries";

/** 전체 + 선형 단계 + 보정 요청(전달 완료 앞에 삽입) — 구 목록 화면과 같은 순서 */
const STATUS_FILTERS = [
  "전체",
  ...GALLERY_STAGES.slice(0, -1),
  "보정 요청 있음",
  GALLERY_STAGES[GALLERY_STAGES.length - 1],
];

export function StudioHeader({
  studioName,
  galleries,
  statusFilter,
  onStatusFilterChange,
}: {
  studioName: string;
  galleries: Gallery[];
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
    return galleries.filter((g) => getGalleryBadge(g).label === filter).length;
  }

  return (
    <div className="border-b border-stroke-neutral-muted bg-bg-layer-default">
      <div className="mx-auto flex h-12 w-full max-w-wrap items-center justify-between px-6">
        <h1 className="truncate type-heading-page text-fg-neutral">
          {studioName}
        </h1>

        <div ref={menuRef} className="relative flex shrink-0 items-center gap-2">
          {statusFilter !== "전체" && (
            <span className="type-label-button text-fg-neutral">
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
              className="absolute right-0 top-full z-20 mt-1 flex w-48 flex-col rounded-(--radius-8) border border-stroke-neutral-muted bg-bg-layer-default p-1 shadow-(--shadow-hover)"
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
