"use client";

/**
 * 크게 보기의 사진 확대 — 배율 · 위치 계산과 더블클릭 · 끌기 · 휠 · 단계 조절 (이슈 88, 팀 노션 50번)
 * 위치: src/components/app/useLightboxZoom.ts
 *
 * 사진 상자(사진 + 그 위의 점)에 transform을 걸어 키운다. 사진이 놓이는 영역(stage)의 가운데를 0으로 잡고,
 * 누른 자리가 커서 밑에 그대로 있도록 키운다. 확대한 채 끌면 옮겨지고 사진 가장자리 밖으로는 나가지 않는다.
 * 더블클릭은 2배 ↔ 원래 크기, 휠은 커서 자리를 중심으로 1~4배, 단계 조절(버튼 · 키)은 1.5 · 2 · 3 · 4배.
 * 사진이 바뀌면(photoKey) 확대가 풀린다 — 상태에 사진 번호를 같이 적어 두고, 번호가 다르면 원래 크기로 본다.
 *
 * 쓰는 법: const zoom = useLightboxZoom({...}) →
 *   <div ref={zoom.stageRef}> <div ref={zoom.boxRef} style={zoom.style} {...zoom.boxProps}> 사진 </div> </div>
 */

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

export const ZOOM_MAX = 4;
/** 버튼 · 키로 오가는 단계 */
const STOPS = [1, 1.5, 2, 3, 4];
const DOUBLE_CLICK_SCALE = 2;
/** 이만큼 움직여야 끌기다 — 그 안이면 누르기로 본다 */
const DRAG_THRESHOLD = 4;
/** 이보다 크면 확대 중으로 본다(계산 오차로 1.0001 같은 값이 남지 않게) */
const ZOOMED_FROM = 1.01;

type View = { key: number; scale: number; x: number; y: number; smooth: boolean };
type Point = { x: number; y: number };

const CENTER: Point = { x: 0, y: 0 };

function fitOf(key: number, smooth: boolean): View {
  return { key, scale: 1, x: 0, y: 0, smooth };
}

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

/** 이 배율에서 사진이 영역 밖으로 얼마나 넘치는가 — 그만큼만 옮길 수 있다 */
function limitsOf(stage: HTMLElement, box: HTMLElement, scale: number): Point {
  return {
    x: Math.max(0, (box.offsetWidth * scale - stage.clientWidth) / 2),
    y: Math.max(0, (box.offsetHeight * scale - stage.clientHeight) / 2),
  };
}

/** 화면 좌표를 영역 가운데를 0으로 한 자리로 */
function pointIn(stage: HTMLElement, clientX: number, clientY: number): Point {
  const r = stage.getBoundingClientRect();
  return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
}

export function useLightboxZoom({
  enabled,
  photoKey,
  doubleClick,
  onZoomIn,
}: {
  enabled: boolean;
  /** 지금 보는 사진 — 바뀌면 확대가 풀린다 */
  photoKey: number;
  /** 더블클릭으로 확대할지. 사진을 누르는 것이 다른 뜻(보정 요청 점)인 동안은 끈다 */
  doubleClick: boolean;
  /** 원래 크기에서 확대로 넘어가는 순간 — 큰 사진을 불러오기 시작한다 */
  onZoomIn?: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<View>(() => fitOf(photoKey, false));
  const [dragging, setDragging] = useState(false);
  // 사진이 바뀌었으면 앞 사진의 확대는 버린다(움직임 없이 원래 크기로)
  const view = state.key === photoKey ? state : fitOf(photoKey, false);

  // 휠 · 끌기는 다시 그리기 전에 연달아 온다 — 방금 계산한 값을 여기 두고 이어서 계산한다
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });
  const drag = useRef<{ id: number; x: number; y: number; from: Point; moved: boolean } | null>(null);
  const dragged = useRef(false);

  function commit(next: View) {
    viewRef.current = next;
    setState(next);
  }

  /** 배율을 바꾼다. at은 영역 가운데를 0으로 한 자리 — 그 자리가 제자리에 있게 키운다 */
  function zoom(scaleOf: (current: number) => number, at: Point, smooth: boolean) {
    const stage = stageRef.current;
    const box = boxRef.current;
    if (!enabled || !stage || !box) return;
    const cur = viewRef.current.key === photoKey ? viewRef.current : fitOf(photoKey, false);
    const scale = Math.min(ZOOM_MAX, Math.max(1, scaleOf(cur.scale)));
    if (scale < ZOOMED_FROM) {
      commit(fitOf(photoKey, smooth));
      return;
    }
    const ratio = scale / cur.scale;
    const limits = limitsOf(stage, box, scale);
    if (cur.scale < ZOOMED_FROM) onZoomIn?.();
    commit({
      key: photoKey,
      scale,
      x: clamp(at.x - (at.x - cur.x) * ratio, limits.x),
      y: clamp(at.y - (at.y - cur.y) * ratio, limits.y),
      smooth,
    });
  }

  const stepIn = () => zoom((s) => STOPS.find((stop) => stop > s + 0.01) ?? ZOOM_MAX, CENTER, true);
  const stepOut = () => zoom((s) => [...STOPS].reverse().find((stop) => stop < s - 0.01) ?? 1, CENTER, true);
  const reset = () => zoom(() => 1, CENTER, true);

  // 휠은 화면이 같이 움직이지 않게 막아야 해서(passive: false) 직접 건다 — 최신 계산은 여기서 읽는다
  const latest = useRef(zoom);
  useEffect(() => {
    latest.current = zoom;
  });
  useEffect(() => {
    const stage = stageRef.current;
    if (!enabled || !stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // 줄 · 쪽 단위로 오는 휠은 픽셀로 바꾼다. 두 손가락 벌리기(ctrl + 휠)는 값이 작게 와서 더 민감하게 받는다
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0022));
      latest.current((s) => s * factor, pointIn(stage, e.clientX, e.clientY), false);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [enabled]);

  // 영역이 바뀌면(패널을 열고 닫음 · 창 크기) 넘친 만큼만 남게 다시 맞춘다
  useEffect(() => {
    const stage = stageRef.current;
    const box = boxRef.current;
    if (!enabled || !stage || !box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const cur = viewRef.current;
      if (cur.scale < ZOOMED_FROM) return;
      const limits = limitsOf(stage, box, cur.scale);
      const x = clamp(cur.x, limits.x);
      const y = clamp(cur.y, limits.y);
      if (x === cur.x && y === cur.y) return;
      const next = { ...cur, x, y, smooth: false };
      viewRef.current = next;
      setState(next);
    });
    observer.observe(stage);
    observer.observe(box);
    return () => observer.disconnect();
  }, [enabled]);

  const zoomed = view.scale >= ZOOMED_FROM;

  const boxProps = {
    onDoubleClick(e: MouseEvent<HTMLDivElement>) {
      const stage = stageRef.current;
      if (!doubleClick || !stage) return;
      zoom((s) => (s >= ZOOMED_FROM ? 1 : DOUBLE_CLICK_SCALE), pointIn(stage, e.clientX, e.clientY), true);
    },
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      dragged.current = false;
      if (e.button !== 0 || viewRef.current.scale < ZOOMED_FROM) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: { x: viewRef.current.x, y: viewRef.current.y }, moved: false };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // 잡을 수 없는 포인터면 그대로 둔다 — 영역 밖으로 나가면 끌기가 끊길 뿐이다
      }
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      const d = drag.current;
      const stage = stageRef.current;
      const box = boxRef.current;
      if (!d || e.pointerId !== d.id || !stage || !box) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      if (!d.moved) {
        d.moved = true;
        dragged.current = true;
        setDragging(true);
      }
      const cur = viewRef.current;
      const limits = limitsOf(stage, box, cur.scale);
      commit({ ...cur, x: clamp(d.from.x + dx, limits.x), y: clamp(d.from.y + dy, limits.y), smooth: false });
    },
    onPointerUp() {
      drag.current = null;
      setDragging(false);
    },
    onPointerCancel() {
      drag.current = null;
      setDragging(false);
    },
  };

  const style: CSSProperties | undefined = enabled
    ? { transform: `translate(${view.x.toFixed(1)}px, ${view.y.toFixed(1)}px) scale(${view.scale.toFixed(3)})` }
    : undefined;

  return {
    stageRef,
    boxRef,
    boxProps,
    style,
    scale: view.scale,
    zoomed,
    dragging,
    /** 버튼 · 키 · 더블클릭으로 바꾼 것이면 부드럽게, 끌기 · 휠이면 바로 */
    smooth: view.smooth,
    canIn: view.scale < ZOOM_MAX - 0.01,
    canOut: zoomed,
    stepIn,
    stepOut,
    reset,
    /** 방금 끌어서 옮겼는가 — 끌고 난 뒤의 클릭을 누르기로 치지 않게 한 번 읽고 지운다 */
    consumeDrag() {
      const was = dragged.current;
      dragged.current = false;
      return was;
    },
  };
}
