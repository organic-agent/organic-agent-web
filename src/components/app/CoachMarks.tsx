"use client";

/**
 * 첫 진입 코치마크 — 스포트라이트(대상만 밝게) + 말풍선 n단계 (공통 부품)
 * 위치: src/components/app/CoachMarks.tsx
 *
 * 스튜디오 홈(4단계)과 클라이언트 컨셉 분류(5단계)가 같이 쓴다. 한 번만 자동 재생하고 다시 보기는
 * 없다 — 끝내거나 닫으면(오른쪽 위 × · Esc) localStorage에 기록한다. 기록은 계정마다 따로다
 * (storeKey 뒤에 계정 번호) — 같은 브라우저에서 다른 계정으로 들어온 사람도 한 번은 본다. 대상은
 * data-coach 속성으로 찾고, 화면에 없는 대상은 건너뛴다. "이전"은 건너뛴 단계를 지나 그 앞 단계로 간다.
 *
 * 구멍은 대상에 맞춘다: 자리 · 크기는 대상에서 화면에 보이는 부분보다 사방 4px 크게, 둥글기는 대상의
 * 모서리에서 읽는다. 떠 있는 동안 프레임마다 다시 잰다 — 사진이 늦게 떠서 자리만 밀리는 경우는 창
 * 크기 · 스크롤 이벤트로도, 크기 감시로도 잡히지 않는다.
 *
 * 말풍선 자리는 아래 → 위 → 오른쪽 → 왼쪽 순으로 들어가는 곳을 고르고, 어디에도 자리가 없으면(폴더
 * 열·그리드처럼 화면만큼 큰 대상) 대상 안쪽 왼쪽 위에 화살표 없이 둔다. 말풍선 높이는 그려진 뒤 실제
 * 크기를 재서 쓴다(처음 한 프레임만 추정값).
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/authStore";
import { createLocalStore, type LocalStore } from "@/lib/localStore";

export type CoachStep = {
  /** data-coach 속성 값 */
  key: string;
  /** 가리킬 data-coach 값이 key와 다를 때 — 두 단계가 같은 대상을 가리킬 때 쓴다 */
  target?: string;
  eyebrow: string;
  title: string;
  body: string;
};

type Hole = { left: number; top: number; width: number; height: number; radius: string };
type Placement = "below" | "above" | "right" | "left" | "inside";

const BUBBLE_WIDTH = 300;
const GAP = 12;
const MARGIN = 12;
/** 말풍선 높이 추정값 — 실제 높이를 재기 전 첫 프레임에만 쓴다 */
const BUBBLE_HEIGHT = 180;
/** 화살표가 말풍선 모서리에 닿지 않게 하는 최소 간격 */
const ARROW_INSET = 22;
/** 구멍이 대상보다 바깥으로 나가는 여백 */
const HOLE_PAD = 4;
/** 화면 가장자리에 붙은 대상 — 구멍이 화면 밖으로 나가는 쪽만 이만큼 안으로 들여, 둥근 모서리가 잘리지 않게 한다 */
const VIEW_INSET = 6;
/** 모서리가 각진 대상(폴더 열 · 사진 영역)에 주는 둥글기 */
const SQUARE_RADIUS = 8;
/** 대상이 이만큼의 프레임(약 0.2초) 동안 안 보이면 그 단계를 건너뛴다 — 방금 열린 사이드바처럼 곧 그려질 대상을 기다린다 */
const SKIP_AFTER_FRAMES = 12;

const stores = new Map<string, LocalStore<boolean>>();
function storeFor(key: string) {
  let store = stores.get(key);
  if (!store) {
    store = createLocalStore<boolean>(key, false);
    stores.set(key, store);
  }
  return store;
}

/** 로그인 정보를 읽기 전 — 누구의 기록을 봐야 할지 모르니 이미 본 것으로 쳐서 띄우지 않는다 */
const SIGNED_OUT: LocalStore<boolean> = { get: () => true, set: () => {}, subscribe: () => () => {}, getServerSnapshot: () => true };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

const ARROW_CLASS: Record<Exclude<Placement, "inside">, string> = {
  below: "-top-1.5 border-t border-l",
  above: "-bottom-1.5 border-r border-b",
  right: "-left-1.5 border-l border-b",
  left: "-right-1.5 border-t border-r",
};

/** data-coach 값으로 대상을 찾는다 — 같은 값이 여럿이면 화면에 그려진 것(숨긴 쪽은 건너뜀) */
function findTarget(key: string) {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-coach="${key}"]`)) {
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}

const CORNERS = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"] as const;

/**
 * 둥글기를 읽을 요소 — 대상이 모양 없는 포장(버튼을 감싼 span · div)이면 그 안을 꽉 채운 자식으로 내려간다.
 * 알림 배지처럼 작게 얹힌 자식은 세지 않는다.
 */
function shapeOf(el: HTMLElement) {
  let node = el;
  for (let depth = 0; depth < 4; depth += 1) {
    const style = getComputedStyle(node);
    if (CORNERS.some((corner) => style[corner] !== "0px") || node.childElementCount > 4) break;
    const box = node.getBoundingClientRect();
    const fills = Array.from(node.children).filter((child) => {
      const r = child.getBoundingClientRect();
      return Math.abs(r.width - box.width) <= 1 && Math.abs(r.height - box.height) <= 1;
    });
    if (fills.length !== 1) break;
    node = fills[0] as HTMLElement;
  }
  return node;
}

/** 계산된 border-radius의 한 모서리 값(px · % · 무한대)을 px로 — 짧은 변의 절반을 넘지 않게 */
function cornerRadius(value: string, short: number) {
  const first = value.trim().split(" ")[0];
  if (first.includes("infinity")) return short / 2;
  const size = parseFloat(first) || 0;
  return Math.min(first.endsWith("%") ? (size / 100) * short : size, short / 2);
}

/**
 * 대상에 꼭 맞는 구멍을 잰다 — 대상보다 사방 HOLE_PAD만큼 크게. 스크롤 영역에 잘린 쪽은 그 경계에서
 * 끊고(여백 없이), 화면 밖으로 나가는 쪽은 VIEW_INSET만큼 안으로 들인다. 화면에 보이는 부분이 없으면 null.
 */
function measureHole(el: HTMLElement): Hole | null {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  let { left, top, right, bottom } = rect;
  const pad = { left: HOLE_PAD, top: HOLE_PAD, right: HOLE_PAD, bottom: HOLE_PAD };
  for (let node = el; node.parentElement && node.parentElement !== document.body; node = node.parentElement) {
    // 화면에 고정된 것(크게 보기 등)은 바깥 스크롤 영역에 잘리지 않는다
    if (getComputedStyle(node).position === "fixed") break;
    const parent = node.parentElement;
    const { overflowX, overflowY } = getComputedStyle(parent);
    if (overflowX === "visible" && overflowY === "visible") continue;
    const box = parent.getBoundingClientRect();
    if (overflowX !== "visible") {
      const start = box.left + parent.clientLeft;
      const end = start + parent.clientWidth;
      if (start > left) {
        left = start;
        pad.left = 0;
      }
      if (end < right) {
        right = end;
        pad.right = 0;
      }
    }
    if (overflowY !== "visible") {
      const start = box.top + parent.clientTop;
      const end = start + parent.clientHeight;
      if (start > top) {
        top = start;
        pad.top = 0;
      }
      if (end < bottom) {
        bottom = end;
        pad.bottom = 0;
      }
    }
  }
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const x1 = left - pad.left <= 0 ? VIEW_INSET : left - pad.left;
  const y1 = top - pad.top <= 0 ? VIEW_INSET : top - pad.top;
  const x2 = right + pad.right >= vw ? vw - VIEW_INSET : right + pad.right;
  const y2 = bottom + pad.bottom >= vh ? vh - VIEW_INSET : bottom + pad.bottom;
  if (x2 <= x1 || y2 <= y1) return null;

  const shape = shapeOf(el);
  const style = getComputedStyle(shape);
  const shapeBox = shape.getBoundingClientRect();
  const short = Math.min(shapeBox.width, shapeBox.height);
  const radius = CORNERS.map((corner) => `${(cornerRadius(style[corner], short) || SQUARE_RADIUS) + HOLE_PAD}px`).join(" ");
  return { left: x1, top: y1, width: x2 - x1, height: y2 - y1, radius };
}

const sameHole = (a: Hole, b: Hole) =>
  a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height && a.radius === b.radius;

export function CoachMarks({
  steps,
  storeKey,
  ready,
  onStart,
}: {
  steps: ReadonlyArray<CoachStep>;
  /** 완료 기록 키 — 예: sel.coach.studioHome. 실제 키에는 계정 번호가 붙는다(sel.coach.studioHome.12) */
  storeKey: string;
  /** 대상이 화면에 그려진 뒤 true */
  ready: boolean;
  /** 처음 뜰 때 한 번 — 화면을 안내에 맞는 상태로 돌려놓는 데 쓴다(사이드바 닫기) */
  onStart?: () => void;
}) {
  const userId = useAuth().user?.id ?? null;
  const doneStore = useMemo(() => (userId === null ? SIGNED_OUT : storeFor(`${storeKey}.${userId}`)), [storeKey, userId]);
  const done = useSyncExternalStore(doneStore.subscribe, doneStore.get, doneStore.getServerSnapshot);
  const [index, setIndex] = useState(0);
  /** 잰 구멍 — 어느 단계의 것인지 함께 둬서, 단계가 바뀐 첫 프레임에 앞 단계의 자리가 쓰이지 않게 한다 */
  const [measured, setMeasured] = useState<{ index: number; hole: Hole } | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(BUBBLE_HEIGHT);
  /** 대상이 없어 건너뛴 단계 — "이전"이 그 단계로 돌아가 다시 튕겨 나오지 않게 한다 */
  const [skipped, setSkipped] = useState<ReadonlySet<number>>(() => new Set());
  const active = ready && !done && index < steps.length;
  const step = steps[index];
  const targetKey = active ? (step.target ?? step.key) : null;

  const startedRef = useRef(false);
  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    onStart?.();
  }, [active, onStart]);

  // 대상을 따라간다 — 처음부터 없는 대상은 건너뛰고, 있다가 사라지면(다시 그려지는 중) 숨긴 채 기다린다
  useEffect(() => {
    if (targetKey === null) return;
    let frame = 0;
    let seen = false;
    let misses = 0;
    const tick = () => {
      const el = findTarget(targetKey);
      if (!el && !seen) {
        misses += 1;
        if (misses < SKIP_AFTER_FRAMES) {
          frame = requestAnimationFrame(tick);
          return;
        }
        setSkipped((prev) => new Set(prev).add(index));
        if (index === steps.length - 1) doneStore.set(true);
        else setIndex((i) => i + 1);
        return;
      }
      if (el && !seen) {
        seen = true;
        el.scrollIntoView({ block: "nearest" });
      }
      const next = el ? measureHole(el) : null;
      setMeasured((prev) => {
        if (!next) return null;
        return prev && prev.index === index && sameHole(prev.hole, next) ? prev : { index, hole: next };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetKey, index, steps.length, doneStore]);

  const hole = measured && measured.index === index ? measured.hole : null;
  const shown = active && hole !== null;

  useEffect(() => {
    if (!shown) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") doneStore.set(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shown, doneStore]);

  if (!active || !hole) return null;

  const holeRight = hole.left + hole.width;
  const holeBottom = hole.top + hole.height;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxLeft = vw - BUBBLE_WIDTH - MARGIN;
  const maxTop = vh - bubbleHeight - MARGIN;

  // 자리 고르기: 아래 → 위 → 오른쪽 → 왼쪽 → 안쪽
  const placement: Placement =
    holeBottom + GAP + bubbleHeight <= vh - MARGIN
      ? "below"
      : hole.top - GAP - bubbleHeight >= MARGIN
        ? "above"
        : holeRight + GAP + BUBBLE_WIDTH <= vw - MARGIN
          ? "right"
          : hole.left - GAP - BUBBLE_WIDTH >= MARGIN
            ? "left"
            : "inside";

  let bubbleLeft: number;
  let bubbleTop: number;
  switch (placement) {
    case "below":
      bubbleLeft = clamp(hole.left, MARGIN, maxLeft);
      bubbleTop = holeBottom + GAP;
      break;
    case "above":
      bubbleLeft = clamp(hole.left, MARGIN, maxLeft);
      bubbleTop = hole.top - GAP - bubbleHeight;
      break;
    case "right":
      bubbleLeft = holeRight + GAP;
      bubbleTop = clamp(hole.top, MARGIN, maxTop);
      break;
    case "left":
      bubbleLeft = hole.left - GAP - BUBBLE_WIDTH;
      bubbleTop = clamp(hole.top, MARGIN, maxTop);
      break;
    default:
      bubbleLeft = clamp(hole.left + GAP, MARGIN, maxLeft);
      bubbleTop = clamp(hole.top + GAP, MARGIN, maxTop);
  }

  // 화살표: 위/아래 자리면 가로로, 좌/우 자리면 세로로 구멍 가운데를 가리킨다
  const arrowStyle =
    placement === "below" || placement === "above"
      ? { left: clamp(hole.left + hole.width / 2 - bubbleLeft, ARROW_INSET, BUBBLE_WIDTH - ARROW_INSET) - 6 }
      : { top: clamp(hole.top + hole.height / 2 - bubbleTop, ARROW_INSET, bubbleHeight - ARROW_INSET) - 6 };
  const last = index === steps.length - 1;
  let prevIndex = index - 1;
  while (prevIndex >= 0 && skipped.has(prevIndex)) prevIndex -= 1;

  function next() {
    if (last) doneStore.set(true);
    else setIndex((i) => i + 1);
  }

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed z-90 shadow-[0_0_0_9999px_var(--surface-default-medium)]"
        style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height, borderRadius: hole.radius }}
      />
      <div
        ref={(el) => {
          if (el && el.offsetHeight !== bubbleHeight) setBubbleHeight(el.offsetHeight);
        }}
        role="dialog"
        aria-label={`안내 ${index + 1} / ${steps.length}: ${step.title}`}
        className="fixed z-91 rounded-(--radius-12) border border-divider-default bg-background-default-main p-4 shadow-(--shadow-modal)"
        style={{ width: BUBBLE_WIDTH, left: bubbleLeft, top: bubbleTop }}
      >
        {placement !== "inside" && (
          <span
            aria-hidden
            className={`absolute size-3 rotate-45 border-divider-default bg-background-default-main ${ARROW_CLASS[placement]}`}
            style={arrowStyle}
          />
        )}
        <button
          type="button"
          aria-label="안내 닫기"
          onClick={() => doneStore.set(true)}
          className="absolute top-2.5 right-2.5 grid size-6 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness"
        >
          <CloseIcon size={18} />
        </button>
        <p className="pr-7 type-label-eyebrow text-brand-secondary-default">
          {index + 1} / {steps.length} · {step.eyebrow}
        </p>
        <h3 className="mt-1.5 type-label-semibold-m text-contents-light-bgd-default">{step.title}</h3>
        <p className="mt-1 type-content-s text-contents-light-bgd-sub">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={`size-1.5 rounded-full ${i === index ? "bg-brand-secondary-default" : "bg-divider-default"}`}
              />
            ))}
          </span>
          <span className="flex gap-1.5">
            {prevIndex >= 0 && (
              <Button kind="ghost" size="sm" className="ring-1 ring-border-default ring-inset" onClick={() => setIndex(prevIndex)}>
                이전
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {last ? "완료" : "다음"}
            </Button>
          </span>
        </div>
      </div>
    </>
  );
}
