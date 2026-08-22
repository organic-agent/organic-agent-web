"use client";

/**
 * 폴더 안 사진 우클릭 메뉴 — 피그마 Menu/Context target=photo 대응 (이슈 #31)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/PhotoContextMenu.tsx
 *
 * 선택된 사진 위에서 우클릭하면 선택 전체가 대상이다(호출부가 보장).
 * "다른 폴더로 이동"은 같은 앨범의 다른 폴더 목록을 안에서 펼친다.
 * 바깥 클릭·Esc(호출부)로 닫힌다. 사진에는 ⋯ 버튼을 두지 않는다(시안 확정).
 */

import { useEffect, useRef, useState } from "react";

type MoveTarget = { folderId: number; name: string };

type PhotoContextMenuProps = {
  x: number;
  y: number;
  count: number;
  targets: MoveTarget[];
  onMove: (folderId: number) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function PhotoContextMenu({
  x,
  y,
  count,
  targets,
  onMove,
  onRemove,
  onClose,
}: PhotoContextMenuProps) {
  const [moveOpen, setMoveOpen] = useState(false);
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
  const top = Math.min(y, window.innerHeight - 200);

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
      {targets.length > 0 && (
        <button
          type="button"
          onClick={() => setMoveOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between rounded-(--radius-4) px-3 py-1.5 text-left type-body-medium text-fg-neutral hover:bg-bg-layer-default-hover"
        >
          다른 폴더로 이동
          <span
            className={`text-fg-neutral-muted transition-transform duration-fast ${moveOpen ? "rotate-90" : ""}`}
          >
            ▸
          </span>
        </button>
      )}
      {moveOpen &&
        targets.map((target) => (
          <button
            key={target.folderId}
            type="button"
            onClick={() => onMove(target.folderId)}
            className="block w-full cursor-pointer truncate rounded-(--radius-4) py-1.5 pr-3 pl-7 text-left type-body-medium text-fg-neutral hover:bg-bg-layer-default-hover"
          >
            {target.name}
          </button>
        ))}
      <button
        type="button"
        onClick={onRemove}
        className="block w-full cursor-pointer rounded-(--radius-4) px-3 py-1.5 text-left type-body-medium text-fg-neutral hover:bg-bg-layer-default-hover"
      >
        폴더에서 빼기
      </button>
    </div>
  );
}
