"use client";

/**
 * 사진 패널(이슈 168) — 클라이언트가 고른 사진(보정본이 있으면 보정본). 누르면 다음 배치 위치(또는 고른 프레임)에 들어간다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/PhotoPanel.tsx
 *
 * 한 줄 1장이 기본, 오른쪽 경계 손잡이를 끌면 1 · 2 · 3열 폭(168 · 272 · 376)에 딱 붙는다 — 고른 열 수는 이 브라우저에 기억
 * (sel.album.panelCols), 손잡이를 두 번 누르면 1열로. 넣은 사진은 배치 순번 배지 + 테두리 + 흐리게.
 */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AlbumPhoto } from "./useAlbumSource";

export type PanelCols = 1 | 2 | 3;
export const PANEL_WIDTH: Record<PanelCols, number> = { 1: 168, 2: 272, 3: 376 };
const COLS_KEY = "sel.album.panelCols";

export function readPanelCols(): PanelCols {
  try {
    const v = Number(window.localStorage.getItem(COLS_KEY));
    return v === 2 || v === 3 ? v : 1;
  } catch {
    return 1;
  }
}
function writePanelCols(cols: PanelCols) {
  try {
    window.localStorage.setItem(COLS_KEY, String(cols));
  } catch {
    // 기억 못 해도 지금 화면은 그대로
  }
}

/** 끈 폭에 가장 가까운 열 수 */
function colsForWidth(w: number): PanelCols {
  if (w < (PANEL_WIDTH[1] + PANEL_WIDTH[2]) / 2) return 1;
  if (w < (PANEL_WIDTH[2] + PANEL_WIDTH[3]) / 2) return 2;
  return 3;
}

export function PhotoPanel({
  photos,
  ranks,
  cols,
  onColsChange,
  onPhoto,
}: {
  photos: AlbumPhoto[];
  /** 사진 id → 배치 순번(넣은 사진만) */
  ranks: Record<number, number>;
  cols: PanelCols;
  onColsChange: (cols: PanelCols) => void;
  onPhoto: (photoId: number) => void;
}) {
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [dragCols, setDragCols] = useState<PanelCols | null>(null);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const shownCols = dragCols ?? cols;
  const placed = photos.filter((p) => ranks[p.photoId] !== undefined).length;
  const shown = onlyWaiting ? photos.filter((p) => ranks[p.photoId] === undefined) : photos;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startW: PANEL_WIDTH[cols] };
    setDragCols(cols);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    setDragCols(colsForWidth(d.startW + e.clientX - d.startX));
  }
  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    const next = dragCols ?? cols;
    setDragCols(null);
    if (next !== cols) {
      writePanelCols(next);
      onColsChange(next);
    }
  }

  return (
    <div
      className={`relative z-[2] flex min-h-0 shrink-0 flex-col bg-background-default-main ${dragCols !== null ? "border-r-2 border-brand-accent-default" : "border-r border-divider-default"}`}
      style={{ width: PANEL_WIDTH[shownCols] }}
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-divider-default px-3.5">
        <b className="type-label-semibold-m whitespace-nowrap text-contents-light-bgd-default">선택한 사진</b>
        <span className="type-content-xs whitespace-nowrap text-contents-light-bgd-sub tabular-nums">
          {placed} / {photos.length}
        </span>
      </div>
      <label className="flex cursor-pointer items-center gap-2 px-3.5 py-2.5 type-content-s whitespace-nowrap text-contents-light-bgd-sub">
        <input type="checkbox" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} className="size-4 accent-(--brand-accent-default)" />
        안 넣은 사진만
      </label>
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-3.5 pb-3.5">
        {shown.length === 0 ? (
          <p className="py-8 text-center type-content-s text-contents-light-bgd-weakness">{photos.length === 0 ? "고른 사진이 없어요" : "다 넣었어요"}</p>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${shownCols}, minmax(0, 1fr))` }}>
            {shown.map((p) => {
              const rank = ranks[p.photoId];
              return (
                <button
                  key={p.photoId}
                  type="button"
                  onClick={() => onPhoto(p.photoId)}
                  aria-label={`${p.fileName}${rank !== undefined ? ` · ${rank}번째로 넣음` : ""}`}
                  className={`relative aspect-square cursor-pointer overflow-hidden rounded-(--radius-8) bg-surface-default-lightness ${
                    rank !== undefined ? "ring-2 ring-contents-light-bgd-default ring-inset" : "hover:ring-2 hover:ring-brand-accent-default hover:ring-inset"
                  }`}
                >
                  {p.src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.src} alt="" loading="lazy" draggable={false} className={`size-full object-cover ${rank !== undefined ? "opacity-55" : ""}`} />
                  )}
                  {rank !== undefined && (
                    <span className="absolute top-1.5 left-1.5 inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-(--radius-4) bg-contents-light-bgd-default px-1.5 type-label-semibold-xs text-background-default-main tabular-nums">
                      {rank}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* 폭 손잡이 — 끌면 1 · 2 · 3열에 붙는다, 두 번 누르면 1열 */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`사진 패널 폭 · 한 줄 ${shownCols}장`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => {
          writePanelCols(1);
          onColsChange(1);
        }}
        className="group absolute top-0 -right-1.5 bottom-0 z-[3] flex w-3 cursor-col-resize touch-none items-center justify-center"
      >
        <i
          aria-hidden
          className={`block h-9 w-1 rounded-(--pill) shadow-[0_0_0_2px_var(--background-default-main)] transition-colors duration-fast ${
            dragCols !== null ? "bg-brand-accent-default" : "bg-surface-default-medium group-hover:bg-brand-accent-default"
          }`}
        />
        {dragCols !== null && (
          <span className="absolute top-1/2 left-full ml-2 -translate-y-1/2 rounded-(--radius-8) bg-surface-default-darkness px-2.5 py-1 type-label-semibold-xs whitespace-nowrap text-white">
            {dragCols}열
          </span>
        )}
      </div>
    </div>
  );
}
