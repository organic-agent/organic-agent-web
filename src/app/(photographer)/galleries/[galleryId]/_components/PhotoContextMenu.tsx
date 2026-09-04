"use client";

/**
 * 사진 우클릭 메뉴 — 피그마 Menu/Context target=photo-manage/all-photos/trash 대응
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/PhotoContextMenu.tsx
 *
 * 선택된 사진 위에서 우클릭하면 선택 전체가 대상이다(호출부가 보장).
 * 넘긴 핸들러만 항목으로 나타난다:
 * - 모든 사진: 전체 선택 · 휴지통으로 이동
 * - 휴지통: 전체 선택 · 복원 · 완전 삭제
 * 바깥 클릭·Esc(호출부)로 닫힌다. 사진에는 ⋯ 버튼을 두지 않는다(시안 확정).
 */

import { useEffect, useRef } from "react";

type PhotoContextMenuProps = {
  x: number;
  y: number;
  count: number;
  onSelectAll?: () => void;
  /** 휴지통으로 이동 (위험 표시) */
  onTrash?: () => void;
  onRestore?: () => void;
  /** 완전 삭제 (위험 표시) */
  onErase?: () => void;
  onClose: () => void;
};

const itemCls =
  "block w-full cursor-pointer rounded-(--radius-4) px-3 py-1.5 text-left type-body-medium text-fg-neutral hover:bg-bg-layer-default-hover";
const dangerCls =
  "block w-full cursor-pointer rounded-(--radius-4) px-3 py-1.5 text-left type-body-medium text-fg-critical hover:bg-bg-layer-default-hover";

export function PhotoContextMenu({
  x,
  y,
  count,
  onSelectAll,
  onTrash,
  onRestore,
  onErase,
  onClose,
}: PhotoContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  // 화면 밖으로 넘치지 않게 보정 (렌더 시점은 항상 클라이언트 — 우클릭 후에만 열림)
  const left = Math.min(x, window.innerWidth - 208);
  const top = Math.min(y, window.innerHeight - 240);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`선택한 ${count}장 관리`}
      style={{ left, top }}
      className="fixed z-40 w-48 rounded-(--radius-12) border border-stroke-neutral-muted bg-bg-layer-default p-1.5 shadow-(--shadow-hover)"
    >
      <p className="px-3 py-1 type-body-small text-fg-neutral-muted">
        선택한 {count}장
      </p>
      <div className="my-1 h-px bg-stroke-neutral-muted" />
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
    </div>
  );
}
