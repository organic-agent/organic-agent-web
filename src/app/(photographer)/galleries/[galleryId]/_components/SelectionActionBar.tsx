"use client";

/**
 * 다중 선택 액션 바 (사진·휴지통 대응)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/SelectionActionBar.tsx
 *
 * 사진을 선택하면 그리드 하단 중앙에 떠서 마우스만으로 다음을 처리한다:
 * - 모든 사진: 전체 선택 · 휴지통으로 이동
 * - 휴지통: 전체 선택 · 복원 · 완전 삭제
 * 넘긴 핸들러만 항목으로 나타난다. 위험 액션(휴지통·완전 삭제)은 붉게 —
 * 검정 바 위라 fg.critical 대신 밝은 red-300을 쓴다(피그마 확정색).
 */

type SelectionActionBarProps = {
  count: number;
  onSelectAll?: () => void;
  /** 휴지통으로 이동 (위험 표시) */
  onTrash?: () => void;
  onRestore?: () => void;
  /** 완전 삭제 (위험 표시) */
  onErase?: () => void;
};

const itemCls =
  "cursor-pointer type-label-button text-fg-neutral-inverted hover:underline";
const dangerCls = "cursor-pointer type-label-button text-[#fca5a5] hover:underline";

export function SelectionActionBar({
  count,
  onSelectAll,
  onTrash,
  onRestore,
  onErase,
}: SelectionActionBarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center">
      <div className="flex items-center gap-3 rounded-(--pill) border border-stroke-neutral-inverted bg-bg-neutral-inverted px-5 py-2.5 whitespace-nowrap shadow-(--shadow-hover)">
        <span className="type-label-button text-fg-neutral-inverted">
          {count}장 선택됨
        </span>
        <span className="h-3.5 w-px bg-[rgba(255,255,255,0.25)]" />
        {onSelectAll && (
          <button type="button" onClick={onSelectAll} className={itemCls}>
            전체 선택
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
        <span className="type-body-small text-[rgba(255,255,255,0.6)]">
          Esc 해제
        </span>
      </div>
    </div>
  );
}
