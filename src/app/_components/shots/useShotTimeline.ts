"use client";

/**
 * 랜딩 흐름 화면의 타임라인 — ShotFrame.onVisible에 물려 한 번만 돌고, 사라지면 남은 타이머를 거둔다
 * 위치: src/app/_components/shots/useShotTimeline.ts
 *
 * run(steps, finish): steps는 [ms, 할 일] 목록. 움직임 줄이기면 steps를 건너뛰고 finish만 불러 끝 상태로 간다.
 */

import { useEffect, useRef } from "react";

export type ShotStep = [number, () => void];

export function useShotTimeline() {
  const timers = useRef<number[]>([]);
  const started = useRef(false);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (steps: ShotStep[], finish: () => void) => {
    if (started.current) return;
    started.current = true;
    const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      finish();
      return;
    }
    steps.forEach(([at, fn]) => timers.current.push(window.setTimeout(fn, at)));
  };
}
