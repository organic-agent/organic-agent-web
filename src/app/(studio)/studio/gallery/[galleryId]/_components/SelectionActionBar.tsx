"use client";

/**
 * 다중 선택 액션 바 (피그마 Bar/Selection kind=folder/photos/trash 대응)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_components/SelectionActionBar.tsx
 *
 * 사진을 선택하면 그리드 하단 중앙에 떠서 마우스만으로 다음을 처리한다:
 * - 폴더 열람: 다른 폴더로 이동 · 폴더에서 빼기 (+ 전체 선택 · 휴지통으로 이동)
 * - 모든 사진: 전체 선택 · 휴지통으로 이동
 * - 휴지통: 전체 선택 · 복원 · 완전 삭제
 * 넘긴 핸들러만 항목으로 나타난다. 위험 액션(휴지통·완전 삭제)은 붉게 —
 * 검정 바 위라 fg.critical 대신 밝은 red-300을 쓴다(피그마 확정색).
 */

import { useState } from "react";

type MoveTarget = { folderId: number; name: string };

type SelectionActionBarProps = {
  count: number;
  /** 이동 대상 — 같은 앨범의 다른 폴더들 (폴더 열람에서만) */
  targets?: MoveTarget[];
  onMove?: (folderId: number) => void;
  onRemove?: () => void;
  onSelectAll?: () => void;
  /** 휴지통으로 이동 (위험 표시) */
  onTrash?: () => void;
  onRestore?: () => void;
  /** 완전 삭제 (위험 표시) */
  onErase?: () => void;
};

const itemCls =
  "cursor-pointer type-label-medium-m text-contents-dark-bgd-default hover:underline";
const dangerCls = "cursor-pointer type-label-medium-m text-[#fca5a5] hover:underline";

export function SelectionActionBar({
  count,
  targets = [],
  onMove,
  onRemove,
  onSelectAll,
  onTrash,
  onRestore,
  onErase,
}: SelectionActionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center">
      {pickerOpen && targets.length > 0 && onMove && (
        <div className="mb-2 min-w-40 rounded-(--radius-12) border border-divider-default bg-background-default-main p-1.5 shadow-(--shadow-hover)">
          {targets.map((target) => (
            <button
              key={target.folderId}
              type="button"
              onClick={() => {
                setPickerOpen(false);
                onMove(target.folderId);
              }}
              className="block w-full cursor-pointer truncate rounded-(--radius-4) px-3 py-1.5 text-left type-content-m text-contents-light-bgd-default hover:bg-surface-default-lightness"
            >
              {target.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 rounded-(--pill) border border-surface-inverse-medium bg-background-inverse-main px-5 py-2.5 whitespace-nowrap shadow-(--shadow-hover)">
        <span className="type-label-medium-m text-contents-dark-bgd-default">
          {count}장 선택됨
        </span>
        <span className="h-3.5 w-px bg-[rgba(255,255,255,0.25)]" />
        {onSelectAll && (
          <button type="button" onClick={onSelectAll} className={itemCls}>
            전체 선택
          </button>
        )}
        {targets.length > 0 && onMove && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className={itemCls}
          >
            다른 폴더로 이동
          </button>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} className={itemCls}>
            폴더에서 빼기
          </button>
        )}
        {onRestore && (
          <button type="button" onClick={onRestore} className={itemCls}>
            복원
          </button>
        )}
        {onTrash && (
          <button type="button" onClick={onTrash} className={dangerCls}>
            휴지통으로 이동
          </button>
        )}
        {onErase && (
          <button type="button" onClick={onErase} className={dangerCls}>
            완전 삭제
          </button>
        )}
        <span className="h-3.5 w-px bg-[rgba(255,255,255,0.25)]" />
        <span className="type-content-xs text-[rgba(255,255,255,0.6)]">
          Esc 해제
        </span>
      </div>
    </div>
  );
}
