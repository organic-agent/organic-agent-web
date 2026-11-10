"use client";

/**
 * 앨범 편집 화면 본문(이슈 168) — 머리줄 · 사진 패널 · 펼침면 · 아래 툴바 · 펼침면 띠 · 하단 바
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumWorkspace.tsx
 *
 * 사이드바는 페이지가 그려 넘긴다(앨범에 들어오면 접혀 있다). 1024 미만에서는 편집을 막고 안내 한 장만 둔다.
 * 펼침면 크기는 남은 자리에 맞춘 뒤 줌으로 키운다(기본 = 맞춤). 키우면 펼침면 칸이 스크롤된다.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlbumIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { ranks as rankOf, placedCount } from "@/lib/album/model";
import type { AlbumDoc } from "@/lib/album/store";
import { ShellBottomBar, ShellCta } from "../../_shell/ShellBottomBar";
import { ShellMainHeader } from "../../_shell/ShellMainHeader";
import { SHELL_BODY_CLASS } from "../../_shell/ShellSidebar";
import { PhotoPanel, readPanelCols, type PanelCols } from "./PhotoPanel";
import { SpreadCanvas } from "./SpreadCanvas";
import { SpreadStrip } from "./SpreadStrip";
import { useAlbumEditor } from "./useAlbumEditor";
import type { AlbumPhoto } from "./useAlbumSource";

/** 줌(0~100, 머리줄 슬라이더) → 맞춤 대비 배율. 50이 맞춤, 100이면 두 배 */
const scaleOf = (zoom: number) => (zoom <= 50 ? 0.7 + (zoom / 50) * 0.3 : 1 + (zoom - 50) / 50);

/** 요소 크기 — 콜백 ref로 붙이고 ResizeObserver로 따라간다 */
function useBoxSize() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size] as const;
}

function Counter({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <small className="type-content-xs text-contents-light-bgd-weakness">{label}</small>
      <span className="type-content-s text-contents-light-bgd-sub tabular-nums">
        <b className="type-label-semibold-l text-contents-light-bgd-default">{value}</b> / {of}
      </span>
    </span>
  );
}

export function AlbumWorkspace({
  initialDoc,
  photos,
  renderSidebar,
}: {
  initialDoc: AlbumDoc;
  photos: AlbumPhoto[];
  /** 사이드바(펼쳐져 있을 때만) — 넣은 장수를 상태줄 · 앨범 행에 쓴다 */
  renderSidebar: (placed: number) => ReactNode;
}) {
  const { album, F, go } = useAlbumEditor(initialDoc);
  const [zoom, setZoom] = useState(50);
  const [cols, setCols] = useState<PanelCols>(() => readPanelCols());
  const [areaRef, areaSize] = useBoxSize();

  const byId = useMemo(() => new Map(photos.map((p) => [p.photoId, p])), [photos]);
  const photoOf = (photoId: number) => byId.get(photoId) ?? null;
  const ranks = useMemo(() => rankOf(album, F), [album, F]);
  const placed = placedCount(album);
  const spreadCount = album.spreads.length;
  const grayDots = useMemo(() => new Set<number>(), []);

  // 남은 자리에 맞춘 폭(위아래 여백 · 툴바 자리를 뺀다) × 줌
  const fitW = Math.max(240, Math.min(areaSize.w - 96, (areaSize.h - 48 - 72) * 2));
  const spreadW = Math.round(fitW * scaleOf(zoom));

  // ← → 펼침면 이동(입력칸에 있을 때는 그대로)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (e.key === "ArrowLeft") go(album.spread - 1);
      else if (e.key === "ArrowRight") go(album.spread + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, album.spread]);

  return (
    <>
      <div className={SHELL_BODY_CLASS}>
        {renderSidebar(placed)}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col max-[1023px]:hidden">
            <div className="border-b border-divider-default">
              <ShellMainHeader
                title={
                  <>
                    <span className="flex text-contents-light-bgd-weakness">
                      <AlbumIcon size={18} />
                    </span>
                    앨범
                    <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
                      펼침면 {album.spread + 1} / {spreadCount}
                    </small>
                  </>
                }
                zoom={zoom}
                onZoomChange={setZoom}
                sort="uploaded"
                onSortChange={() => {}}
                filter="none"
                onFilterChange={() => {}}
                sortable={false}
              />
            </div>
            <div className="flex min-h-0 flex-1">
              <PhotoPanel photos={photos} ranks={ranks} cols={cols} onColsChange={setCols} onPhoto={() => {}} />
              <div className="flex min-w-0 flex-1 flex-col bg-background-default-sub">
                <div className="relative min-h-0 flex-1">
                  <div ref={areaRef} className="scrollbar-slim absolute inset-0 overflow-auto">
                    <div className="flex min-h-full min-w-full items-center justify-center px-12 pt-12 pb-24" style={{ width: spreadW + 96 > areaSize.w ? spreadW + 96 : undefined }}>
                      {areaSize.w > 0 && (
                        <SpreadCanvas album={album} F={F} width={spreadW} photoOf={photoOf} onFrame={() => {}} onBackground={() => {}} onClear={() => {}} />
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-1 rounded-(--radius-12) bg-surface-default-darkness p-1.5 text-contents-dark-bgd-default shadow-[0_6px_20px_rgba(0,0,0,.25)]">
                    <button
                      type="button"
                      aria-label="이전 펼침면"
                      disabled={album.spread === 0}
                      onClick={() => go(album.spread - 1)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-(--radius-8) hover:bg-white/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeftIcon size={18} />
                    </button>
                    <span className="px-1 type-label-semibold-s tabular-nums">
                      {album.spread + 1}
                      <span className="font-normal opacity-60"> / {spreadCount}</span>
                    </span>
                    <button
                      type="button"
                      aria-label="다음 펼침면"
                      disabled={album.spread === spreadCount - 1}
                      onClick={() => go(album.spread + 1)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-(--radius-8) hover:bg-white/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronRightIcon size={18} />
                    </button>
                  </div>
                </div>
                <SpreadStrip album={album} F={F} photoOf={photoOf} grayDots={grayDots} onGo={go} />
              </div>
            </div>
          </div>
          {/* 1024 미만 — 편집 막음 */}
          <div className="hidden flex-1 flex-col items-center justify-center gap-2.5 bg-background-default-sub px-6 text-center max-[1023px]:flex">
            <span className="flex text-contents-light-bgd-weakness">
              <AlbumIcon size={40} />
            </span>
            <b className="type-title-s text-contents-light-bgd-default">앨범 편집은 넓은 화면에서 할 수 있어요</b>
            <span className="type-content-s text-contents-light-bgd-sub">컴퓨터에서 열거나 창을 더 넓혀 주세요</span>
          </div>
        </main>
      </div>
      <div className="max-[1023px]:hidden">
        <ShellBottomBar
          selectionCount={0}
          onClearSelection={() => {}}
          onMoveSelection={() => {}}
          hint="사진을 누르면 다음 배치 위치에 들어가요"
          status={
            <span className="flex items-center gap-3.5">
              <Counter label="프레임" value={F.list.length} of={photos.length} />
              <span aria-hidden className="h-6 w-px bg-border-default" />
              <Counter label="배치한 사진" value={placed} of={photos.length} />
            </span>
          }
          actions={<ShellCta disabled>클라이언트에게 보내기</ShellCta>}
        />
      </div>
    </>
  );
}
