"use client";

/**
 * 폴더 열람 — 다중 선택 액션 바 (피그마 Bar/Selection 대응, 이슈 #31)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/SelectionActionBar.tsx
 *
 * 사진을 선택하면 그리드 하단 중앙에 떠서 마우스만으로 이동·빼기를
 * 처리한다. "다른 폴더로 이동"은 같은 앨범의 다른 폴더 목록을 위로
 * 펼쳐 고른다 — 우클릭 메뉴·드래그와 같은 API를 쓰는 세 번째 경로.
 */

import { useState } from "react";

type MoveTarget = { folderId: number; name: string };

type SelectionActionBarProps = {
  count: number;
  /** 이동 대상 — 같은 앨범의 다른 폴더들 */
  targets: MoveTarget[];
  onMove: (folderId: number) => void;
  onRemove: () => void;
};

export function SelectionActionBar({
  count,
  targets,
  onMove,
  onRemove,
}: SelectionActionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center">
      {pickerOpen && targets.length > 0 && (
        <div className="mb-2 min-w-40 rounded-(--radius-12) border border-stroke-neutral-muted bg-bg-layer-default p-1.5 shadow-(--shadow-hover)">
          {targets.map((target) => (
            <button
              key={target.folderId}
              type="button"
              onClick={() => {
                setPickerOpen(false);
                onMove(target.folderId);
              }}
              className="block w-full cursor-pointer truncate rounded-(--radius-4) px-3 py-1.5 text-left type-body-medium text-fg-neutral hover:bg-bg-layer-default-hover"
            >
              {target.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 rounded-(--pill) border border-stroke-neutral-inverted bg-bg-neutral-inverted px-5 py-2.5 whitespace-nowrap shadow-(--shadow-hover)">
        <span className="type-label-button text-fg-neutral-inverted">
          {count}장 선택됨
        </span>
        <span className="h-3.5 w-px bg-[rgba(255,255,255,0.25)]" />
        {targets.length > 0 && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="cursor-pointer type-label-button text-fg-neutral-inverted hover:underline"
          >
            다른 폴더로 이동
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="cursor-pointer type-label-button text-fg-neutral-inverted hover:underline"
        >
          폴더에서 빼기
        </button>
        <span className="h-3.5 w-px bg-[rgba(255,255,255,0.25)]" />
        <span className="type-body-small text-[rgba(255,255,255,0.6)]">
          Esc 해제
        </span>
      </div>
    </div>
  );
}
