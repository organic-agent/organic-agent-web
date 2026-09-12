"use client";

/**
 * 전/후 비교 — 원본 | 결과를 슬라이더로 가르거나 나란히
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/BeforeAfter.tsx
 *
 * 두 이미지를 같은 상자에 object-contain으로 겹치고, 슬라이더 값만큼 결과를 clip-path로 드러낸다.
 * 나란히 모드는 둘을 좌우로 둔다. 작가 3단계 · 클라이언트 보정 검토(WES-313) 공용.
 */

import { useState } from "react";

export function BeforeAfter({
  before,
  after,
  beforeLabel = "원본",
  afterLabel = "결과",
  mode = "slider",
  className = "",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  mode?: "slider" | "side";
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  if (mode === "side")
    return (
      <div className={`flex gap-2 ${className}`}>
        {[
          [before, beforeLabel],
          [after, afterLabel],
        ].map(([src, label]) => (
          <div key={label} className="relative min-w-0 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label} draggable={false} className="block max-h-[calc(100dvh-56px)] w-full object-contain" />
            <span className="absolute bottom-2.5 left-2.5 rounded-(--pill) bg-black/55 px-2 py-0.5 type-label-medium-xs text-white">{label}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className={`relative inline-block ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt={beforeLabel} draggable={false} className="block max-h-[calc(100dvh-56px)] max-w-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt={afterLabel}
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 grid size-7 -translate-1/2 place-items-center rounded-full bg-white text-contents-light-bgd-default shadow-[0_2px_6px_rgba(0,0,0,.3)]">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4 2 8l4 4M10 4l4 4-4 4" />
          </svg>
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="원본과 결과 나누는 위치"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-(--pill) bg-black/55 px-2 py-0.5 type-label-medium-xs text-white">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-(--pill) bg-black/55 px-2 py-0.5 type-label-medium-xs text-white">{afterLabel}</span>
    </div>
  );
}
