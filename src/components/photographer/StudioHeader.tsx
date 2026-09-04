"use client";

/**
 * 작가 — 스튜디오 헤더 (피그마 Photographer/Header 대응)
 * 위치: src/components/photographer/StudioHeader.tsx
 *
 * 좌: 스튜디오 이름 / 우: 상태 필터 버튼 + 팝업.
 * 필터는 서버 stage 6종 + 전체이며 `?stage=`로 다시 조회한다. 필터가 걸려 있으면 버튼 옆에 현재 필터
 * 라벨을 보여줘 활성 상태를 드러낸다.
 * 내용은 랜딩과 같은 중앙 컨테이너(max-w-wrap)에 맞추고 보더만 전체 폭을 쓴다.
 */

import { useEffect, useRef, useState } from "react";
import { STAGE_LABEL } from "@/app/(photographer)/_lib/galleryStatus";
import type { GalleryResponse } from "@/lib/api/galleries";
import type { GalleryListItem } from "@/app/(photographer)/galleries/_lib/useGalleryList";
import { FilterIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/MenuItem";

export const STAGE_FILTERS: { value: GalleryResponse["stage"]; label: string }[] =
  Object.entries(STAGE_LABEL).map(([value, label]) => ({
    value: value as GalleryResponse["stage"],
    label,
  }));

export function StudioHeader({
  studioName,
  galleries,
  stageFilter,
  onStageFilterChange,
}: {
  studioName: string;
  galleries: GalleryListItem[];
  stageFilter: GalleryResponse["stage"] | null;
  onStageFilterChange: (filter: GalleryResponse["stage"] | null) => void;
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

  return (
    <div className="border-b border-stroke-neutral-muted bg-bg-layer-default">
      <div className="mx-auto flex h-12 w-full max-w-wrap items-center justify-between px-6">
        <h1 className="truncate type-heading-page text-fg-neutral">
          {studioName}
        </h1>

        <div ref={menuRef} className="relative flex shrink-0 items-center gap-2">
          {stageFilter !== null && (
            <span className="type-label-button text-fg-neutral">
              {STAGE_LABEL[stageFilter]}
            </span>
          )}
          <IconButton
            icon={<FilterIcon size={20} />}
            aria-label="상태 필터"
            selected={open || stageFilter !== null}
            onClick={() => setOpen((v) => !v)}
          />

          {open && (
            <div
              role="listbox"
              className="absolute right-0 top-full z-20 mt-1 flex w-48 flex-col rounded-(--radius-8) border border-stroke-neutral-muted bg-bg-layer-default p-1 shadow-(--shadow-hover)"
            >
              {[{ value: null, label: "전체" }, ...STAGE_FILTERS].map((filter) => (
                <MenuItem
                  key={filter.value ?? "all"}
                  label={filter.label}
                  count={filter.value === null ? galleries.length : undefined}
                  selected={filter.value === stageFilter}
                  onClick={() => {
                    onStageFilterChange(filter.value as GalleryResponse["stage"] | null);
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
