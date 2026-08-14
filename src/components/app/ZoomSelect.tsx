"use client";

/**
 * 줌 선택 드롭다운 — 툴바 우측 "100% ⌄" (그리드 셀 크기 배율)
 * 위치: src/components/app/ZoomSelect.tsx
 *
 * 이산 5단계(50~150%). 셀 기준 폭 × 배율로 그리드 밀도를 사용자가 정한다.
 * 툴바가 하단에 있으므로 메뉴는 위로 열린다.
 */

import { useEffect, useRef, useState } from "react";
import { DropdownIcon } from "@/components/icons";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;
export type ZoomLevel = (typeof ZOOM_LEVELS)[number];

export function ZoomSelect({
  value,
  onChange,
  direction = "up",
}: {
  value: ZoomLevel;
  onChange: (zoom: ZoomLevel) => void;
  /** 메뉴가 열리는 방향 — 하단 툴바에선 up(기본), 탑바에선 down */
  direction?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="확대 비율"
        className="flex cursor-pointer items-center gap-1 type-body-medium text-fg-neutral"
      >
        {Math.round(value * 100)}%
        <DropdownIcon
          size={16}
          className={`transition-transform duration-fast ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 flex w-24 flex-col rounded-(--radius-8) border border-stroke-neutral-muted bg-bg-layer-default p-1 shadow-(--shadow-hover) ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2 z-20"
          }`}
        >
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="option"
              aria-selected={level === value}
              onClick={() => {
                onChange(level);
                setOpen(false);
              }}
              className={`w-full cursor-pointer rounded-(--radius-4) px-3 py-1.5 text-left type-body-medium transition-colors duration-fast hover:bg-bg-layer-default-hover ${
                level === value
                  ? "bg-bg-layer-default-hover text-fg-neutral"
                  : "text-fg-neutral-muted"
              }`}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
