"use client";

/**
 * 펼침면 한 장(이슈 168) — 흰 종이 두 쪽 · 가운데 접힘 그늘 · 배경 글귀 · 프레임 · 프레임 도구
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/SpreadCanvas.tsx
 *
 * 종이는 화면 테마와 상관없이 흰색(실제 앨범). 펼침면 비율은 앨범 사이즈(한 쪽 가로 × 세로 mm)를 따른다.
 * 프레임 상태: 사진 있음 · 빈 칸(보라 옅은 바탕) · 선택에서 빠짐(회색 빗금 + 칩) · 다음 배치 위치(보라 점선 + 말풍선) ·
 * 고른 프레임(보라 점선 + 어두운 말풍선 · ✕ + 크기 손잡이).
 *
 * 도구(PR ②)
 * - 선택: 프레임을 끌어 옮기고, 고른 프레임의 손잡이로 크기를 바꾼다(모서리는 비율 고정을 따른다)
 * - 프레임: 펼침면 위를 끌어 새 프레임을 그린다. 접힘을 넘어 두 쪽에 걸쳐도 된다(걸친 프레임은 사진 위에 접힘 그늘을 한 번 더)
 * - 안내선: 누른 자리에 가로선 · 세로선을 놓고(끌어서 맞춘 뒤 손을 뗀 자리), 있는 선은 끌어 옮긴다. 펼침면 밖으로 끌어내면 지운다.
 *   안내선은 화면에만 보이는 선(앨범에는 찍히지 않음) — 다른 도구에서도 보이고 프레임이 맞붙는다
 * 끄는 동안에는 화면에만 미리 보여 주고 손을 떼면 한 번 저장한다(되돌리기 한 번). 가장자리는 쪽 가장자리 · 가운데 · 접힘 ·
 * 안내선 · 다른 프레임에 6px 안이면 맞붙는다. 끄는 동안 위에 "번호 · 가로 × 세로 mm"를 띄운다.
 */

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CloseIcon } from "@/components/icons";
import {
  clamp,
  crossesGutter,
  frameMm,
  frameOfRect,
  minFrame,
  pad2,
  rectOf,
  snapEdge,
  snapLines,
  snapSpan,
  spreadRatio,
  visibleGuides,
  type Album,
  type Frame,
  type FrameIndex,
  type Guide,
  type PageSize,
  type Rect,
} from "@/lib/album/model";
import type { AlbumPhoto } from "./useAlbumSource";

export type AlbumTool = "select" | "guide" | "frame";

const GONE_BG = "repeating-linear-gradient(135deg, rgba(26,26,26,.05) 0 8px, rgba(26,26,26,.10) 8px 16px)";
/** 안내선 색 — 흰 종이 위 도구 선이라 테마와 상관없이 고정(디자인 도구 관례인 청록, 시안 그대로) */
const GUIDE = "#19c3d6";
/** 안내선을 이만큼(px) 펼침면 밖으로 끌어내면 지운다 */
const GUIDE_OUT_PX = 16;
/** 맞붙는 거리 · 끌기로 보는 거리(px) */
const SNAP_PX = 6;
const DRAG_PX = 4;

type Drag =
  | { kind: "move"; id: string; x0: number; y0: number; r0: Rect; started: boolean; rect: Rect | null }
  | { kind: "resize"; id: string; dir: string; x0: number; y0: number; r0: Rect; rect: Rect | null }
  | { kind: "draw"; sx: number; sy: number; rect: Rect | null }
  | { kind: "guide"; id: string | null; dir: Guide["dir"]; pos: number; out: boolean };

type GuideLive = { id: string | null; dir: Guide["dir"]; pos: number; out: boolean };

function guideLabel(dir: Guide["dir"], pos: number, page: PageSize) {
  return dir === "v" ? `세로 · ${Math.round(pos * page.w)} mm` : `가로 · ${Math.round(pos * page.h)} mm`;
}

function GuideLine({ dir, pos, id, faint, dashed, grab, label }: { dir: Guide["dir"]; pos: number; id?: string; faint?: boolean; dashed?: boolean; grab: boolean; label?: string | null }) {
  const line = dashed ? `1px dashed ${GUIDE}` : `1px solid ${GUIDE}`;
  return (
    <div
      data-guide={id}
      aria-hidden
      className={`absolute z-[4] ${grab ? (dir === "v" ? "cursor-col-resize" : "cursor-row-resize") : "pointer-events-none"} ${faint ? "opacity-35" : ""}`}
      style={dir === "v" ? { top: -48, bottom: -48, left: `calc(${(pos / 2) * 100}% - 4px)`, width: 9 } : { left: -48, right: -48, top: `calc(${pos * 100}% - 4px)`, height: 9 }}
    >
      <i className="pointer-events-none absolute" style={dir === "v" ? { top: 0, bottom: 0, left: 4, borderLeft: line } : { left: 0, right: 0, top: 4, borderTop: line }} />
      {label && (
        <span
          className="pointer-events-none absolute rounded-(--radius-4) px-1.5 py-0.5 type-label-semibold-xs whitespace-nowrap text-white tabular-nums"
          style={{ background: GUIDE, ...(dir === "v" ? { top: 0, left: 10 } : { left: 0, top: -22 }) }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** 펼침면 좌표 사각형 → 펼침면 기준 % 자리 */
const boxStyle = (r: Rect) => ({ left: `${(r.x / 2) * 100}%`, top: `${r.y * 100}%`, width: `${(r.w / 2) * 100}%`, height: `${r.h * 100}%` });

function sizeLabel(no: number, r: Rect, page: PageSize) {
  const mm = frameMm(r, page);
  return `${pad2(no)} · ${mm.w} × ${mm.h} mm${crossesGutter(frameOfRect(r)) ? " · 두 쪽에 걸침" : ""}`;
}

function SizeTag({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-0 z-[4] mb-2 rounded-(--radius-4) bg-surface-default-darkness px-2 py-0.5 type-label-semibold-xs whitespace-nowrap text-white tabular-nums">
      {text}
    </span>
  );
}

const HANDLES: { dir: string; className: string; cursor: string }[] = [
  { dir: "nw", className: "-top-1.5 -left-1.5 size-3 rounded-full", cursor: "nwse-resize" },
  { dir: "ne", className: "-top-1.5 -right-1.5 size-3 rounded-full", cursor: "nesw-resize" },
  { dir: "sw", className: "-bottom-1.5 -left-1.5 size-3 rounded-full", cursor: "nesw-resize" },
  { dir: "se", className: "-right-1.5 -bottom-1.5 size-3 rounded-full", cursor: "nwse-resize" },
  { dir: "n", className: "-top-1 left-1/2 h-2 w-4 -translate-x-1/2 rounded-(--radius-4)", cursor: "ns-resize" },
  { dir: "s", className: "-bottom-1 left-1/2 h-2 w-4 -translate-x-1/2 rounded-(--radius-4)", cursor: "ns-resize" },
  { dir: "w", className: "top-1/2 -left-1 h-4 w-2 -translate-y-1/2 rounded-(--radius-4)", cursor: "ew-resize" },
  { dir: "e", className: "top-1/2 -right-1 h-4 w-2 -translate-y-1/2 rounded-(--radius-4)", cursor: "ew-resize" },
];

function FrameBox({
  frame,
  rect,
  photo,
  gone,
  cursor,
  manual,
  spreadH,
  tool,
  dragging,
  tag,
  onClick,
  onClear,
}: {
  frame: Frame;
  /** 지금 그릴 자리(끄는 중이면 미리 보기) */
  rect: Rect;
  photo: AlbumPhoto | null;
  gone: boolean;
  cursor: boolean;
  manual: boolean;
  /** 펼침면 높이(px) — 번호 글자 크기 */
  spreadH: number;
  tool: AlbumTool;
  dragging: boolean;
  /** 끄는 동안 위에 띄울 크기 */
  tag: string | null;
  onClick: (e: MouseEvent) => void;
  onClear: () => void;
}) {
  const h = rect.h * spreadH;
  const empty = !photo;
  const picked = cursor && manual;
  const tip = tool === "select" && cursor && !dragging ? (manual ? (empty ? "넣을 사진을 고르세요" : "바꿀 사진을 고르세요") : "다음 배치 위치") : null;
  const crossing = crossesGutter(frameOfRect(rect));
  return (
    <div className="absolute" data-frame={frame.id} style={boxStyle(rect)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${pad2(frame.no)} 프레임${photo ? ` · ${photo.fileName}` : gone ? " · 선택에서 빠짐" : " · 비어 있음"}`}
        aria-pressed={picked}
        className={`relative block size-full overflow-hidden ${tool === "select" ? (picked ? "cursor-move" : "cursor-pointer") : "cursor-crosshair"} ${empty && !gone ? "bg-brand-accent-surface" : ""} ${
          cursor && tool === "select"
            ? "outline-2 -outline-offset-2 outline-dashed outline-brand-accent-default"
            : tool === "select"
              ? "hover:outline-2 hover:-outline-offset-2 hover:outline-brand-accent-default/50"
              : ""
        }`}
        style={empty && gone ? { background: GONE_BG } : undefined}
      >
        {photo?.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} alt="" draggable={false} className="size-full object-cover" />
        )}
        {crossing && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-4.5 -translate-x-1/2 bg-[linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.18),rgba(0,0,0,0))]"
            style={{ left: `${((1 - rect.x) / rect.w) * 100}%` }}
          />
        )}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-center font-semibold ${photo ? "text-white/70" : gone ? "text-black/25" : "text-brand-accent-default/45"}`}
          style={{ fontSize: Math.max(12, Math.round(h / 5)) }}
        >
          {pad2(frame.no)}
        </span>
        {empty && gone && (
          <span className="absolute bottom-3 left-1/2 inline-flex h-6 -translate-x-1/2 items-center whitespace-nowrap rounded-(--pill) bg-surface-default-dark px-2.5 type-label-semibold-xs text-white">
            선택에서 빠짐
          </span>
        )}
      </button>
      {picked && tool === "select" &&
        HANDLES.map((hd) => (
          <i
            key={hd.dir}
            aria-hidden
            data-handle={hd.dir}
            className={`absolute z-[3] border-2 border-brand-accent-default bg-white ${hd.className}`}
            style={{ cursor: hd.cursor }}
          />
        ))}
      {tag && <SizeTag text={tag} />}
      {tip && (
        <span
          data-nodrag
          className={`absolute bottom-full left-1/2 z-[3] inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-(--radius-8) py-1.5 type-label-semibold-xs text-white ${
            manual ? "mb-4 bg-surface-default-darkness pr-1.5 pl-3" : "mb-2 bg-brand-accent-default px-3"
          }`}
        >
          {tip}
          {manual && (
            <button type="button" aria-label="고르기 풀기" onClick={onClear} className="flex cursor-pointer rounded-(--radius-4) p-0.5 hover:bg-white/15">
              <CloseIcon size={14} />
            </button>
          )}
          <i aria-hidden className={`absolute top-full left-1/2 size-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 ${manual ? "bg-surface-default-darkness" : "bg-brand-accent-default"}`} />
        </span>
      )}
    </div>
  );
}

export function SpreadCanvas({
  album,
  F,
  width,
  tool,
  ratioLock,
  canDraw,
  guideDir,
  photoOf,
  onFrame,
  onPick,
  onBackground,
  onClear,
  onFrameRect,
  onDrawFrame,
  onCapHit,
  onTooSmall,
  onAddGuide,
  onMoveGuide,
  onRemoveGuide,
}: {
  album: Album;
  F: FrameIndex;
  /** 펼침면 폭(px) — 높이는 앨범 사이즈 비율로 */
  width: number;
  tool: AlbumTool;
  /** 모서리로 크기를 바꿀 때 비율 고정 */
  ratioLock: boolean;
  /** 프레임을 더 그릴 수 있는지(상한) */
  canDraw: boolean;
  /** 안내선 도구로 놓을 선 */
  guideDir: Guide["dir"];
  photoOf: (photoId: number) => AlbumPhoto | null;
  onFrame: (frameId: string) => void;
  /** 끌기를 시작할 때 그 프레임 고르기 */
  onPick: (frameId: string) => void;
  /** 종이 빈 곳을 눌렀을 때 — 고른 프레임 풀기 */
  onBackground: () => void;
  onClear: () => void;
  onFrameRect: (frameId: string, rect: Rect) => void;
  onDrawFrame: (rect: Rect) => void;
  onCapHit: () => void;
  onTooSmall: () => void;
  onAddGuide: (dir: Guide["dir"], pos: number) => void;
  onMoveGuide: (guideId: string, pos: number) => void;
  onRemoveGuide: (guideId: string) => void;
}) {
  const spread = album.spreads[album.spread];
  const frames = F.of(album.spread);
  const height = Math.round(width / spreadRatio(album.page));
  const spreadRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  /** 끄는 중인 프레임 · 그리는 중인 사각형(화면에만) */
  const [live, setLive] = useState<{ id: string; rect: Rect } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  /** 놓거나 끄는 중인 안내선 · 안내선 도구로 가리키는 자리(화면에만) */
  const [guideLive, setGuideLive] = useState<GuideLive | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const latest = useRef({ album, F, ratioLock, onPick, onFrameRect, onDrawFrame, onTooSmall, onAddGuide, onMoveGuide, onRemoveGuide });
  useEffect(() => {
    latest.current = { album, F, ratioLock, onPick, onFrameRect, onDrawFrame, onTooSmall, onAddGuide, onMoveGuide, onRemoveGuide };
  });

  /** 화면 좌표 → 안내선 자리(펼침면 좌표) · 펼침면 밖으로 끌어냈는지 */
  function guidePos(dir: Guide["dir"], clientX: number, clientY: number) {
    const b = spreadRef.current!.getBoundingClientRect();
    if (dir === "v") {
      const x = ((clientX - b.left) / b.width) * 2;
      const out = GUIDE_OUT_PX / (b.width / 2);
      return { pos: clamp(x, 0, 2), out: x < -out || x > 2 + out };
    }
    const y = (clientY - b.top) / b.height;
    const out = GUIDE_OUT_PX / b.height;
    return { pos: clamp(y, 0, 1), out: y < -out || y > 1 + out };
  }

  /** 화면 좌표 → 펼침면 좌표 · 맞붙는 거리 */
  function measure() {
    const b = spreadRef.current!.getBoundingClientRect();
    return { b, unitX: b.width / 2, unitY: b.height, tolX: SNAP_PX / (b.width / 2), tolY: SNAP_PX / b.height };
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d || !spreadRef.current) return;
      if (d.kind === "guide") {
        const g = guidePos(d.dir, e.clientX, e.clientY);
        d.pos = g.pos;
        d.out = d.id !== null && g.out;
        setGuideLive({ id: d.id, dir: d.dir, pos: d.pos, out: d.out });
        return;
      }
      const { album: a, F: idx, ratioLock: lock } = latest.current;
      const { b, unitX, unitY, tolX, tolY } = measure();
      const guides = visibleGuides(a);
      const others = idx.of(a.spread);
      const min = minFrame(a.page);
      if (d.kind === "draw") {
        const lx = snapLines("x", guides, others);
        const ly = snapLines("y", guides, others);
        const x1 = snapEdge(clamp(((e.clientX - b.left) / b.width) * 2, 0, 2), lx, tolX);
        const y1 = snapEdge(clamp((e.clientY - b.top) / b.height, 0, 1), ly, tolY);
        d.rect = { x: Math.min(d.sx, x1), y: Math.min(d.sy, y1), w: Math.abs(x1 - d.sx), h: Math.abs(y1 - d.sy) };
        setDraft(d.rect);
        return;
      }
      if (d.kind === "move" && !d.started) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_PX) return;
        d.started = true;
        latest.current.onPick(d.id);
      }
      const dx = (e.clientX - d.x0) / unitX;
      const dy = (e.clientY - d.y0) / unitY;
      const lx = snapLines("x", guides, others, d.id);
      const ly = snapLines("y", guides, others, d.id);
      const r = d.r0;
      if (d.kind === "move") {
        d.rect = { x: clamp(snapSpan(r.x + dx, r.w, lx, tolX), 0, 2 - r.w), y: clamp(snapSpan(r.y + dy, r.h, ly, tolY), 0, 1 - r.h), w: r.w, h: r.h };
      } else {
        let L = r.x;
        let T = r.y;
        let R = r.x + r.w;
        let B = r.y + r.h;
        if (d.dir.includes("w")) L = snapEdge(clamp(r.x + dx, 0, R - min.w), lx, tolX);
        if (d.dir.includes("e")) R = snapEdge(clamp(R + dx, L + min.w, 2), lx, tolX);
        if (d.dir.includes("n")) T = snapEdge(clamp(r.y + dy, 0, B - min.h), ly, tolY);
        if (d.dir.includes("s")) B = snapEdge(clamp(B + dy, T + min.h, 1), ly, tolY);
        // 비율 고정 + 모서리: 가로 변화에 세로를 맞춘다
        if (lock && d.dir.length === 2) {
          const nh = ((R - L) * r.h) / r.w;
          if (d.dir.includes("n")) T = clamp(B - nh, 0, B - min.h);
          else B = clamp(T + nh, T + min.h, 1);
        }
        d.rect = { x: L, y: T, w: R - L, h: B - T };
      }
      setLive({ id: d.id, rect: d.rect });
    }
    function onUp() {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      const { album: a, onFrameRect: place, onDrawFrame: draw, onTooSmall: tooSmall, onAddGuide: addG, onMoveGuide: moveG, onRemoveGuide: removeG } = latest.current;
      if (d.kind === "guide") {
        setGuideLive(null);
        if (d.id === null) addG(d.dir, d.pos);
        else if (d.out) removeG(d.id);
        else moveG(d.id, d.pos);
        return;
      }
      if (d.kind === "draw") {
        setDraft(null);
        if (d.rect) {
          suppress();
          const min = minFrame(a.page);
          if (d.rect.w >= min.w && d.rect.h >= min.h) draw(d.rect);
          else tooSmall();
        }
        return;
      }
      if (d.kind === "move" && !d.started) return;
      suppress();
      if (d.rect) place(d.id, d.rect);
      setLive(null);
    }
    function suppress() {
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !spreadRef.current) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t || t.closest("[data-nodrag]")) return;
    const { b, tolX, tolY } = measure();
    const guides = visibleGuides(album);
    if (tool === "frame") {
      e.preventDefault();
      if (!canDraw) {
        onCapHit();
        return;
      }
      const sx = snapEdge(clamp(((e.clientX - b.left) / b.width) * 2, 0, 2), snapLines("x", guides, frames), tolX);
      const sy = snapEdge(clamp((e.clientY - b.top) / b.height, 0, 1), snapLines("y", guides, frames), tolY);
      dragRef.current = { kind: "draw", sx, sy, rect: null };
      return;
    }
    if (tool === "guide") {
      e.preventDefault();
      const existing = t.closest<HTMLElement>("[data-guide]")?.dataset.guide;
      const g = existing ? album.guides.find((x) => x.id === existing) : undefined;
      const dir = g?.dir ?? guideDir;
      const pos = g ? g.pos : guidePos(dir, e.clientX, e.clientY).pos;
      dragRef.current = { kind: "guide", id: g?.id ?? null, dir, pos, out: false };
      setGuideLive({ id: g?.id ?? null, dir, pos, out: false });
      setHover(null);
      return;
    }
    if (tool !== "select") return;
    const fEl = t.closest<HTMLElement>("[data-frame]");
    const f = fEl?.dataset.frame ? F.byId[fEl.dataset.frame] : undefined;
    if (!f) return;
    const handle = t.closest<HTMLElement>("[data-handle]")?.dataset.handle;
    if (handle) {
      e.preventDefault();
      dragRef.current = { kind: "resize", id: f.id, dir: handle, x0: e.clientX, y0: e.clientY, r0: rectOf(f), rect: null };
      return;
    }
    dragRef.current = { kind: "move", id: f.id, x0: e.clientX, y0: e.clientY, r0: rectOf(f), started: false, rect: null };
  }

  return (
    <div
      ref={spreadRef}
      className={`relative shrink-0 bg-white shadow-[0_10px_30px_rgba(0,0,0,.14),0_1px_3px_rgba(0,0,0,.08)] select-none ${tool === "frame" ? "cursor-crosshair" : ""}`}
      style={{ width, height }}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        if (tool !== "guide" || dragRef.current) return;
        const t = e.target instanceof Element ? e.target : null;
        setHover(t?.closest("[data-guide]") ? null : guidePos(guideDir, e.clientX, e.clientY).pos);
      }}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        if (!suppressClick.current && e.target === e.currentTarget) onBackground();
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-[linear-gradient(90deg,rgba(0,0,0,.02),rgba(0,0,0,.09),rgba(0,0,0,.02))]" />
      {spread?.deco && (
        <div
          aria-hidden
          className="pointer-events-none absolute text-[#2b2b2b] italic"
          style={{
            left: `${(spread.deco.p * 0.5 + spread.deco.x * 0.5) * 100}%`,
            top: `${spread.deco.y * 100}%`,
            fontSize: Math.max(10, width / 34),
            lineHeight: 1.1,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {spread.deco.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
      {frames.map((f) => {
        const pid = album.assign[f.id];
        const dragging = live?.id === f.id;
        const rect = dragging ? live.rect : rectOf(f);
        return (
          <FrameBox
            key={f.id}
            frame={f}
            rect={rect}
            photo={pid === undefined ? null : photoOf(pid)}
            gone={album.gone[f.id] !== undefined}
            cursor={album.cursor === f.id}
            manual={album.cursorMode === "manual"}
            spreadH={height}
            tool={tool}
            dragging={dragging}
            tag={dragging ? sizeLabel(f.no, rect, album.page) : null}
            onClick={(e) => {
              e.stopPropagation();
              if (suppressClick.current || tool !== "select") return;
              onFrame(f.id);
            }}
            onClear={onClear}
          />
        );
      })}
      {visibleGuides(album).map((g) => {
        const moving = guideLive?.id === g.id;
        return (
          <GuideLine
            key={g.id}
            id={g.id}
            dir={g.dir}
            pos={moving ? guideLive.pos : g.pos}
            faint={moving && guideLive.out}
            grab={tool === "guide"}
            label={moving && !guideLive.out ? guideLabel(g.dir, guideLive.pos, album.page) : null}
          />
        );
      })}
      {guideLive && guideLive.id === null && <GuideLine dir={guideLive.dir} pos={guideLive.pos} grab={false} label={guideLabel(guideLive.dir, guideLive.pos, album.page)} />}
      {tool === "guide" && hover !== null && !guideLive && <GuideLine dir={guideDir} pos={hover} dashed faint grab={false} label={guideLabel(guideDir, hover, album.page)} />}
      {draft && (
        <div className="pointer-events-none absolute border-2 border-dashed border-brand-accent-default bg-brand-accent-default/10" style={boxStyle(draft)}>
          <SizeTag text={sizeLabel(frames.length + 1, draft, album.page)} />
        </div>
      )}
    </div>
  );
}
