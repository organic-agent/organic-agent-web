"use client";

/**
 * 랜딩 흐름 화면의 타임라인 — ShotFrame.onVisible에 물려 돌고, 화면에서 완전히 빠지면(onHidden) 멈췄다가 다시 들어오면 처음부터
 * 위치: src/app/_components/shots/useShotTimeline.ts
 *
 * run(steps, finish): steps는 [ms, 할 일] 목록. 돌던 타이머는 먼저 거둔다. 움직임 줄이기면 steps를 건너뛰고 finish만 불러 끝 상태로 간다.
 * stop(): 남은 타이머를 거둔다 — 화면이 빠질 때 처음 상태로 되감기 전에 부른다(2026-11-23 수민: 다시 스크롤되면 다시 움직이게).
 */

import { useCallback, useEffect, useRef } from "react";

export type ShotStep = [number, () => void];

export function useShotTimeline() {
  const timers = useRef<number[]>([]);
  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => stop, [stop]);
  const run = (steps: ShotStep[], finish: () => void) => {
    stop();
    const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      finish();
      return;
    }
    steps.forEach(([at, fn]) => timers.current.push(window.setTimeout(fn, at)));
  };
  return { run, stop };
}
