"use client";

/**
 * 랜딩 흐름 화면 틀 — 1000×560으로 그린 화면을 상자 폭에 맞춰 줄인다
 * 위치: src/app/_components/shots/ShotFrame.tsx
 *
 * 화면 4장은 앱 셸과 같은 클래스로 1000×560 고정 크기에 그리고, 이 틀이 상자 폭을 재서 zoom으로 줄인다(최대 1000).
 * 그림일 뿐이라 안은 inert — 초점도 읽기도 안 된다. 이름은 role="img"의 라벨로만.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

export const SHOT_W = 1000;
export const SHOT_H = 560;

export function ShotFrame({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setZoom(Math.min(1, el.clientWidth / SHOT_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className="relative w-full max-w-250 aspect-[1000/560] overflow-hidden rounded-(--radius-12) border border-border-light bg-background-default-main shadow-(--shadow-modal)"
    >
      <div inert className="absolute top-0 left-0 flex flex-col" style={{ width: SHOT_W, height: SHOT_H, zoom }}>
        {children}
      </div>
    </div>
  );
}
