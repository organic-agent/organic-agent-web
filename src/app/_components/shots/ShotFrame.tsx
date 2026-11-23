"use client";

/**
 * 랜딩 흐름 화면 틀 — 1000×560으로 그린 화면을 상자 폭에 맞춰 줄인다
 * 위치: src/app/_components/shots/ShotFrame.tsx
 *
 * 화면 4장은 앱 셸과 같은 클래스로 1000×560 고정 크기에 그리고, 이 틀이 상자 폭을 재서 zoom으로 줄인다(최대 1000).
 * 그림일 뿐이라 안은 inert — 초점도 읽기도 안 된다. 이름은 role="img"의 라벨로만. 흐름 섹션이 가운데 정렬이라 안은 text-left로 되돌린다.
 * onVisible: 상자가 화면에 35% 들어오면 한 번 — 화면이 제 타임라인(끌어오기 · 막대)을 시작하는 신호. 움직임 줄이기나
 * IntersectionObserver가 없으면 바로 부른다.
 * crop(이슈 182): 1000×560 중 보여 줄 부분(비율). 상자 비율이 그 부분에 맞춰지고 안은 상자 폭에 맞게 커진다 — 흐름 구역이
 * 2단이 되며 화면이 좁아져, 단계마다 핵심 부분만 크게 보인다. 없으면 지금처럼 전체(최대 1000).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

export const SHOT_W = 1000;
export const SHOT_H = 560;

/** 부분 확대 — 1000×560에서 보여 줄 부분. x · y는 왼쪽 위, w · h는 폭 · 높이(모두 0~1) */
export type ShotCrop = { x: number; y: number; w: number; h: number };

export function ShotFrame({
  label,
  onVisible,
  crop,
  children,
}: {
  label: string;
  onVisible?: () => void;
  crop?: ShotCrop;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const cropW = crop?.w ?? 1;
  const onVisibleRef = useRef(onVisible);
  useEffect(() => {
    onVisibleRef.current = onVisible;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !onVisibleRef.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      onVisibleRef.current();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onVisibleRef.current?.();
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 전체는 최대 1000(키우지 않음), 부분 확대는 그 부분이 상자 폭을 채우게
    const update = () => setZoom(crop ? el.clientWidth / (SHOT_W * cropW) : Math.min(1, el.clientWidth / SHOT_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [crop, cropW]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      // isolate — 화면 안 z-index(업로드 모달 등)가 틀 밖 초점 프레임 위로 올라오지 않게 쌓임을 틀 안에 가둔다
      className={`relative isolate w-full overflow-hidden rounded-(--radius-12) border border-border-light bg-background-default-main shadow-(--shadow-modal) ${crop ? "" : "max-w-250 aspect-1000/560"}`}
      style={crop ? { aspectRatio: `${SHOT_W * crop.w} / ${SHOT_H * crop.h}` } : undefined}
    >
      {/* 부분 확대면 화면을 상자 기준 %로 당겨 보여 줄 부분을 상자에 맞춘다(전체면 0 · 100%) */}
      <div
        className="absolute"
        style={
          crop
            ? { left: `${(-crop.x / crop.w) * 100}%`, top: `${(-crop.y / crop.h) * 100}%`, width: `${100 / crop.w}%`, height: `${100 / crop.h}%` }
            : { inset: 0 }
        }
      >
        <div inert className="absolute top-0 left-0 flex flex-col text-left" style={{ width: SHOT_W, height: SHOT_H, zoom }}>
          {children}
        </div>
      </div>
    </div>
  );
}
