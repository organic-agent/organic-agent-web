"use client";

/**
 * 앨범 편집 화면 본문(이슈 168) — 머리줄 · 사진 패널 · 펼침면 · 아래 툴바 · 펼침면 띠 · 하단 바
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumWorkspace.tsx
 *
 * 사이드바는 페이지가 그려 넘긴다(앨범에 들어오면 접혀 있다). 1024 미만에서는 편집을 막고 안내 한 장만 둔다.
 * 펼침면 크기는 남은 자리에 맞춘 뒤 줌으로 키운다(기본 = 맞춤). 키우면 펼침면 칸이 스크롤된다.
 * 펼침면 위에는 배너(보정 상태 · 선택에서 빠진 사진), 머리줄 제목 옆에는 마지막 저장 시각, 하단에는 "임시 저장"(바꾼 게 남으면 점).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Snackbar } from "@/components/app/Snackbar";
import { AlbumIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from "@/components/icons";
import { goneSpreads, pad2, placedCount, ranks as rankOf } from "@/lib/album/model";
import { localAlbumRepository, type AlbumDoc } from "@/lib/album/store";
import { ShellBottomBar, ShellCta } from "../../_shell/ShellBottomBar";
import { ShellMainHeader } from "../../_shell/ShellMainHeader";
import { SHELL_BODY_CLASS } from "../../_shell/ShellSidebar";
import { AlbumBanner } from "./AlbumBanner";
import { MoveConfirmModal } from "./MoveConfirmModal";
import { PhotoPanel, readPanelCols, type PanelCols } from "./PhotoPanel";
import { SpreadCanvas } from "./SpreadCanvas";
import { SpreadStrip } from "./SpreadStrip";
import { useAlbumEditor } from "./useAlbumEditor";
import type { AlbumPhoto, RetouchBanner } from "./useAlbumSource";

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

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function AlbumWorkspace({
  galleryId,
  initialDoc,
  photos,
  retouchBanner,
  renderSidebar,
}: {
  galleryId: number;
  initialDoc: AlbumDoc;
  photos: AlbumPhoto[];
  /** 보정 상태 배너 — 닫았어도 상태(key)가 바뀌면 다시 뜬다 */
  retouchBanner: RetouchBanner | null;
  /** 사이드바(펼쳐져 있을 때만) — 넣은 장수를 상태줄 · 앨범 행에 쓴다 */
  renderSidebar: (placed: number) => ReactNode;
}) {
  const selectedIds = useMemo(() => new Set(photos.map((p) => p.photoId)), [photos]);
  const editor = useAlbumEditor(galleryId, initialDoc, selectedIds, localAlbumRepository);
  const { album, F, go } = editor;
  const [zoom, setZoom] = useState(50);
  const [cols, setCols] = useState<PanelCols>(() => readPanelCols());
  const [areaRef, areaSize] = useBoxSize();

  const byId = useMemo(() => new Map(photos.map((p) => [p.photoId, p])), [photos]);
  const photoOf = (photoId: number) => byId.get(photoId) ?? null;
  const ranks = useMemo(() => rankOf(album, F), [album, F]);
  const placed = placedCount(album);
  const spreadCount = album.spreads.length;
  const grayDots = useMemo(() => goneSpreads(album, F), [album, F]);
  // 선택에서 빠져 비운 프레임(아직 다른 사진을 안 넣은 것)
  const goneFrames = useMemo(
    () =>
      Object.keys(album.gone)
        .filter((id) => album.assign[id] === undefined && F.byId[id])
        .map((id) => F.byId[id])
        .sort((a, b) => a.gi - b.gi),
    [album, F],
  );
  const goneKey = goneFrames.map((f) => f.id).join(",");
  const showRetouch = retouchBanner !== null && editor.banner.retouch !== retouchBanner.key;
  const showGone = goneFrames.length > 0 && editor.banner.gone !== goneKey;
  const goneNames = goneFrames.slice(0, 3).map((f) => `펼침면 ${f.spread + 1}의 ${pad2(f.no)}`).join(" · ") + (goneFrames.length > 3 ? ` 외 ${goneFrames.length - 3}곳` : "");

  // 남은 자리에 맞춘 폭(위아래 여백 · 툴바 자리를 뺀다) × 줌
  const fitW = Math.max(240, Math.min(areaSize.w - 96, (areaSize.h - 48 - 72) * 2));
  const spreadW = Math.round(fitW * scaleOf(zoom));

  // 단축키 — ← → 펼침면 · ⌘Z/Ctrl+Z 되돌리기 · Delete 고른 프레임 사진 빼기 · Esc 고르기 풀기(입력칸 · 창이 열려 있으면 그대로)
  const keysRef = useRef(editor);
  useEffect(() => {
    keysRef.current = editor;
  });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ed = keysRef.current;
      const t = e.target instanceof Element ? e.target : null;
      if (ed.moveAsk || t?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        ed.undo();
      } else if (e.metaKey || e.ctrlKey || e.altKey) return;
      else if (e.key === "ArrowLeft") ed.go(ed.album.spread - 1);
      else if (e.key === "ArrowRight") ed.go(ed.album.spread + 1);
      else if ((e.key === "Delete" || e.key === "Backspace") && ed.canRemove) {
        e.preventDefault();
        ed.removePicked();
      } else if (e.key === "Escape" && ed.picked) ed.clearPick();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 스낵바 — 3.2초 뒤 사라진다
  const snack = editor.snack;
  const hideSnack = editor.hideSnack;
  useEffect(() => {
    if (!snack) return;
    const timer = window.setTimeout(hideSnack, 3200);
    return () => window.clearTimeout(timer);
  }, [snack, hideSnack]);
  const moveAsk = editor.moveAsk;

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
                      펼침면 {album.spread + 1} / {spreadCount} ·{" "}
                      {editor.saveError ? (
                        <>
                          <span className="text-function-error-default">저장하지 못했어요</span>{" "}
                          <button type="button" onClick={editor.saveNow} className="cursor-pointer text-contents-light-bgd-default underline underline-offset-2">
                            다시 시도
                          </button>
                        </>
                      ) : (
                        `${editor.saved.kind === "manual" ? "임시 저장" : "자동 저장"} ${hhmm(editor.saved.at)}`
                      )}
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
              <PhotoPanel photos={photos} ranks={ranks} cols={cols} onColsChange={setCols} onPhoto={editor.onPhoto} />
              <div className="flex min-w-0 flex-1 flex-col bg-background-default-sub">
                {(showRetouch || showGone) && (
                  <div className="flex shrink-0 flex-col gap-2 px-5 pt-3.5">
                    {showRetouch && retouchBanner && (
                      <AlbumBanner tone={retouchBanner.tone} title={retouchBanner.title} body={retouchBanner.body} onClose={() => editor.dismissBanner("retouch", retouchBanner.key)} />
                    )}
                    {showGone && (
                      <AlbumBanner tone="neutral" title={`클라이언트가 선택에서 ${goneFrames.length}장을 뺐어요`} body={`${goneNames} 프레임을 비웠어요`} onClose={() => editor.dismissBanner("gone", goneKey)} />
                    )}
                  </div>
                )}
                <div className="relative min-h-0 flex-1">
                  <div ref={areaRef} className="scrollbar-slim absolute inset-0 overflow-auto">
                    <div className="flex min-h-full min-w-full items-center justify-center px-12 pt-12 pb-24" style={{ width: spreadW + 96 > areaSize.w ? spreadW + 96 : undefined }}>
                      {areaSize.w > 0 && (
                        <SpreadCanvas album={album} F={F} width={spreadW} photoOf={photoOf} onFrame={editor.onFrame} onBackground={editor.clearPick} onClear={editor.clearPick} />
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-1 rounded-(--radius-12) bg-surface-default-darkness p-1.5 text-contents-dark-bgd-default shadow-[0_6px_20px_rgba(0,0,0,.25)]">
                    {editor.canRemove && (
                      <>
                        <button
                          type="button"
                          onClick={editor.removePicked}
                          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-(--radius-8) px-2.5 type-label-medium-s hover:bg-white/10"
                        >
                          <TrashIcon size={18} />
                          빼기
                        </button>
                        <span aria-hidden className="mx-1 h-5 w-px bg-current opacity-20" />
                      </>
                    )}
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
      {snack && (
        <Snackbar kind="info" action={snack.undoable && editor.canUndo ? { label: "되돌리기", onClick: editor.undo } : undefined} className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2">
          {snack.text}
        </Snackbar>
      )}
      {moveAsk && F.byId[moveAsk.from] && F.byId[moveAsk.to] && (
        <MoveConfirmModal photo={photoOf(moveAsk.photoId)} from={F.byId[moveAsk.from]} to={F.byId[moveAsk.to]} onClose={editor.cancelMove} onConfirm={editor.confirmMove} />
      )}
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
          actions={
            <>
              <span className="relative inline-flex">
                <ShellCta kind="outline" disabled={!editor.dirty && !editor.saveError} onClick={editor.saveNow}>
                  임시 저장
                </ShellCta>
                {editor.dirty && <i aria-label="저장하지 않은 변경" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-accent-default" />}
              </span>
              <ShellCta disabled>클라이언트에게 보내기</ShellCta>
            </>
          }
        />
      </div>
    </>
  );
}
