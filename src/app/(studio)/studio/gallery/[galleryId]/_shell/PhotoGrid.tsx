"use client";

/**
 * 사진 그리드 — 행 높이 고정 justified(디자이너 시안): 사진은 제 비율대로, 한 줄이 폭에 꽉 차게
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid.tsx
 *
 * 줌은 기준 행 높이(80~220px)로 바뀐다. 한 줄에 사진을 비율대로 이어 붙이다가 폭을 넘기면 그 줄을
 * 폭에 맞춰 살짝 줄인다(넘긴 뒤 맞추므로 늘리는 일은 없다). 마지막 줄은 기준 높이 그대로 왼쪽 정렬
 * (빈 자리는 남긴다 — 2026-09-11 답).
 * 가로세로 크기 값이 서버 사진 응답에 없어(백엔드 요청) 비율은 이미지가 로드될 때 재서 모듈 캐시에 둔다 —
 * 모르는 동안은 3:2로 두고 알게 되면 줄이 다시 흐른다. 서버가 width · height를 주면 그 값으로 캐시를 채우면 된다.
 *
 * 선택 표시 두 가지(markStyle): "line" = 안쪽 2px 선 + 2px 흰 틈 + 체크(작가 화면 · 1단계) /
 * "check" = 왼쪽 위 체크만(클라이언트 2단계, 2026-09-12). currentId(싱글뷰로 열릴 사진)는 같은 구조의
 * 올리브 선. showScore면 왼쫽 아래 별점 배지(줌이 작으면 숨김). onOpen이 있으면 호버 돋보기 · 더블클릭 · 호버 캡션.
 * toggleOn="check"면 타일 전체가 아니라 **체크박스(왼쪽 위 넓은 영역)만** 선택을 바꾸고, 타일 클릭은 onTileClick(현재 사진)으로 간다
 * (클라이언트 2단계 — 사진을 누르다 담기고 빠지는 게 불편하다는 2026-09-12 피드백). 작가 화면은 타일 전체(기본).
 * PENDING(올리는 중)은 회색 자리, HEIC · HEIF는 미리보기 전(previewReady=false)엔 "미리보기 준비 중" 자리.
 * markedIds(표시만 하는 선택)는 작가가 클라이언트의 선택을 볼 때 쓴다.
 * 여러 장 고르기(onSelectMany, 2026-09-14): Shift + 클릭은 마지막으로 고른 사진부터 범위. 왼쪽 위 44×44 체크
 * 자리에서 누른 채 끌면 휴대폰 갤러리처럼 **누른 사진부터 지금 손 아래 사진까지 보이는 순서로 전부** 고른다
 * (2026-09-15 — 커서가 지난 타일만 고르던 방식을 바꿈). 첫 타일이 바뀐 쪽으로 맞추고, 되돌아오면 처음 상태로.
 * 손이 그리드 위아래 끝에 닿으면 저절로 스크롤되며 범위가 늘어난다. 타일 사이 틈 · 그리드 밖은 가장 가까운 타일로 본다.
 * drag(usePhotoMove)를 주면 타일을 누른 채 6px 넘게 끌어 폴더로 옮긴다 — 고른 타일이면 고른 전부, 아니면 그 한 장.
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { PhotoIcon, SparkleIcon, StarFillIcon, ZoomInIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";

/** 줌 0~100 → 기준 행 높이(px) */
export const rowHeightOf = (zoom: number) => Math.round(80 + (zoom / 100) * 140);
const GAP = 8;
const DEFAULT_RATIO = 1.5;
/** 이보다 낮은 줄에서는 배지 · 캡션을 숨긴다(줌 약 30% 미만) */
const DETAIL_MIN_HEIGHT = 110;
/** 이만큼 움직여야 끌기 · 칠하기다(그 전엔 그냥 클릭) */
const DRAG_THRESHOLD = 6;

/** 끌어 옮기기 연결선 — usePhotoMove가 만들어 준다 */
export type PhotoDragBinding = {
  /** 타일을 누른 순간 */
  start: (photoId: number, e: ReactPointerEvent) => void;
  /** 방금 끝난 끌기가 만든 클릭인지 — true면 선택을 바꾸지 않는다 */
  consumeClick: () => boolean;
  /** 끌려가는 중인 사진 — 흐리게 */
  movingIds: ReadonlySet<number> | null;
};

/** 그리드 위아래 끝 이 안에 손이 들어오면 저절로 스크롤 */
const PAINT_EDGE = 56;
const PAINT_EDGE_STEP = 10;

/** 쓸어 고르기 한 번(체크 자리에서 누른 채 끌기) */
type PaintSession = {
  pointerId: number;
  /** 누른 자리(화면 기준) — 움직임 문턱 */
  x: number;
  y: number;
  /** 지금 손 자리(화면 기준) — 자동 스크롤이 다시 쓴다 */
  clientX: number;
  clientY: number;
  /** 범위 안 사진을 이 상태로 맞춘다(첫 타일이 바뀐 쪽) */
  on: boolean;
  /** 처음 누른 사진 — 범위의 한쪽 끝 */
  anchor: number;
  moved: boolean;
  /** 시작할 때의 선택 — 범위 밖으로 나가면 여기로 되돌린다 */
  base: Set<number>;
  /** 지금 범위 안이라 바뀌어 있는 사진 */
  applied: Set<number>;
  scroller: HTMLElement | null;
};

/** 이 요소를 담고 있는 스크롤 상자 */
function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

/**
 * 손 자리에 가장 가까운 타일 — 줄은 "위쪽 끝이 손보다 위인 마지막 줄", 그 줄에서 "왼쪽 끝이 손보다 왼쪽인 마지막 타일".
 * 타일 사이 틈은 앞 타일, 그리드보다 위 · 왼쪽이면 첫 타일, 아래 · 오른쪽이면 마지막 타일이 된다(휴대폰 갤러리 문법).
 */
function tileAt(container: HTMLElement, clientX: number, clientY: number): number | null {
  const rows = container.querySelectorAll<HTMLElement>("[data-row]");
  if (rows.length === 0) return null;
  let row = rows[0];
  for (const el of rows) {
    if (el.getBoundingClientRect().top <= clientY) row = el;
    else break;
  }
  const tiles = row.querySelectorAll<HTMLElement>("[data-photo-id]");
  if (tiles.length === 0) return null;
  let tile = tiles[0];
  for (const el of tiles) {
    if (el.getBoundingClientRect().left <= clientX) tile = el;
    else break;
  }
  const id = Number(tile.dataset.photoId);
  return Number.isFinite(id) ? id : null;
}

/** 사진 비율 캐시(가로/세로) — 폴더를 오가도, 다시 그려도 잊지 않는다 */
const ratioCache = new Map<number, number>();

type Row = { photos: PhotoResponse[]; height: number; widths: number[] };

function layoutRows(photos: PhotoResponse[], width: number, rowHeight: number): Row[] {
  if (width <= 0 || photos.length === 0) return [];
  const rows: Row[] = [];
  let current: PhotoResponse[] = [];
  let ratios: number[] = [];
  let sum = 0;

  function flush(last: boolean) {
    if (current.length === 0) return;
    const gaps = GAP * (current.length - 1);
    const natural = sum * rowHeight;
    const scale = Math.min(1, (width - gaps) / natural);
    const exact = rowHeight * scale;
    const height = Math.floor(exact);
    // 폭은 반올림 전 높이로 재고, 마지막 장이 남은 폭을 가져가 줄이 넘치지 않게 한다
    const widths = ratios.map((r) => Math.floor(r * exact));
    if (!last && widths.length > 0) {
      const others = widths.slice(0, -1).reduce((n, w) => n + w, 0);
      widths[widths.length - 1] = Math.max(1, width - gaps - others);
    }
    rows.push({ photos: current, height, widths });
    current = [];
    ratios = [];
    sum = 0;
  }

  for (const photo of photos) {
    const ratio = ratioCache.get(photo.photoId) ?? DEFAULT_RATIO;
    current.push(photo);
    ratios.push(ratio);
    sum += ratio;
    if (sum * rowHeight + GAP * (current.length - 1) >= width) flush(false);
  }
  flush(true);
  return rows;
}

function CheckMark({ selected, filled }: { selected: boolean; filled: boolean }) {
  const on = selected ? (filled ? "bg-contents-light-bgd-default border-contents-light-bgd-default opacity-100" : "bg-black/60 opacity-100") : "bg-black/30 opacity-0 group-hover:opacity-100";
  return (
    <span
      aria-hidden
      className={`grid size-5.5 place-items-center rounded-(--radius-4) border border-white/90 text-white transition-opacity duration-fast ${on}`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5 6.5 11.5 12.5 5" />
      </svg>
    </span>
  );
}

/** 표시만(타일 전체가 토글) */
function Check({ selected, filled }: { selected: boolean; filled: boolean }) {
  return (
    <span className="absolute top-2.5 left-2.5">
      <CheckMark selected={selected} filled={filled} />
    </span>
  );
}

/** 표시 + 칠하기 시작 자리(왼쪽 위 44×44) — 클릭은 타일로 그대로 지나간다 */
function CheckArea({
  selected,
  filled,
  onPaintStart,
}: {
  selected: boolean;
  filled: boolean;
  /** 칠하기를 시작했으면 true */
  onPaintStart: (e: ReactPointerEvent) => boolean;
}) {
  return (
    <span
      aria-hidden
      onPointerDown={(e) => {
        if (e.button === 0 && onPaintStart(e)) e.stopPropagation();
      }}
      className="absolute top-0 left-0 grid size-11 place-items-start p-2.5"
    >
      <CheckMark selected={selected} filled={filled} />
    </span>
  );
}

/** 누르는 체크박스 — 왼쪽 위 44×44가 전부 눌리는 영역 */
function CheckButton({
  selected,
  filled,
  label,
  onToggle,
  onPaintStart,
}: {
  selected: boolean;
  filled: boolean;
  label: string;
  onToggle: (shift: boolean) => void;
  /** 칠하기를 시작했으면 true */
  onPaintStart: (e: ReactPointerEvent) => boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button === 0 && onPaintStart(e)) e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e.shiftKey);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute top-0 left-0 grid size-11 cursor-pointer place-items-start p-2.5 focus-visible:outline-2 focus-visible:outline-white"
    >
      <CheckMark selected={selected} filled={filled} />
    </button>
  );
}

const LINE_SELECTED = "shadow-[inset_0_0_0_2px_var(--contents-light-bgd-default),inset_0_0_0_4px_var(--background-default-main)]";
const LINE_CURRENT = "shadow-[inset_0_0_0_2px_var(--brand-secondary-default),inset_0_0_0_4px_var(--background-default-main)]";

export function PhotoGrid({
  photos,
  zoom,
  selectedIds,
  onToggle,
  markedIds,
  selectable = true,
  markStyle = "line",
  currentId = null,
  showScore = false,
  onOpen,
  captionOf,
  scrollToId = null,
  aiIds,
  toggleOn = "tile",
  onTileClick,
  overlayOf,
  onSelectMany,
  drag = null,
}: {
  photos: PhotoResponse[];
  /** 0~100 — 기준 행 높이로 바뀐다 */
  zoom: number;
  selectedIds: ReadonlySet<number>;
  onToggle: (photoId: number) => void;
  /** 표시만 하는 선택(작가가 보는 클라이언트의 선택) */
  markedIds?: ReadonlySet<number>;
  /** false면 클릭해도 선택되지 않는다 */
  selectable?: boolean;
  /** 선택 표시 — line(안쪽 선 + 체크) · check(체크만) */
  markStyle?: "line" | "check";
  /** 싱글뷰로 열릴(마지막으로 본) 사진 — 올리브 안쪽 선 */
  currentId?: number | null;
  /** 왼쪽 아래 별점 배지 */
  showScore?: boolean;
  /** 있으면 호버 돋보기 · 더블클릭으로 연다(싱글뷰) */
  onOpen?: (photoId: number) => void;
  /** 호버 캡션의 둘째 줄(폴더 이름 등) */
  captionOf?: (photo: PhotoResponse) => string | null;
  /** 이 사진이 보이도록 스크롤(싱글뷰에서 돌아왔을 때) — 값이 바뀔 때 한 번 */
  scrollToId?: number | null;
  /** AI 추천 사진 — 오른쪽 위 ✦ 배지 */
  aiIds?: ReadonlySet<number>;
  /** 선택을 바꾸는 곳 — tile(타일 전체, 기본) · check(왼쪽 위 체크박스만) */
  toggleOn?: "tile" | "check";
  /** toggleOn="check"일 때 타일 클릭(현재 사진으로) */
  onTileClick?: (photoId: number) => void;
  /** 타일 위에 더 얹을 것(보정 작업의 메모 · 결과 배지 · 점) — 줄이 낮으면 부모가 알아서 줄인다 */
  overlayOf?: (photo: PhotoResponse, detailed: boolean) => ReactNode;
  /** 여러 장을 한 번에 — Shift 범위 · 체크 칠하기가 쓴다(없으면 둘 다 없음) */
  onSelectMany?: (photoIds: number[], selected: boolean) => void;
  /** 끌어 옮기기 — 없으면 끌어도 아무 일 없다 */
  drag?: PhotoDragBinding | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // 비율을 새로 알게 되면 한 프레임에 한 번만 다시 흐른다
  const [ratioNonce, setRatioNonce] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollToId === null) return;
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-photo-id="${scrollToId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [scrollToId]);

  function learnRatio(photoId: number, img: HTMLImageElement) {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    const known = ratioCache.get(photoId);
    if (known !== undefined && Math.abs(known - ratio) < 0.01) return;
    ratioCache.set(photoId, ratio);
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setRatioNonce((n) => n + 1);
      });
    }
  }

  // 여러 장 고르기 — 범위의 기준(마지막으로 고른 사진) · 칠하는 중 · 방금 칠했으니 이어질 클릭은 무시
  const anchorRef = useRef<number | null>(null);
  const paintRef = useRef<PaintSession | null>(null);
  const paintedRef = useRef(false);

  useEffect(() => {
    if (!selectable || !onSelectMany) return;
    let frame = 0;

    /** 누른 사진부터 endId까지(보이는 순서)는 맞추고, 범위에서 빠진 사진은 처음 상태로 되돌린다 */
    function applyRange(paint: PaintSession, endId: number) {
      const from = photos.findIndex((p) => p.photoId === paint.anchor);
      const to = photos.findIndex((p) => p.photoId === endId);
      if (from < 0 || to < 0) return;
      const inside = new Set(photos.slice(Math.min(from, to), Math.max(from, to) + 1).map((p) => p.photoId));
      const add: number[] = [];
      const backOn: number[] = [];
      const backOff: number[] = [];
      for (const id of inside) if (!paint.applied.has(id)) add.push(id);
      for (const id of paint.applied) if (!inside.has(id)) (paint.base.has(id) ? backOn : backOff).push(id);
      paint.applied = inside;
      if (add.length > 0) onSelectMany?.(add, paint.on);
      if (backOn.length > 0) onSelectMany?.(backOn, true);
      if (backOff.length > 0) onSelectMany?.(backOff, false);
    }

    /** 손 자리 → 가장 가까운 타일까지 범위 다시 맞추기 */
    function update(clientX: number, clientY: number) {
      const paint = paintRef.current;
      const container = containerRef.current;
      if (!paint || !container) return;
      paint.clientX = clientX;
      paint.clientY = clientY;
      const endId = tileAt(container, clientX, clientY);
      if (endId !== null) applyRange(paint, endId);
    }

    /** 손이 그리드 위아래 끝에 닿아 있으면 스크롤하며 범위를 늘린다 */
    function autoScroll() {
      const paint = paintRef.current;
      const scroller = paint?.scroller;
      if (paint && scroller) {
        const box = scroller.getBoundingClientRect();
        const before = scroller.scrollTop;
        if (paint.clientY < box.top + PAINT_EDGE) scroller.scrollTop -= PAINT_EDGE_STEP;
        else if (paint.clientY > box.bottom - PAINT_EDGE) scroller.scrollTop += PAINT_EDGE_STEP;
        if (scroller.scrollTop !== before) update(paint.clientX, paint.clientY);
      }
      frame = window.requestAnimationFrame(autoScroll);
    }

    function finish() {
      const paint = paintRef.current;
      if (!paint) return;
      paintedRef.current = paint.moved;
      paintRef.current = null;
      window.cancelAnimationFrame(frame);
      frame = 0;
    }

    function onPointerMove(e: PointerEvent) {
      const paint = paintRef.current;
      if (!paint || e.pointerId !== paint.pointerId) return;
      // 손을 뗀 걸 놓쳤으면(창 밖에서 뗌) 여기서 끝낸다
      if (e.buttons === 0) {
        finish();
        return;
      }
      if (!paint.moved) {
        if (Math.abs(e.clientX - paint.x) + Math.abs(e.clientY - paint.y) < DRAG_THRESHOLD) return;
        paint.moved = true;
        frame = window.requestAnimationFrame(autoScroll);
      }
      update(e.clientX, e.clientY);
    }
    function onPointerUp(e: PointerEvent) {
      const paint = paintRef.current;
      if (!paint || e.pointerId !== paint.pointerId) return;
      finish();
    }
    // 사진 목록이 바뀌어 효과가 다시 붙었으면 진행 중인 자동 스크롤을 이어 간다
    if (paintRef.current?.moved) frame = window.requestAnimationFrame(autoScroll);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.cancelAnimationFrame(frame);
    };
  }, [selectable, onSelectMany, photos]);

  /** 체크 자리를 누른 순간 — 6px 넘게 끌면 이 사진부터 손 아래 사진까지를 첫 타일과 같은 상태로 맞춘다 */
  function startPaint(photoId: number, e: ReactPointerEvent) {
    paintedRef.current = false;
    if (!selectable || !onSelectMany) return false;
    paintRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      on: !selectedIds.has(photoId),
      anchor: photoId,
      moved: false,
      base: new Set(selectedIds),
      applied: new Set(),
      scroller: scrollParentOf(containerRef.current),
    };
    return true;
  }

  /** 한 장 고르기 — Shift면 마지막으로 고른 사진부터 여기까지(보이는 순서) */
  function chooseOne(photoId: number, shift: boolean) {
    if (paintedRef.current) {
      paintedRef.current = false;
      return;
    }
    const anchor = anchorRef.current;
    if (shift && onSelectMany && anchor !== null && anchor !== photoId) {
      const order = photos.map((p) => p.photoId);
      const from = order.indexOf(anchor);
      const to = order.indexOf(photoId);
      if (from >= 0 && to >= 0) {
        onSelectMany(from <= to ? order.slice(from, to + 1) : order.slice(to, from + 1), true);
        return;
      }
    }
    anchorRef.current = photoId;
    onToggle(photoId);
  }

  const rowHeight = rowHeightOf(zoom);
  const rows = useMemo(
    () => layoutRows(photos, width, rowHeight),
    // ratioNonce는 캐시가 바뀌었다는 신호 — 값 자체는 쓰지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, width, rowHeight, ratioNonce],
  );

  return (
    <div ref={containerRef} className="flex select-none flex-col gap-2 px-5 pb-6">
      {rows.map((row, rowIndex) => (
        <div key={row.photos[0]?.photoId ?? rowIndex} data-row className="flex gap-2" style={{ height: row.height }}>
          {row.photos.map((photo, i) => {
            const selected = selectedIds.has(photo.photoId) || (markedIds?.has(photo.photoId) ?? false);
            const current = currentId === photo.photoId;
            const pending = photo.viewUrl === null;
            // 임베더가 파생 JPEG를 만들기 전의 HEIC · HEIF 원본은 <img>가 못 그린다
            const preparing = !pending && !photo.previewReady && /hei[cf]/i.test(photo.contentType);
            const detailed = row.height >= DETAIL_MIN_HEIGHT;
            const line = markStyle === "line" && selected ? LINE_SELECTED : current ? LINE_CURRENT : "";
            const caption = captionOf?.(photo) ?? null;
            const checkOnly = toggleOn === "check";
            const moving = drag?.movingIds?.has(photo.photoId) ?? false;
            /** 타일 클릭이 선택을 바꾸는가(아니면 onTileClick으로) */
            const tileToggles = selectable && !checkOnly;
            const clickable = tileToggles || onTileClick !== undefined;
            const label = `${photo.originalFileName}${selected ? " 선택됨" : ""}${photo.score ? ` 별점 ${photo.score}` : ""}`;
            return (
              <div
                key={photo.photoId}
                role={clickable || onOpen ? "button" : undefined}
                tabIndex={clickable || onOpen ? 0 : undefined}
                data-photo-id={photo.photoId}
                aria-pressed={tileToggles ? selected : undefined}
                aria-current={current || undefined}
                aria-label={label}
                onPointerDown={(e) => {
                  paintedRef.current = false;
                  // 올리는 중인(PENDING) 회색 자리는 옮길 수 없다 — "모두 선택"이 빼는 것과 같은 기준
                  if (e.button === 0 && selectable && !pending) drag?.start(photo.photoId, e);
                }}
                onClick={
                  clickable
                    ? (e) => {
                        if (drag?.consumeClick()) return;
                        if (tileToggles) chooseOne(photo.photoId, e.shiftKey);
                        else onTileClick?.(photo.photoId);
                      }
                    : undefined
                }
                onDoubleClick={onOpen ? () => onOpen(photo.photoId) : undefined}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" && onOpen) onOpen(photo.photoId);
                  else if (e.key === " " && clickable) {
                    e.preventDefault();
                    if (tileToggles) chooseOne(photo.photoId, e.shiftKey);
                    else onTileClick?.(photo.photoId);
                  }
                }}
                style={{ width: row.widths[i], height: row.height }}
                className={`group relative shrink-0 overflow-hidden rounded-(--radius-8) bg-surface-default-light text-left transition-opacity duration-fast ${
                  clickable ? "cursor-pointer" : onOpen ? "cursor-zoom-in" : "cursor-default"
                } ${moving ? "opacity-35" : ""} ${line}`}
              >
                {pending || preparing ? (
                  <span className="absolute inset-0 grid place-items-center text-contents-light-bgd-weakness">
                    <span className="flex flex-col items-center gap-1">
                      <PhotoIcon size={22} />
                      {preparing && detailed && <span className="type-label-semibold-xs">미리보기 준비 중</span>}
                    </span>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.viewUrl ?? undefined}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onLoad={(e) => learnRatio(photo.photoId, e.currentTarget)}
                    className="size-full object-cover"
                  />
                )}
                {onOpen && detailed && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/60 to-transparent px-2.5 pt-6 pb-2 text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                  >
                    <span className="truncate type-label-semibold-xs">{photo.originalFileName}</span>
                    {caption && <span className="truncate type-content-xs text-white/75">{caption}</span>}
                  </span>
                )}
                {selectable && checkOnly ? (
                  <CheckButton
                    selected={selected}
                    filled={markStyle === "check"}
                    label={selected ? "선택 해제" : "선택"}
                    onToggle={(shift) => chooseOne(photo.photoId, shift)}
                    onPaintStart={(e) => startPaint(photo.photoId, e)}
                  />
                ) : selectable ? (
                  <CheckArea
                    selected={selected}
                    filled={markStyle === "check"}
                    onPaintStart={(e) => startPaint(photo.photoId, e)}
                  />
                ) : (
                  selected && <Check selected={selected} filled={markStyle === "check"} />
                )}
                {overlayOf?.(photo, detailed)}
                {aiIds?.has(photo.photoId) && (
                  <span aria-label="AI 추천" className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-brand-secondary-default text-white">
                    <SparkleIcon size={12} />
                  </span>
                )}
                {showScore && photo.score !== null && detailed && (
                  <span
                    aria-hidden
                    className="absolute bottom-2 left-2 inline-flex h-4.5 items-center gap-0.5 rounded-(--pill) bg-black/50 pr-1.5 pl-1 type-label-semibold-xs text-white"
                  >
                    <StarFillIcon size={11} />
                    {photo.score}
                  </span>
                )}
                {onOpen && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="한 장 보기"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(photo.photoId);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="absolute right-2 bottom-2 grid size-6 cursor-zoom-in place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100 hover:bg-black/65"
                  >
                    <ZoomInIcon size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
