"use client";

/**
 * 작가 3단계 보정 작업 — 회차 항목 그리드 · 싱글뷰(요청 · 전/후 · 정보) · 결과 업로드 · 보내기 (WES-308)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/RetouchStage.tsx
 *
 * 클라이언트가 전달하면(SELECTION_COMPLETED) 선택한 사진 전부로 1차 회차(REQUESTED)가 생긴다 — 요청 메모(문장 · 점)는 일부에만.
 * 메모 없는 사진도 기본 보정 대상이라 결과를 올려야 회차를 보낼 수 있다(서버 규칙). 구조는 클라이언트 2단계와 같다:
 * justified 그리드 + 배지(메모 · 결과 ✓만 — "결과 없음"은 표시하지 않음 · 점) + 어두운 라이트박스(하단 한 줄: 이전 · 결과 상태 · 다음 | 요청 · 전/후 · 정보).
 * 하위 상태: 요청 도착(결과 0) → 올리는 중 → 다 올라옴 → 보냄(DELIVERY, 클라이언트 확인 중) → 다음 회차 요청 → 확정(ARCHIVED).
 */

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Lightbox, type LightboxTabDef } from "@/components/app/Lightbox";
import { ArchiveIcon, BrushIcon, CheckCircleIcon, CompareIcon, DownloadIcon, EditNoteIcon, HourglassIcon, InfoIcon, PhotoIcon, ScheduleIcon, SparkleIcon, UploadIcon } from "@/components/icons";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { closeGallery } from "@/lib/api/galleries";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryResponse } from "@/lib/api/galleries";
import type { PhotoResponse } from "@/lib/api/photos";
import type { RetouchPoint, RetouchRoundSummaryResponse } from "@/lib/api/retouch";
import type { PhotoSelectionResponse } from "@/lib/api/selection";
import { BeforeAfter } from "./BeforeAfter";
import { ChangeRoundsModal } from "./ChangeRoundsModal";
import { ExtendDeadlineModal } from "./ExtendDeadlineModal";
import { PhotoGrid } from "./PhotoGrid";
import { ResultUploadModal } from "./ResultUploadModal";
import { RetouchDownloadModal } from "./RetouchDownloadModal";
import { SendRoundModal } from "./SendRoundModal";
import { ShellBottomBar, ShellCta } from "./ShellBottomBar";
import { ShellMainHeader, sortPhotos } from "./ShellMainHeader";
import { ShellSidebar, type ShellView, type StatusLine } from "./ShellSidebar";
import { ProgressBar } from "./UploadProgress";
import { type ResultAssignment, useResultUpload } from "./useResultUpload";
import { useRetouchOverview, useRetouchRoundDetail } from "./useRetouchOverview";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "./zoomMemory";

/** 회차 항목 — 진행 중 회차(overview)와 지난 회차(detail)를 한 모양으로 */
export type RetouchItem = {
  photo: PhotoResponse;
  requestText: string | null;
  points: RetouchPoint[];
  annotationUrl: string | null;
  hasResult: boolean;
  resultUrl: string | null;
};
export const hasMemo = (it: RetouchItem) => !!it.requestText?.trim() || it.points.length > 0;

type Filter = "none" | "memo" | "noResult";
type SortKey = "noResultFirst" | "memoFirst" | "name";
type Tab = "none" | "request" | "compare" | "info";

const TABS: LightboxTabDef[] = [
  { key: "request", label: "요청", icon: <EditNoteIcon size={18} /> },
  { key: "compare", label: "전/후", icon: <CompareIcon size={18} /> },
  { key: "info", label: "정보", icon: <InfoIcon size={18} /> },
];

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function RetouchStage({
  galleryId,
  gallery,
  photos,
  folders,
  selection,
  stageIndex,
  sidebarOpen,
  onGalleryUpdated,
  onWithdrawn,
  refreshGallery,
}: {
  galleryId: number;
  gallery: GalleryResponse;
  /** 올라온 사진 전부 */
  photos: PhotoResponse[];
  folders: ConceptFolderResponse[] | null;
  selection: PhotoSelectionResponse | null;
  /** 페이지가 정한 단계 번호(제출됐으면 stage가 셀렉 대기여도 2) */
  stageIndex: number;
  sidebarOpen: boolean;
  /** 횟수 · 닫기처럼 갤러리 응답이 바로 오는 변경 */
  onGalleryUpdated: (gallery: GalleryResponse) => void;
  /** 다시 고르게 하기 뒤 — 갤러리는 셀렉 대기로 돌아가고 선택 앨범도 다시 읽어야 한다 */
  onWithdrawn: (gallery: GalleryResponse) => void;
  /** 보내기 뒤 stage(DELIVERY)를 다시 읽는다 */
  refreshGallery: () => Promise<void>;
}) {
  const { overview, error: overviewError, reload: reloadOverview } = useRetouchOverview(galleryId, true);
  const [selectedRoundNo, setSelectedRoundNo] = useState<number | null>(null);
  const [detailNonce, setDetailNonce] = useState(0);
  const [uploadOpen, setUploadOpen] = useState<{ presetPhotoId: number | null } | null>(null);
  const [modal, setModal] = useState<"send" | "withdraw" | "rounds" | "close" | "download" | null>(null);
  const [compareMode, setCompareMode] = useState<"slider" | "side">("slider");
  const [view, setView] = useState<ShellView>("retouch");
  const [filter, setFilter] = useState<Filter>("none");
  const [sort, setSort] = useState<SortKey>("noResultFirst");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("request");
  const [scrollToId, setScrollToId] = useState<number | null>(null);
  const [showAnnotation, setShowAnnotation] = useState(true);
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));

  // ── 회차 ──
  const rounds = overview?.rounds ?? [];
  const currentRound = overview?.currentRound ?? null;
  const latestRound: RetouchRoundSummaryResponse | null = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const activeRoundNo = selectedRoundNo ?? currentRound?.roundNo ?? latestRound?.roundNo ?? null;
  const activeSummary = rounds.find((r) => r.roundNo === activeRoundNo) ?? null;
  const detail = useRetouchRoundDetail(galleryId, activeRoundNo, detailNonce + (overview ? 1 : 0));
  const upload = useResultUpload(galleryId, activeRoundNo, () => {
    reloadOverview();
    setDetailNonce((n) => n + 1);
  });
  const slotInputRef = useRef<HTMLInputElement>(null);
  const slotTargetRef = useRef<number | null>(null);
  function pickResultFor(photoId: number) {
    slotTargetRef.current = photoId;
    slotInputRef.current?.click();
  }
  function startUpload(assignments: ResultAssignment[]) {
    setUploadOpen(null);
    void upload.run(assignments);
  }
  const items = useMemo<RetouchItem[]>(() => {
    const resultUrlById = new Map(detail?.roundNo === activeRoundNo ? detail.photos.map((p) => [p.photo.photoId, p.resultUrl]) : []);
    if (currentRound && currentRound.roundNo === activeRoundNo)
      return currentRound.photos.map((p) => ({
        photo: p.photo,
        requestText: p.requestText,
        points: p.points,
        annotationUrl: p.annotationUrl,
        hasResult: p.hasResult,
        resultUrl: resultUrlById.get(p.photo.photoId) ?? null,
      }));
    if (detail && detail.roundNo === activeRoundNo)
      return detail.photos.map((p) => ({
        photo: p.photo,
        requestText: p.requestText,
        points: p.points,
        annotationUrl: p.annotationUrl,
        hasResult: p.resultUrl !== null,
        resultUrl: p.resultUrl,
      }));
    return [];
  }, [currentRound, detail, activeRoundNo]);
  const itemById = useMemo(() => new Map(items.map((it) => [it.photo.photoId, it])), [items]);
  const resultCount = items.filter((it) => it.hasResult).length;
  const memoCount = items.filter(hasMemo).length;
  const allDone = items.length > 0 && resultCount === items.length;

  // ── 하위 상태 ──
  const archived = gallery.stage === "ARCHIVED";
  const requested = activeSummary?.status === "REQUESTED";
  const sentWaiting = !archived && activeSummary?.status === "COMPLETED" && activeSummary.roundNo === latestRound?.roundNo;
  // 되돌리기는 결과 업로드를 시작하기 전(stage가 RETOUCH · DELIVERY로 넘어가기 전) 1차에만
  const canWithdraw = requested && resultCount === 0 && activeRoundNo === 1 && gallery.stage !== "RETOUCH" && gallery.stage !== "DELIVERY";
  const canUpload = requested && !archived && !upload.state.running;
  const usedRounds = rounds.filter((r) => r.status !== "DRAFTING").length;

  // ── 폴더 이름 · 그리드 목록 ──
  const folderNameOf = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of folders ?? []) for (const d of c.details) for (const id of d.photoIds) map.set(id, `${c.name} / ${d.name}`);
    return (photo: PhotoResponse) => map.get(photo.photoId) ?? null;
  }, [folders]);
  const pickedPhotos = useMemo(() => selection?.photos.map((s) => s.photo) ?? [], [selection]);
  const gridItems = useMemo(() => {
    let list = items;
    if (filter === "memo") list = list.filter(hasMemo);
    if (filter === "noResult") list = list.filter((it) => !it.hasResult);
    const sorted = [...list];
    const byOrder = (a: RetouchItem, b: RetouchItem) => a.photo.displayOrder - b.photo.displayOrder || a.photo.photoId - b.photo.photoId;
    if (sort === "noResultFirst") sorted.sort((a, b) => Number(a.hasResult) - Number(b.hasResult) || byOrder(a, b));
    else if (sort === "memoFirst") sorted.sort((a, b) => Number(hasMemo(b)) - Number(hasMemo(a)) || byOrder(a, b));
    else sorted.sort((a, b) => a.photo.originalFileName.localeCompare(b.photo.originalFileName, "ko"));
    return sorted;
  }, [items, filter, sort]);
  const gridPhotos = useMemo(
    () => (view === "retouch" ? gridItems.map((it) => it.photo) : view === "selected" ? pickedPhotos : sortPhotos(photos, "uploaded")),
    [view, gridItems, pickedPhotos, photos],
  );

  // ── 싱글뷰 ──
  const currentIndex = currentId === null ? -1 : gridPhotos.findIndex((p) => p.photoId === currentId);
  const currentPhoto = currentIndex >= 0 ? gridPhotos[currentIndex] : null;
  const currentItem = currentPhoto ? itemById.get(currentPhoto.photoId) ?? null : null;
  function openPhoto(photoId: number) {
    setCurrentId(photoId);
    setScrollToId(null);
    setLightboxOpen(true);
  }
  function closeLightbox() {
    setLightboxOpen(false);
    setScrollToId(currentId);
  }
  function step(delta: number) {
    if (gridPhotos.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : 0;
    setCurrentId(gridPhotos[(base + delta + gridPhotos.length) % gridPhotos.length].photoId);
  }

  // ── 상태줄 · 배너 · 하단 ──
  const roundLabel = activeRoundNo !== null ? `${activeRoundNo}차` : "";
  const remaining = overview?.remainingRoundCount ?? null;
  const maxRounds = overview?.maxRetouchRoundCount ?? gallery.maxRetouchRoundCount;
  const status: StatusLine = (() => {
    if (!overview) return { text: overviewError ?? "불러오는 중…", tone: overviewError ? "error" : "muted" };
    if (archived) return { text: `보정 확정 · ${rounds.length}회 완료 · 보관됨`, tone: "muted" };
    if (sentWaiting) return { text: `${roundLabel} 보냄 · 클라이언트 확인 중${remaining !== null ? ` · 남은 횟수 ${remaining}` : ""}`, tone: "muted" };
    if (requested) {
      if (resultCount === 0) return { text: `${roundLabel} 요청 도착 · ${items.length}장(메모 ${memoCount}) · 결과 0 / ${items.length}`, tone: "warning" };
      if (allDone) return { text: `결과 ${resultCount} / ${items.length} · 보내기 전`, tone: "accent" };
      return { text: `결과 ${resultCount} / ${items.length} 올림`, tone: "accent" };
    }
    return { text: "보정 작업", tone: "accent" };
  })();
  const banner = (() => {
    if (!overview) return null;
    if (archived) return { tone: "ok" as const, icon: <CheckCircleIcon size={18} />, text: <><b className="font-semibold">클라이언트가 보정을 확정했어요</b> · {rounds.length}회 · 갤러리는 보관 상태예요</> };
    if (sentWaiting) return { tone: "info" as const, icon: <HourglassIcon size={18} />, text: <><b className="font-semibold">{roundLabel} 결과를 보냈어요</b> · {shortDate(activeSummary?.completedAt ?? null)} · 클라이언트가 확인하고 있어요. 재요청이 오면 알림으로 알려 드려요</> };
    if (requested && resultCount === 0)
      return activeRoundNo === 1
        ? { tone: "warn" as const, icon: <BrushIcon size={18} />, text: <><b className="font-semibold">클라이언트가 {items.length}장을 골라 전달했어요</b> · 보정 요청 메모 {memoCount}장 · {shortDate(activeSummary?.requestedAt ?? null)}. 결과를 올리기 시작하면 다시 고르게 할 수 없어요</> }
        : { tone: "warn" as const, icon: <BrushIcon size={18} />, text: <><b className="font-semibold">{roundLabel} 보정 요청 {items.length}장이 도착했어요</b> · {shortDate(activeSummary?.requestedAt ?? null)} · 지난 결과를 보고 다시 요청했어요</> };
    return null;
  })();
  const bottomHint = archived
    ? "보정이 끝나 갤러리가 보관됐어요"
    : sentWaiting
      ? "클라이언트가 확인 중이에요 · 재요청 또는 확정이 오면 알림으로 알려 드려요"
      : requested
        ? resultCount === 0
          ? "요청을 확인하고 보정한 결과를 올려 주세요 · 메모 없는 사진도 기본 보정 대상이라 결과가 필요해요"
          : allDone
            ? "모든 사진에 결과가 있어요 · 보내면 클라이언트가 확인하고 재요청하거나 확정해요"
            : `결과 ${resultCount} / ${items.length} · 파일명이 같으면 자동으로 맞춰져요`
        : "";

  const title =
    view === "retouch" ? (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <BrushIcon size={18} />
        </span>
        {roundLabel} 보정
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
          {items.length}장 · 결과 {resultCount} / {items.length}
        </small>
      </>
    ) : view === "selected" ? (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <CheckCircleIcon size={18} />
        </span>
        선택한 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{pickedPhotos.length}장</small>
      </>
    ) : (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{photos.length}장</small>
      </>
    );

  const overlayOf = (photo: PhotoResponse, detailed: boolean) => {
    if (view !== "retouch") return null;
    const it = itemById.get(photo.photoId);
    if (!it) return null;
    return (
      <>
        {hasMemo(it) && detailed && (
          <span className="absolute top-2 left-2 inline-flex h-4.5 items-center gap-0.5 rounded-(--pill) bg-black/55 pr-1.5 pl-1 type-label-semibold-xs text-white">
            <EditNoteIcon size={11} />
            메모
          </span>
        )}
        {it.hasResult && (
          <span className="absolute top-2 right-2 inline-flex h-4.5 items-center rounded-(--pill) bg-function-success-default px-1.5 type-label-semibold-xs text-white">
            결과 ✓
          </span>
        )}
        {detailed &&
          it.points.map((pt, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute grid size-4.5 -translate-1/2 place-items-center rounded-full border-2 border-white bg-brand-secondary-default type-label-semibold-xs text-white shadow-[0_1px_4px_rgba(0,0,0,.35)]"
              style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
            >
              {i + 1}
            </span>
          ))}
      </>
    );
  };

  return (
    <>
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <ShellSidebar
            title={gallery.title}
            status={status}
            stageIndex={stageIndex}
            photoCount={photos.length}
            selectedLocked={false}
            selectedCount={selection?.selectedCount ?? pickedPhotos.length}
            maxSelectable={gallery.maxSelectablePhotoCount}
            retouchCount={items.length}
            view={view}
            onViewChange={(next) => {
              setView(next);
              setCurrentId(null);
            }}
            extra={
              overview && rounds.length > 0 ? (
                <RoundList
                  rounds={rounds}
                  activeRoundNo={activeRoundNo}
                  remaining={remaining}
                  maxRounds={maxRounds}
                  onSelect={(n) => {
                    setSelectedRoundNo(n);
                    setView("retouch");
                    setCurrentId(null);
                  }}
                  onChangeRounds={archived ? undefined : () => setModal("rounds")}
                />
              ) : undefined
            }
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {!overview && !overviewError ? (
            <div className="flex-1" aria-busy="true" />
          ) : (
            <>
              <ShellMainHeader
                title={title}
                zoom={zoom}
                onZoomChange={writeZoom}
                sort="uploaded"
                onSortChange={() => {}}
                filter="none"
                onFilterChange={() => {}}
                sortable={view === "retouch"}
                customSort={{
                  value: sort,
                  options: [
                    { key: "noResultFirst", label: "결과 없음 먼저" },
                    { key: "memoFirst", label: "메모 먼저" },
                    { key: "name", label: "파일명 순" },
                  ],
                  onChange: (key) => setSort(key as SortKey),
                }}
                customFilter={{
                  value: filter,
                  options: [
                    { key: "memo", label: "메모 있음", trailing: String(memoCount) },
                    { key: "noResult", label: "결과 없음", trailing: String(items.length - resultCount) },
                  ],
                  onChange: (key) => setFilter(key as Filter),
                }}
                onSingleView={() => {
                  if (gridPhotos.length > 0) openPhoto(currentPhoto ? currentPhoto.photoId : gridPhotos[0].photoId);
                }}
              />
              {banner && (
                <div
                  className={`mx-5 mb-2 flex items-center gap-2.5 rounded-(--radius-8) px-3 py-2.5 type-content-s text-contents-light-bgd-default ${
                    banner.tone === "warn" ? "bg-function-warning-background" : banner.tone === "info" ? "bg-function-info-background" : "bg-brand-secondary-background"
                  }`}
                >
                  <span className={banner.tone === "warn" ? "text-function-warning-default" : banner.tone === "info" ? "text-function-info-default" : "text-brand-secondary-default"}>{banner.icon}</span>
                  <span className="min-w-0 flex-1">{banner.text}</span>
                </div>
              )}
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {gridPhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
                    {view === "retouch" ? (items.length === 0 ? "보정 회차가 아직 없어요" : "조건에 맞는 사진이 없어요") : "사진이 없어요"}
                  </p>
                ) : (
                  <PhotoGrid
                    photos={gridPhotos}
                    zoom={zoom}
                    selectedIds={new Set()}
                    onToggle={() => {}}
                    selectable={false}
                    currentId={currentId}
                    onOpen={openPhoto}
                    onTileClick={setCurrentId}
                    toggleOn="check"
                    captionOf={(p) => {
                      const it = itemById.get(p.photoId);
                      if (view === "retouch" && it) return hasMemo(it) ? (it.requestText?.trim() || it.points[0]?.text || `점 ${it.points.length}`) : "기본 보정 — 요청 메모 없음";
                      return folderNameOf(p);
                    }}
                    overlayOf={overlayOf}
                    scrollToId={scrollToId}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <ShellBottomBar
        selectionCount={0}
        onClearSelection={() => {}}
        onMoveSelection={() => {}}
        hint={
          upload.state.failed.length > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-2 text-function-error-default">
              {upload.state.failed.length}장을 올리지 못했어요 · {upload.state.failed[0].reason}
              <button type="button" onClick={() => void upload.run(upload.state.failed.map((f) => ({ file: f.file, photoId: f.photoId })))} className="cursor-pointer underline underline-offset-2">
                다시 올리기
              </button>
              <button type="button" onClick={upload.clearFailed} className="cursor-pointer text-contents-light-bgd-weakness underline underline-offset-2">
                닫기
              </button>
            </span>
          ) : (
            bottomHint
          )
        }
        progress={
          upload.state.running ? (
            <ProgressBar
              icon={<UploadIcon size={18} />}
              title={`결과 업로드 ${upload.state.done} / ${upload.state.total}`}
              ratio={upload.state.total ? upload.state.done / upload.state.total : null}
              sub={
                <button type="button" onClick={upload.cancel} className="cursor-pointer underline underline-offset-2">
                  중단
                </button>
              }
            />
          ) : undefined
        }
        status={
          requested ? (
            <span className="flex items-center gap-2 type-content-s text-contents-light-bgd-sub">
              결과
              <b className={`type-label-semibold-l tabular-nums ${allDone ? "text-brand-secondary-dark" : "text-contents-light-bgd-default"}`}>{resultCount}</b>
              <span className="text-contents-light-bgd-weakness">/ {items.length}</span>
            </span>
          ) : undefined
        }
        actions={
          archived ? (
            <span className="inline-flex items-center gap-1.5 rounded-(--pill) bg-brand-secondary-background px-3 py-1.5 type-label-semibold-s text-brand-secondary-dark">
              <CheckCircleIcon size={16} />
              작업 완료 · 보관됨
            </span>
          ) : sentWaiting ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-(--pill) bg-function-info-background px-3 py-1.5 type-label-semibold-s text-function-info-default">
                <HourglassIcon size={16} />
                {roundLabel} 보냄 · 확인 중
              </span>
              <ShellCta kind="outline" onClick={() => setModal("close")}>
                <ArchiveIcon size={18} />
                갤러리 마무리
              </ShellCta>
            </>
          ) : canUpload ? (
            resultCount === 0 ? (
              <>
                <ShellCta kind="outline" onClick={() => setModal("download")}>
                  <DownloadIcon size={18} />
                  내려받기
                </ShellCta>
                {canWithdraw && (
                  <ShellCta kind="outline" onClick={() => setModal("withdraw")}>
                    <ScheduleIcon size={18} />
                    다시 고르게 하기
                  </ShellCta>
                )}
                <ShellCta onClick={() => setUploadOpen({ presetPhotoId: null })}>
                  <UploadIcon size={18} />
                  결과 올리기
                </ShellCta>
              </>
            ) : allDone ? (
              <>
                <ShellCta kind="secondary" onClick={() => setUploadOpen({ presetPhotoId: null })}>
                  <UploadIcon size={18} />
                  결과 바꾸기
                </ShellCta>
                <ShellCta onClick={() => setModal("send")}>{roundLabel} 보정 보내기</ShellCta>
              </>
            ) : (
              <>
                <ShellCta kind="outline" onClick={() => setModal("download")}>
                  <DownloadIcon size={18} />
                  내려받기
                </ShellCta>
                <ShellCta onClick={() => setUploadOpen({ presetPhotoId: null })}>
                  <UploadIcon size={18} />
                  결과 더 올리기
                </ShellCta>
              </>
            )
          ) : null
        }
      />

      {modal === "download" && activeRoundNo !== null && (
        <RetouchDownloadModal galleryTitle={gallery.title} roundNo={activeRoundNo} items={items} onClose={() => setModal(null)} />
      )}

      {modal === "send" && activeRoundNo !== null && (
        <SendRoundModal
          galleryId={galleryId}
          roundNo={activeRoundNo}
          photoCount={items.length}
          remainingAfter={remaining}
          onClose={() => setModal(null)}
          onSent={() => {
            setModal(null);
            reloadOverview();
            void refreshGallery();
          }}
        />
      )}
      {modal === "withdraw" && (
        <ExtendDeadlineModal
          gallery={gallery}
          selectedCount={selection?.selectedCount ?? items.length}
          submitted
          onClose={() => setModal(null)}
          onDone={(updated) => {
            setModal(null);
            onWithdrawn(updated);
          }}
        />
      )}
      {modal === "rounds" && (
        <ChangeRoundsModal
          gallery={gallery}
          usedRounds={usedRounds}
          onClose={() => setModal(null)}
          onDone={(updated) => {
            setModal(null);
            onGalleryUpdated(updated);
            reloadOverview();
          }}
        />
      )}
      {modal === "close" && (
        <CloseGalleryModal
          galleryId={galleryId}
          roundCount={usedRounds}
          onClose={() => setModal(null)}
          onDone={(updated) => {
            setModal(null);
            onGalleryUpdated(updated);
          }}
        />
      )}

      <input
        ref={slotInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          const photoId = slotTargetRef.current;
          e.target.value = "";
          if (file && photoId !== null) void upload.run([{ file, photoId }]);
        }}
      />
      {uploadOpen && activeRoundNo !== null && (
        <ResultUploadModal
          galleryId={galleryId}
          roundNo={activeRoundNo}
          items={items}
          presetPhotoId={uploadOpen.presetPhotoId}
          onClose={() => setUploadOpen(null)}
          onStart={startUpload}
        />
      )}

      {lightboxOpen && currentPhoto && (
        <Lightbox
          photo={currentPhoto}
          index={currentIndex}
          total={gridPhotos.length}
          caption={[folderNameOf(currentPhoto), currentItem ? (hasMemo(currentItem) ? "메모 있음" : "기본 보정") : null].filter(Boolean).join(" · ") || null}
          tab={currentItem ? tab : "none"}
          tabs={currentItem ? TABS : []}
          photoNode={
            currentItem && tab === "compare" && currentItem.resultUrl && currentPhoto.viewUrl ? (
              <BeforeAfter before={currentPhoto.viewUrl} after={currentItem.resultUrl} afterLabel={`${roundLabel} 결과`} mode={compareMode} />
            ) : undefined
          }
          onTabChange={(next) => setTab(next as Tab)}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          middle={
            currentItem ? (
              <span
                className={`inline-flex h-7 items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s ${
                  currentItem.hasResult ? "bg-function-success-default text-white" : "bg-white/15 text-white/85"
                }`}
              >
                {currentItem.hasResult ? <CheckCircleIcon size={14} /> : <HourglassIcon size={14} />}
                {currentItem.hasResult ? "결과 ✓" : "결과 없음"}
              </span>
            ) : undefined
          }
          overlay={
            currentItem && tab !== "compare" ? (
              <>
                {showAnnotation && currentItem.annotationUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentItem.annotationUrl} alt="" className="pointer-events-none absolute inset-0 size-full object-contain opacity-90" />
                )}
                {currentItem.points.map((pt, i) => (
                  <span
                    key={i}
                    title={pt.useRefinedText && pt.refinedText ? pt.refinedText : pt.text}
                    className="absolute grid size-5.5 -translate-1/2 place-items-center rounded-full border-2 border-white bg-brand-secondary-default type-label-semibold-xs text-white shadow-[0_2px_6px_rgba(0,0,0,.35)]"
                    style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
                  >
                    {i + 1}
                  </span>
                ))}
              </>
            ) : undefined
          }
          panel={
            currentItem ? (
              tab === "request" ? (
                <>
                  <RequestPanel item={currentItem} showAnnotation={showAnnotation} onToggleAnnotation={() => setShowAnnotation((v) => !v)} />
                  <ResultSlot item={currentItem} enabled={canUpload} onPick={() => pickResultFor(currentItem.photo.photoId)} />
                </>
              ) : tab === "compare" ? (
                <>
                  {currentItem.resultUrl ? (
                    <div className="flex rounded-(--radius-8) bg-surface-default-medium p-0.75" role="tablist" aria-label="비교 방식">
                      {(["slider", "side"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={compareMode === m}
                          onClick={() => setCompareMode(m)}
                          className={`flex-1 cursor-pointer rounded-(--radius-4) py-1.5 type-label-medium-s transition-colors duration-fast ${
                            compareMode === m ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-contents-light-bgd-weakness"
                          }`}
                        >
                          {m === "slider" ? "슬라이더" : "나란히"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="type-content-s text-contents-light-bgd-sub">아직 결과가 없어요. 아래에서 올리면 바로 비교할 수 있어요.</p>
                  )}
                  <ResultSlot item={currentItem} enabled={canUpload} onPick={() => pickResultFor(currentItem.photo.photoId)} />
                </>
              ) : (
                <InfoPanel item={currentItem} folderName={folderNameOf(currentPhoto)} />
              )
            ) : (
              <p className="type-content-s text-contents-light-bgd-sub">이 회차의 사진이 아니에요.</p>
            )
          }
        />
      )}
    </>
  );
}

/** 사이드바 — 회차 목록 · 남은 횟수 */
function RoundList({
  rounds,
  activeRoundNo,
  remaining,
  maxRounds,
  onSelect,
  onChangeRounds,
}: {
  rounds: RetouchRoundSummaryResponse[];
  activeRoundNo: number | null;
  remaining: number | null;
  maxRounds: number | null;
  onSelect: (roundNo: number) => void;
  onChangeRounds?: () => void;
}) {
  const tag: Record<RetouchRoundSummaryResponse["status"], { label: string; cls: string }> = {
    DRAFTING: { label: "작성 중", cls: "bg-surface-default-light text-contents-light-bgd-weakness" },
    REQUESTED: { label: "요청 중", cls: "bg-function-warning-background text-function-warning-default" },
    COMPLETED: { label: "완료", cls: "bg-brand-secondary-background text-brand-secondary-dark" },
  };
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1.5 px-2.5 pt-1 pb-1 type-label-semibold-xs text-contents-light-bgd-weakness after:h-px after:flex-1 after:bg-divider-default after:content-['']">회차</p>
      {rounds.map((r) => {
        const active = r.roundNo === activeRoundNo;
        return (
          <button
            key={r.roundNo}
            type="button"
            aria-current={active || undefined}
            onClick={() => onSelect(r.roundNo)}
            className={`relative flex w-full cursor-pointer items-center gap-2 rounded-(--radius-8) py-1.5 pr-2.5 pl-3.5 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness ${
              active
                ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-default before:content-['']"
                : "text-contents-light-bgd-sub"
            }`}
          >
            {r.roundNo}차 보정
            <span className="type-content-xs text-contents-light-bgd-weakness">{r.photoCount}장</span>
            <span className={`ml-auto rounded-(--pill) px-1.5 py-px type-label-semibold-xs ${tag[r.status].cls}`}>{tag[r.status].label}</span>
          </button>
        );
      })}
      <p className="flex items-center gap-2 px-3.5 pt-1 type-content-xs text-contents-light-bgd-weakness">
        {maxRounds !== null ? `남은 횟수 ${remaining ?? "—"} / ${maxRounds}` : "횟수 제한 없음"}
        {onChangeRounds && (
          <button type="button" onClick={onChangeRounds} className="cursor-pointer text-brand-secondary-dark underline underline-offset-2">
            횟수 바꾸기
          </button>
        )}
      </p>
    </div>
  );
}

/** 싱글뷰 "요청" 탭 — 전체 요청 · 포인트 n(AI 다듬은 문장 크게, 원문 작게) · 주석 토글 */
function RequestPanel({ item, showAnnotation, onToggleAnnotation }: { item: RetouchItem; showAnnotation: boolean; onToggleAnnotation: () => void }) {
  if (!hasMemo(item))
    return (
      <div className="flex flex-col items-center gap-2 rounded-(--radius-12) border border-dashed border-border-default px-4 py-8 text-center">
        <p className="type-content-s text-contents-light-bgd-sub">요청 메모가 없는 사진이에요</p>
        <p className="type-content-xs text-contents-light-bgd-weakness">선택된 사진은 모두 기본 보정 대상이라 결과가 필요해요</p>
      </div>
    );
  return (
    <>
      {item.requestText?.trim() && (
        <section className="rounded-(--radius-8) bg-surface-default-lightness px-3 py-2.5">
          <h4 className="mb-1 type-label-semibold-xs text-contents-light-bgd-weakness">사진 전체 요청</h4>
          <p className="type-content-s leading-relaxed whitespace-pre-wrap text-contents-light-bgd-default">{item.requestText}</p>
        </section>
      )}
      {item.points.length > 0 && (
        <ol className="flex flex-col gap-3">
          {item.points.map((pt, i) => {
            const refined = pt.useRefinedText && pt.refinedText;
            return (
              <li key={i} className="flex flex-col gap-1.5 rounded-(--radius-8) border border-border-default p-2.5">
                <span className="flex items-center gap-2 type-label-semibold-s text-contents-light-bgd-default">
                  <span className="grid size-4.5 place-items-center rounded-full bg-brand-secondary-default type-label-semibold-xs text-white">{i + 1}</span>
                  포인트 {i + 1}
                </span>
                <p className="type-content-s leading-relaxed text-contents-light-bgd-default">{refined ? pt.refinedText : pt.text}</p>
                {refined && (
                  <p className="inline-flex flex-wrap items-center gap-1 type-content-xs text-contents-light-bgd-weakness">
                    <span className="inline-flex items-center gap-0.5 text-brand-secondary-dark">
                      <SparkleIcon size={12} />
                      AI가 다듬은 문장
                    </span>
                    · 원문: {pt.text}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {item.annotationUrl && (
        <label className="inline-flex cursor-pointer items-center gap-2 type-content-xs text-contents-light-bgd-sub">
          <input type="checkbox" checked={showAnnotation} onChange={onToggleAnnotation} />
          주석 이미지 겹쳐 보기
        </label>
      )}
    </>
  );
}

function InfoPanel({ item, folderName }: { item: RetouchItem; folderName: string | null }) {
  const rows: [string, string][] = [
    ["형식", item.photo.contentType.split("/")[1]?.toUpperCase().replace("JPEG", "JPG") ?? item.photo.contentType],
    ["폴더", folderName ?? "미분류"],
    ["요청 메모", hasMemo(item) ? `있음${item.points.length ? ` · 점 ${item.points.length}` : ""}` : "없음 · 기본 보정"],
    ["결과", item.hasResult ? "올라옴" : "없음"],
  ];
  return (
    <dl className="flex flex-col gap-1 type-content-s">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-divider-default py-1.5 last:border-b-0">
          <dt className="shrink-0 text-contents-light-bgd-sub">{k}</dt>
          <dd className="truncate text-right font-medium text-contents-light-bgd-default">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 싱글뷰 패널 아래 — 이 사진의 결과 올리기 · 바꾸기 */
function ResultSlot({ item, enabled, onPick }: { item: RetouchItem; enabled: boolean; onPick: () => void }) {
  return (
    <div className={`mt-auto flex flex-col gap-1.5 rounded-(--radius-8) border p-3 ${item.hasResult ? "border-function-success-default/40 bg-function-success-background" : "border-dashed border-border-default"}`}>
      <p className={`inline-flex items-center gap-1 type-label-semibold-s ${item.hasResult ? "text-function-success-default" : "text-contents-light-bgd-default"}`}>
        {item.hasResult ? <CheckCircleIcon size={16} /> : <UploadIcon size={16} />}
        {item.hasResult ? "결과 올라옴" : "이 사진의 결과"}
      </p>
      <button
        type="button"
        disabled={!enabled}
        onClick={onPick}
        className="h-8 cursor-pointer rounded-(--radius-8) border border-border-default type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:opacity-50"
      >
        {item.hasResult ? "결과 바꾸기" : "결과 파일 고르기"}
      </button>
      {!item.hasResult && <p className="type-content-xs text-contents-light-bgd-weakness">여러 장은 하단 &ldquo;결과 올리기&rdquo;에서 파일명으로 한꺼번에 맞춰요.</p>}
    </div>
  );
}

/** 갤러리 마무리(종료 · 보관) — 클라이언트가 확정도 재요청도 하지 않을 때 작가가 닫는다 */
function CloseGalleryModal({ galleryId, roundCount, onClose, onDone }: { galleryId: number; roundCount: number; onClose: () => void; onDone: (gallery: GalleryResponse) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await closeGallery(galleryId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }
  return (
    <GalleryModalShell
      title="이 갤러리를 마무리할까요?"
      desc={
        <>
          보정 {roundCount}회를 보냈고 클라이언트의 확정 · 재요청이 없어요. 마무리하면 갤러리가 <b className="text-contents-light-bgd-default">보관 상태</b>가 되어 열람만 할 수 있어요.
          다시 열어야 하면 &ldquo;재오픈&rdquo;으로 마감을 새로 정해 열 수 있어요.
        </>
      }
      maxWidthClassName="max-w-105"
      onClose={onClose}
    >
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void confirm()} confirmLabel={busy ? "마무리하는 중…" : "마무리(보관)"} disabled={busy} />
    </GalleryModalShell>
  );
}
