"use client";

/**
 * 필름스트립 접기 — 헤더 칩 토글 + 상태 훅 (C안: 헤더로 흡수, 2026-08-14 확정)
 * 위치: src/components/app/FilmstripChip.tsx
 *
 * 접으면 필름스트립 행이 통째로 사라지고(세로 이득 최대) 헤더의 이 칩만 남는다.
 * 칩은 싱글·비교 뷰에서 항상 보이며 현재 위치(n / 전체)를 함께 알려준다.
 * F 키 토글은 각 화면의 키보드 핸들러가 toggleFilmstrip을 호출한다.
 */

import { useState } from "react";
import { DropdownIcon, SlideshowIcon } from "@/components/icons";

export function useFilmstripOpen() {
  const [filmstripOpen, setFilmstripOpen] = useState(true);
  function toggleFilmstrip() {
    setFilmstripOpen((open) => !open);
  }
  return { filmstripOpen, toggleFilmstrip };
}

export function FilmstripChip({
  open,
  position,
  total,
  onToggle,
}: {
  open: boolean;
  /** 현재 사진 위치 (1부터) */
  position: number;
  total: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "필름스트립 접기" : "필름스트립 펼치기"}
      className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-(--pill) border border-stroke-neutral-muted px-3 type-body-small tabular-nums text-fg-neutral transition-colors duration-fast hover:bg-bg-layer-default-hover"
    >
      <SlideshowIcon size={14} />
      {position} / {total}
      <DropdownIcon
        size={14}
        className={`transition-transform duration-fast ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}
