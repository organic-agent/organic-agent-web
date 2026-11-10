"use client";

/**
 * 앨범 편집 화면 본문(이슈 168) — 머리줄 · 사진 패널 · 펼침면 · 아래 툴바 · 펼침면 띠 · 하단 바
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumWorkspace.tsx
 *
 * 사이드바는 페이지가 그려 넘긴다(앨범에 들어오면 접혀 있다). 1024 미만에서는 편집을 막고 안내 한 장만 둔다.
 * 펼침면 크기는 남은 자리에 맞춘 뒤 줌으로 키운다(기본 = 맞춤). 키우면 펼침면 칸이 스크롤된다.
 * 펼침면 위에는 배너(보정 상태 · 선택에서 빠진 사진), 머리줄 제목 옆에는 마지막 저장 시각, 하단에는 "임시 저장"(바꾼 게 남으면 점).
 * 도구(PR ②) — 선택 · 안내선 · 프레임. 프레임을 그리면 선택 도구로 돌아와 새 프레임을 고른 상태가 된다.
 * 위치 조정은 바꾸는 동안 여기 상태로만 두고, 끝낼 때 한 번 저장한다(되돌리기 한 번).
 * 앨범 미리보기(PR ③) — 머리줄 오른쪽 버튼 · 좁은 화면 안내 카드에서 연다. 편집 화면의 지금 모습을 그대로 보여 준다.
 * 클라이언트에게 보내기(PR ③) — 프레임 수와 넣은 사진 수가 선택 장수와 같을 때만(디자이너 규칙 "프레임 수 = 사진 수"). 한 번 보낸 뒤에는 "다시 보내기".
 * 역할(PR ③) — studio 전부 / clientEdit 사진 교체 · 위치 조정 · 비우기만(도구 · 프레임 · 펼침면 관리 없음, 고친 곳 표시) /
 * clientView 넘겨 보기 · 미리보기만(패널 · 도구 없음, 폰에서도 미리보기). 스튜디오에 보내기는 서버 뒤라 막아 둔다.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Snackbar } from "@/components/app/Snackbar";
import { AlbumIcon, LockIcon } from "@/components/icons";
import { changedFrames, crossesGutter, frameMm, getCrop, goneSpreads, pad2, placedCount, ranks as rankOf, spreadRatio, type Album, type Crop } from "@/lib/album/model";
import { localAlbumRepository, type AlbumDoc, type AlbumRepository } from "@/lib/album/store";
import { ShellBottomBar, ShellCta } from "../../_shell/ShellBottomBar";
import { ShellMainHeader } from "../../_shell/ShellMainHeader";
import { SHELL_BODY_CLASS } from "../../_shell/ShellSidebar";
import { AlbumBanner } from "./AlbumBanner";
import { AlbumPreview } from "./AlbumPreview";
import { AlbumToolbar, GuideSettings } from "./AlbumToolbar";
import { MoveConfirmModal } from "./MoveConfirmModal";
import { SendAlbumModal } from "./SendAlbumModal";
import { PhotoPanel, readPanelCols, type PanelCols } from "./PhotoPanel";
import { SpreadCanvas, type AlbumTool, type CanvasMode, type CropEdit } from "./SpreadCanvas";
import { DeleteSpreadModal, SpreadStrip } from "./SpreadStrip";
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

function PreviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-(--radius-8) bg-brand-accent-surface px-3 type-label-medium-s whitespace-nowrap text-brand-accent-text transition-opacity duration-fast hover:opacity-85"
    >
      <AlbumIcon size={16} />
      앨범 미리보기
    </button>
  );
}

export type AlbumRole = "studio" | "clientEdit" | "clientView";

export function AlbumWorkspace({
  galleryId,
  title,
  initialDoc,
  photos,
  retouchBanner,
  renderSidebar,
  role = "studio",
  repo = localAlbumRepository,
  base = null,
}: {
  galleryId: number;
  /** 갤러리 제목 — 미리보기 머리줄 */
  title?: string;
  initialDoc: AlbumDoc;
  photos: AlbumPhoto[];
  /** 보정 상태 배너 — 닫았어도 상태(key)가 바뀌면 다시 뜬다 */
  retouchBanner: RetouchBanner | null;
  /** 사이드바(펼쳐져 있을 때만) — 넣은 장수를 상태줄 · 앨범 행에 쓴다 */
  renderSidebar: (placed: number) => ReactNode;
  role?: AlbumRole;
  /** 저장할 곳 — 스튜디오 앨범 · 클라이언트 사본 · 저장 안 함(보기만) */
  repo?: AlbumRepository;
  /** 클라이언트 수정 — 스튜디오가 보낸 앨범(고친 곳 표시) */
  base?: Album | null;
}) {
  const isStudio = role === "studio";
  const viewOnly = role === "clientView";
  const canvasMode: CanvasMode = isStudio ? "studio" : viewOnly ? "view" : "photo";
  const selectedIds = useMemo(() => new Set(photos.map((p) => p.photoId)), [photos]);
  const editor = useAlbumEditor(galleryId, initialDoc, selectedIds, repo);
  const { album, F, go } = editor;
  const [zoom, setZoom] = useState(50);
  const [tool, setTool] = useState<AlbumTool>("select");
  const [ratioLock, setRatioLock] = useState(true);
  const [guideDir, setGuideDir] = useState<"h" | "v">("h");
  const [guideAll, setGuideAll] = useState(false);
  const [cropEdit, setCropEdit] = useState<CropEdit | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  /** 사진이 든 펼침면을 지울지 묻는 중 */
  const [spreadAsk, setSpreadAsk] = useState<{ index: number; photos: number } | null>(null);
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
  const showGone = !viewOnly && goneFrames.length > 0 && editor.banner.gone !== goneKey;
  // 클라이언트가 고친 곳(받은 앨범과 사진 · 위치가 다른 프레임) · 그 펼침면
  const changed = useMemo(() => (role === "clientEdit" && base ? changedFrames(base, album) : null), [role, base, album]);
  const changedSpreads = useMemo(() => new Set(changed ? [...changed].filter((id) => F.byId[id]).map((id) => F.byId[id].spread) : []), [changed, F]);
  const goneNames = goneFrames.slice(0, 3).map((f) => `펼침면 ${f.spread + 1}의 ${pad2(f.no)}`).join(" · ") + (goneFrames.length > 3 ? ` 외 ${goneFrames.length - 3}곳` : "");

  // 위치 조정 — 그 프레임의 사진이 바뀌었으면(선택에서 빠짐 등) 조정도 끝난 것으로 본다
  const activeCrop = cropEdit && album.assign[cropEdit.frameId] === cropEdit.crop.pid ? cropEdit : null;
  function startCrop(frameId: string) {
    const c = getCrop(album, frameId);
    if (!c) return;
    editor.pickFrame(frameId);
    setTool("select");
    setCropEdit({ frameId, crop: c });
  }
  function finishCrop() {
    if (!cropEdit) return;
    setCropEdit(null);
    if (album.assign[cropEdit.frameId] === cropEdit.crop.pid) editor.setFrameCrop(cropEdit.frameId, cropEdit.crop);
  }
  const cropLive = (c: Crop) => setCropEdit((cur) => (cur ? { ...cur, crop: c } : cur));

  function changeTool(next: AlbumTool) {
    finishCrop();
    if (next !== "select" && editor.picked) editor.clearPick();
    setTool(next);
  }
  const pickedFrame = !viewOnly && tool === "select" && editor.picked ? F.byId[editor.picked] : undefined;
  const toolbarFrame = pickedFrame
    ? { ...frameMm(pickedFrame, album.page), crossing: crossesGutter(pickedFrame), hasPhoto: album.assign[pickedFrame.id] !== undefined }
    : null;
  // 보내기 — 프레임 수 = 사진 수, 모두 넣었을 때
  const frameGap = F.list.length !== photos.length;
  const canSend = photos.length > 0 && !frameGap && placed === photos.length;
  const hint = viewOnly ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex text-contents-light-bgd-weakness">
        <LockIcon size={16} />
      </span>
      스튜디오가 구성한 앨범이에요 · 보기만 할 수 있어요
    </span>
  ) : !isStudio ? (
    "사진 교체 · 위치 조정이 가능해요"
  ) : tool === "frame"
      ? "펼침면 위를 끌어서 프레임을 그려요"
      : tool === "guide"
        ? "눌러서 안내선을 놓아요 · 밖으로 끌어내면 지워져요"
        : frameGap && placed > 0
          ? `프레임 수가 사진 수(${photos.length})와 같아야 보낼 수 있어요`
          : "사진을 누르면 다음 배치 위치에 들어가요"
  ;

  // 남은 자리에 맞춘 폭(위아래 여백 · 툴바 자리를 뺀다) × 줌 — 펼침면 비율은 앨범 사이즈대로
  const fitW = Math.max(240, Math.min(areaSize.w - 96, (areaSize.h - 48 - 72) * spreadRatio(album.page)));
  const spreadW = Math.round(fitW * scaleOf(zoom));

  // 단축키 — ← → 펼침면 · ⌘Z/Ctrl+Z 되돌리기 · V R F 도구 · Delete 고른 프레임의 사진 빼기(비었으면 프레임 삭제) ·
  // Esc 고르기 풀기 · 선택 도구로(입력칸 · 창이 열려 있으면 그대로)
  const spreadAskRef = useRef(spreadAsk);
  const sendOpenRef = useRef(sendOpen);
  useEffect(() => {
    spreadAskRef.current = spreadAsk;
    sendOpenRef.current = sendOpen;
  });
  const keysRef = useRef({ editor, tool, changeTool, cropping: activeCrop !== null, finishCrop, previewOpen, role });
  useEffect(() => {
    keysRef.current = { editor, tool, changeTool, cropping: activeCrop !== null, finishCrop, previewOpen, role };
  });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const { editor: ed, tool: cur, changeTool: toTool, cropping, finishCrop: endCrop, previewOpen: previewing, role: who } = keysRef.current;
      const t = e.target instanceof Element ? e.target : null;
      if (ed.moveAsk || spreadAskRef.current || previewing || sendOpenRef.current || t?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      // 위치 조정 중에는 Esc · Enter(끝)만
      if (cropping) {
        if (e.key === "Escape" || e.key === "Enter") endCrop();
        return;
      }
      // 보기만 — 펼침면 넘기기만
      if (who === "clientView") {
        if (e.key === "ArrowLeft") ed.go(ed.album.spread - 1);
        else if (e.key === "ArrowRight") ed.go(ed.album.spread + 1);
        return;
      }
      const studio = who === "studio";
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        ed.undo();
      } else if (e.metaKey || e.ctrlKey || e.altKey) return;
      else if (e.key === "ArrowLeft") ed.go(ed.album.spread - 1);
      else if (e.key === "ArrowRight") ed.go(ed.album.spread + 1);
      else if (studio && (e.key === "v" || e.key === "V")) toTool("select");
      else if (studio && (e.key === "r" || e.key === "R")) toTool("guide");
      else if (studio && (e.key === "f" || e.key === "F")) toTool("frame");
      else if ((e.key === "Delete" || e.key === "Backspace") && ed.picked && cur === "select" && (studio || ed.canRemove)) {
        e.preventDefault();
        if (ed.canRemove) ed.removePicked();
        else ed.removeFrame(ed.picked);
      } else if (e.key === "Escape") {
        if (ed.picked) ed.clearPick();
        else if (cur !== "select") toTool("select");
      }
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
                      펼침면 {album.spread + 1} / {spreadCount}
                      {changed && changed.size > 0 && ` · 바꾼 곳 ${changed.size}`}
                      {viewOnly ? null : editor.saveError ? (
                        <>
                          {" · "}
                          <span className="text-function-error-default">저장하지 못했어요</span>{" "}
                          <button type="button" onClick={editor.saveNow} className="cursor-pointer text-contents-light-bgd-default underline underline-offset-2">
                            다시 시도
                          </button>
                        </>
                      ) : (
                        ` · ${editor.saved.kind === "manual" ? "임시 저장" : "자동 저장"} ${hhmm(editor.saved.at)}`
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
                trailing={<PreviewButton onClick={() => setPreviewOpen(true)} />}
              />
            </div>
            <div className="flex min-h-0 flex-1">
              {!viewOnly && <PhotoPanel photos={photos} ranks={ranks} cols={cols} onColsChange={setCols} onPhoto={editor.onPhoto} />}
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
                        <SpreadCanvas
                          album={album}
                          F={F}
                          width={spreadW}
                          mode={canvasMode}
                          tool={isStudio ? tool : "select"}
                          ratioLock={ratioLock}
                          canDraw={!editor.atCap}
                          guideDir={guideDir}
                          photoOf={photoOf}
                          onFrame={editor.onFrame}
                          onPick={editor.pickFrame}
                          onBackground={editor.clearPick}
                          onClear={editor.clearPick}
                          onFrameRect={editor.placeFrame}
                          onDrawFrame={(rect) => {
                            if (editor.drawFrame(rect)) setTool("select");
                          }}
                          onCapHit={editor.capHit}
                          onTooSmall={() => editor.toast("프레임이 너무 작아요 · 조금 더 크게 끌어 주세요", false, "warning")}
                          onAddGuide={(dir, pos) => editor.putGuide(dir, pos, guideAll)}
                          onMoveGuide={editor.shiftGuide}
                          onRemoveGuide={editor.dropGuide}
                          crop={activeCrop}
                          onStartCrop={startCrop}
                          onCropLive={cropLive}
                          onCropDone={finishCrop}
                        />
                      )}
                    </div>
                  </div>
                  <AlbumToolbar
                    tool={tool}
                    onTool={changeTool}
                    showTools={isStudio}
                    frameSize={isStudio}
                    allowDelete={isStudio}
                    removeLabel={isStudio ? "빼기" : "비우기"}
                    pagerAlways={!isStudio}
                    frame={toolbarFrame}
                    ratioLock={ratioLock}
                    onRatioLock={setRatioLock}
                    onResize={(dim, mm) => pickedFrame && editor.resizeFrame(pickedFrame.id, dim, mm, ratioLock)}
                    onRemovePhoto={editor.removePicked}
                    onDeleteFrame={() => pickedFrame && editor.removeFrame(pickedFrame.id)}
                    cropping={activeCrop !== null}
                    onCrop={() => (activeCrop ? finishCrop() : pickedFrame && startCrop(pickedFrame.id))}
                    extra={isStudio && tool === "guide" ? <GuideSettings dir={guideDir} onDir={setGuideDir} all={guideAll} onAll={setGuideAll} /> : undefined}
                    spread={album.spread}
                    spreadCount={spreadCount}
                    onGo={go}
                  />
                </div>
                <SpreadStrip
                  album={album}
                  F={F}
                  photoOf={photoOf}
                  grayDots={grayDots}
                  onGo={go}
                  onAdd={editor.appendSpread}
                  onDelete={(index) => {
                    const photos = editor.photosIn(index);
                    if (photos > 0) setSpreadAsk({ index, photos });
                    else editor.removeSpread(index);
                  }}
                  onMove={editor.reorderSpread}
                  manage={isStudio}
                  accentDots={changedSpreads}
                />
              </div>
            </div>
          </div>
          {/* 1024 미만 — 편집 막음, 미리보기는 폰에서도(보기만은 미리보기가 곧 앨범) */}
          <div className="hidden flex-1 flex-col items-center justify-center gap-2.5 bg-background-default-sub px-6 text-center max-[1023px]:flex">
            <span className="flex text-contents-light-bgd-weakness">
              <AlbumIcon size={40} />
            </span>
            {viewOnly ? (
              <b className="type-title-s text-contents-light-bgd-default">스튜디오가 구성한 앨범이에요</b>
            ) : (
              <>
                <b className="type-title-s text-contents-light-bgd-default">앨범 편집은 넓은 화면에서 할 수 있어요</b>
                <span className="type-content-s text-contents-light-bgd-sub">컴퓨터에서 열거나 창을 더 넓혀 주세요</span>
              </>
            )}
            <span className="mt-2">
              <PreviewButton onClick={() => setPreviewOpen(true)} />
            </span>
          </div>
        </main>
      </div>
      {snack && (
        <Snackbar kind={snack.kind} action={snack.undoable && editor.canUndo ? { label: "되돌리기", onClick: editor.undo } : undefined} className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2">
          {snack.text}
        </Snackbar>
      )}
      {previewOpen && <AlbumPreview album={album} photoOf={photoOf} title={title} onClose={() => setPreviewOpen(false)} />}
      {sendOpen && (
        <SendAlbumModal
          summary={`펼침면 ${spreadCount} · 프레임 ${F.list.length} · 배치 ${placed}장`}
          onClose={() => setSendOpen(false)}
          onSend={(mode) => {
            setSendOpen(false);
            editor.send(mode);
          }}
        />
      )}
      {spreadAsk && (
        <DeleteSpreadModal
          index={spreadAsk.index}
          photos={spreadAsk.photos}
          onClose={() => setSpreadAsk(null)}
          onConfirm={() => {
            editor.removeSpread(spreadAsk.index);
            setSpreadAsk(null);
          }}
        />
      )}
      {moveAsk && F.byId[moveAsk.from] && F.byId[moveAsk.to] && (
        <MoveConfirmModal photo={photoOf(moveAsk.photoId)} from={F.byId[moveAsk.from]} to={F.byId[moveAsk.to]} onClose={editor.cancelMove} onConfirm={editor.confirmMove} />
      )}
      <div className="max-[1023px]:hidden">
        <ShellBottomBar
          selectionCount={0}
          onClearSelection={() => {}}
          onMoveSelection={() => {}}
          hint={hint}
          status={
            viewOnly ? undefined : (
            <span className="flex items-center gap-3.5">
              <Counter label="프레임" value={F.list.length} of={photos.length} />
              <span aria-hidden className="h-6 w-px bg-border-default" />
              <Counter label="배치한 사진" value={placed} of={photos.length} />
            </span>
            )
          }
          actions={
            viewOnly ? (
              <ShellCta kind="outline" onClick={() => setPreviewOpen(true)}>
                <span className="inline-flex items-center gap-1.5">
                  <AlbumIcon size={18} />
                  앨범 미리보기
                </span>
              </ShellCta>
            ) : (
            <>
              <span className="relative inline-flex">
                <ShellCta kind="outline" disabled={!editor.dirty && !editor.saveError} onClick={editor.saveNow}>
                  임시 저장
                </ShellCta>
                {editor.dirty && <i aria-label="저장하지 않은 변경" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-accent-default" />}
              </span>
              {isStudio ? (
                <ShellCta disabled={!canSend} onClick={() => setSendOpen(true)}>
                  {editor.share ? "다시 보내기" : "클라이언트에게 보내기"}
                </ShellCta>
              ) : (
                // 돌려보내기는 서버 뒤(받는 쪽 · 알림)
                <ShellCta disabled>스튜디오에 보내기</ShellCta>
              )}
            </>
            )
          }
        />
      </div>
    </>
  );
}
