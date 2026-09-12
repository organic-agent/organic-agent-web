"use client";

/**
 * 클라이언트 3단계 보정 검토 — 보정 중 대기 · 결과 확인(전/후) · 다시 요청 · 확정 (WES-313)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ReviewStage.tsx
 *
 * 전달한 뒤(SELECTION_COMPLETED)부터 확정(ARCHIVED)까지. 회차 · 항목은 작가 3단계와 같은 API(retouch/rounds, rounds/{n})와
 * 부품(RoundList · roundItems · BeforeAfter · Lightbox)을 쓴다. 클라이언트에겐 결과가 회차를 보낸 뒤에만 보이므로
 * 진행 중 회차는 "보정 중", 마지막 회차가 COMPLETED이면 "결과 도착" — 이때 그리드 타일은 결과 사진으로 바뀐다(2026-09-12 확정).
 * 회차는 사이드바 보정 사진 아래 작가와 같은 형식.
 * 다시 요청: "다시 요청하기" → 담기 모드(체크) → 싱글뷰 요청 탭에서 결과 사진 위에 점 · 문장(2단계 패널 재사용, 초안은 브라우저)
 * → "n차 요청 보내기"(rounds/{n}/requests, 남은 횟수 1 소진) → 보정 중.
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import { Lightbox, type LightboxTabDef } from "@/components/app/Lightbox";
import { BrushIcon, CheckCircleIcon, CompareIcon, EditNoteIcon, HourglassIcon, InfoIcon, PhotoIcon, SparkleIcon } from "@/components/icons";
import { BeforeAfter } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/BeforeAfter";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { hasMemo, normalizeRoundItems, type RetouchItem } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/roundItems";
import { RoundList } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/RoundList";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { useRetouchOverview, useRetouchRoundDetail } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/useRetouchOverview";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryResponse } from "@/lib/api/galleries";
import type { PhotoResponse } from "@/lib/api/photos";
import type { RetouchRequestItem } from "@/lib/api/retouch";
import { ALL_FILTER, ClientFolderTree } from "./ClientFolderTree";
import { ClientSidebar, type ClientView, type StatusLine } from "./ClientSidebar";
import { type ClientPhase, clientStageIndexOf, clientStagesOf } from "./clientStages";
import { PhotoInfoPanel } from "./PhotoInfoPanel";
import { countDrafts, draftOf, newPointId, retouchDraftStore, toRequestItems, writeDraft } from "./retouchDraft";
import { RetouchPanel, RetouchPins } from "./RetouchPanel";
import { SendReRequestModal } from "./SendReRequestModal";

type Tab = "none" | "compare" | "request" | "info";
const TABS: LightboxTabDef[] = [
  { key: "compare", label: "전/후", icon: <CompareIcon size={18} /> },
  { key: "request", label: "내 요청", icon: <EditNoteIcon size={18} /> },
  { key: "info", label: "정보", icon: <InfoIcon size={18} /> },
];

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function ReviewStage({
  galleryId,
  gallery,
  phase,
  photos,
  folders,
  sidebarOpen,
}: {
  galleryId: number;
  gallery: GalleryResponse;
  phase: ClientPhase;
  photos: PhotoResponse[];
  folders: ConceptFolderResponse[] | null;
  sidebarOpen: boolean;
}) {
  const { overview, error: overviewError, reload: reloadOverview } = useRetouchOverview(galleryId, true);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const [reModalOpen, setReModalOpen] = useState(false);
  const draftsRaw = useSyncExternalStore(retouchDraftStore.subscribe, () => retouchDraftStore.readRaw(galleryId), () => "");
  const drafts = useMemo(() => retouchDraftStore.parse(draftsRaw), [draftsRaw]);
  const [selectedRoundNo, setSelectedRoundNo] = useState<number | null>(null);
  const [view, setView] = useState<ClientView>("retouch");
  const [sideTab, setSideTab] = useState<"folder" | "share">("folder");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("none");
  const [scrollToId, setScrollToId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<"slider" | "side">("slider");
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));

  // ── 회차 · 항목 ──
  const rounds = overview?.rounds ?? [];
  const currentRound = overview?.currentRound ?? null;
  const latest = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const activeRoundNo = selectedRoundNo ?? currentRound?.roundNo ?? latest?.roundNo ?? null;
  const activeSummary = rounds.find((r) => r.roundNo === activeRoundNo) ?? null;
  const detail = useRetouchRoundDetail(galleryId, activeRoundNo, overview ? 1 : 0);
  const items = useMemo<RetouchItem[]>(() => normalizeRoundItems(currentRound, detail, activeRoundNo), [currentRound, detail, activeRoundNo]);
  const itemById = useMemo(() => new Map(items.map((it) => [it.photo.photoId, it])), [items]);
  const memoCount = items.filter(hasMemo).length;

  // ── 하위 상태 ──
  const archived = phase === "done" || gallery.stage === "ARCHIVED";
  const resultArrived = activeSummary?.status === "COMPLETED";
  const waiting = !archived && activeSummary?.status === "REQUESTED";
  const isLatest = activeRoundNo !== null && activeRoundNo === latest?.roundNo;
  const remaining = overview?.remainingRoundCount ?? null;
  const maxRounds = overview?.maxRetouchRoundCount ?? gallery.maxRetouchRoundCount;
  const roundLabel = activeRoundNo !== null ? `${activeRoundNo}차` : "";
  const canReRequest = resultArrived && isLatest && !archived && (remaining === null || remaining > 0);
  const nextRoundNo = (latest?.roundNo ?? 0) + 1;

  // ── 다시 요청 담기 ──
  function togglePick(photoId: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }
  function startPicking() {
    setPicking(true);
    setView("retouch");
  }
  function stopPicking() {
    setPicking(false);
    setPicked(new Set());
  }
  function addPoint(photoId: number, x: number, y: number) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, { ...d, points: [...d.points, { id: newPointId(), x, y, text: "", refinedText: null, useRefinedText: false }] });
    setPicked((prev) => (prev.has(photoId) ? prev : new Set(prev).add(photoId)));
  }
  function removePoint(photoId: number, id: string) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, { ...d, points: d.points.filter((pt) => pt.id !== id) });
  }
  const pickedDraftCount = useMemo(() => {
    const only: Record<string, (typeof drafts)[string]> = {};
    for (const id of picked) if (drafts[String(id)]) only[String(id)] = drafts[String(id)];
    return countDrafts(only);
  }, [drafts, picked]);
  /** 보낼 본문 — 담은 사진 전부(메모 없는 사진은 빈 요청으로) */
  const reRequests = useMemo<RetouchRequestItem[]>(() => {
    const withMemo = new Map(toRequestItems(drafts, picked).map((r) => [r.photoId, r]));
    return [...picked].map((photoId) => withMemo.get(photoId) ?? { photoId, requestText: null, annotationKey: null, points: [] });
  }, [drafts, picked]);

  // ── 그리드 사진: 결과가 왔으면 결과 사진으로(원본 id 유지) ──
  const folderNameOf = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of folders ?? []) for (const d of c.details) for (const id of d.photoIds) map.set(id, `${c.name} / ${d.name}`);
    return (photo: PhotoResponse) => map.get(photo.photoId) ?? null;
  }, [folders]);
  const gridPhotos = useMemo<PhotoResponse[]>(() => {
    if (view === "all") return photos;
    if (view === "selected") return items.map((it) => it.photo);
    return items.map((it) => (resultArrived && it.resultUrl ? { ...it.photo, viewUrl: it.resultUrl, previewReady: true } : it.photo));
  }, [view, photos, items, resultArrived]);

  // ── 싱글뷰 ──
  const currentIndex = currentId === null ? -1 : gridPhotos.findIndex((p) => p.photoId === currentId);
  const currentPhoto = currentIndex >= 0 ? gridPhotos[currentIndex] : null;
  const currentItem = currentPhoto ? itemById.get(currentPhoto.photoId) ?? null : null;
  function openPhoto(photoId: number) {
    setCurrentId(photoId);
    setScrollToId(null);
    setLightboxOpen(true);
    if (tab === "none") setTab(resultArrived ? "compare" : "request");
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
  const status: StatusLine = (() => {
    if (!overview) return { text: overviewError ?? "불러오는 중…", tone: overviewError ? "error" : "muted" };
    if (archived) return { text: `보정 확정 · ${rounds.length}회 · 보관됨`, tone: "muted" };
    if (waiting) return { text: `${roundLabel} 보정 중${remaining !== null ? ` · 남은 횟수 ${remaining}` : ""}`, tone: "muted" };
    if (resultArrived) return { text: `${roundLabel} 결과 도착 · ${items.length}장 · 확인해 주세요`, tone: "accent" };
    return { text: "보정 검토", tone: "accent" };
  })();
  const banner = (() => {
    if (!overview) return null;
    if (archived) return { tone: "ok" as const, icon: <CheckCircleIcon size={18} />, text: <><b className="font-semibold">보정이 확정됐어요</b> · 갤러리는 보관됐고 보정본은 언제든 내려받을 수 있어요</> };
    if (waiting) return { tone: "info" as const, icon: <HourglassIcon size={18} />, text: <><b className="font-semibold">작가가 {roundLabel} 보정을 하고 있어요</b>{memoCount > 0 ? ` · 요청 ${memoCount}장` : ""} · 결과가 오면 알림으로 알려 드려요</> };
    if (picking) return { tone: "ok" as const, icon: <EditNoteIcon size={18} />, text: <><b className="font-semibold">다시 고칠 사진을 체크하고</b>, 한 장 보기의 요청 탭에서 결과 사진 위에 점을 찍어 적어 주세요</> };
    if (resultArrived && isLatest) return { tone: "ok" as const, icon: <BrushIcon size={18} />, text: <><b className="font-semibold">{roundLabel} 보정 결과 {items.length}장이 도착했어요</b> · {shortDate(activeSummary?.completedAt ?? null)} · 전/후로 확인하고 더 고칠 곳이 있으면 다시 요청하세요{remaining !== null ? `(남은 ${remaining}회)` : ""}</> };
    return null;
  })();
  const bottomHint = archived
    ? "보정이 끝났어요 · 갤러리는 보관 상태라 열람만 할 수 있어요"
    : waiting
      ? "결과가 오면 알림으로 알려 드려요 · 보낸 요청은 한 장 보기의 내 요청 탭에서 볼 수 있어요"
      : resultArrived
        ? "다 확인했으면 확정하고, 더 고칠 곳이 있으면 다시 요청해요"
        : "";

  const title =
    view === "all" ? (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{photos.length}장</small>
      </>
    ) : view === "selected" ? (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <CheckCircleIcon size={18} />
        </span>
        선택한 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{items.length}장</small>
      </>
    ) : (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <BrushIcon size={18} />
        </span>
        보정 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
          {roundLabel} {resultArrived ? "결과" : "요청"} · {items.length}장{!resultArrived && memoCount > 0 ? ` · 메모 ${memoCount}` : ""}
        </small>
      </>
    );

  const overlayOf = (photo: PhotoResponse, detailed: boolean) => {
    if (view !== "retouch") return null;
    const it = itemById.get(photo.photoId);
    if (!it) return null;
    return (
      <>
        {hasMemo(it) && detailed && !resultArrived && (
          <span className="absolute top-2 left-2 inline-flex h-4.5 items-center gap-0.5 rounded-(--pill) bg-black/55 pr-1.5 pl-1 type-label-semibold-xs text-white">
            <EditNoteIcon size={11} />
            내 요청
          </span>
        )}
        {it.hasResult && (
          <span className="absolute top-2 right-2 inline-flex h-4.5 items-center rounded-(--pill) bg-function-success-default px-1.5 type-label-semibold-xs text-white">
            결과 ✓
          </span>
        )}
        {detailed &&
          !resultArrived &&
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
          <ClientSidebar
            title={gallery.title}
            status={status}
            phase={phase}
            stages={clientStagesOf(gallery)}
            stageIndex={clientStageIndexOf(phase, gallery)}
            photoCount={photos.length}
            selectedCount={items.length}
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
                />
              ) : undefined
            }
            tabs={{
              tab: sideTab,
              onTabChange: setSideTab,
              folder:
                folders && folders.length > 0 ? (
                  <ClientFolderTree folders={folders} pickedIds={new Set(items.map((it) => it.photo.photoId))} unsortedIds={new Set()} filter={ALL_FILTER} onFocus={() => {}} onToggle={() => {}} />
                ) : (
                  <p className="px-2 type-content-xs text-contents-light-bgd-weakness">폴더가 없어요.</p>
                ),
              share: <p className="px-2 type-content-xs text-contents-light-bgd-weakness">공유폴더는 곧 열려요.</p>,
            }}
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
                sortable={false}
                onSingleView={() => {
                  if (gridPhotos.length > 0) openPhoto(currentPhoto ? currentPhoto.photoId : gridPhotos[0].photoId);
                }}
              />
              {banner && (
                <div
                  className={`mx-5 mb-2 flex items-center gap-2.5 rounded-(--radius-8) px-3 py-2.5 type-content-s text-contents-light-bgd-default ${
                    banner.tone === "info" ? "bg-function-info-background" : "bg-brand-secondary-background"
                  }`}
                >
                  <span className={banner.tone === "info" ? "text-function-info-default" : "text-brand-secondary-default"}>{banner.icon}</span>
                  <span className="min-w-0 flex-1">{banner.text}</span>
                </div>
              )}
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {gridPhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">{view === "retouch" ? "보정 회차가 아직 없어요" : "사진이 없어요"}</p>
                ) : (
                  <PhotoGrid
                    photos={gridPhotos}
                    zoom={zoom}
                    selectedIds={picked}
                    onToggle={togglePick}
                    selectable={picking && view === "retouch"}
                    markStyle="check"
                    currentId={currentId}
                    onOpen={openPhoto}
                    onTileClick={setCurrentId}
                    toggleOn="check"
                    captionOf={(p) => {
                      const it = itemById.get(p.photoId);
                      if (view === "retouch" && it) return hasMemo(it) ? it.requestText?.trim() || it.points[0]?.text || `점 ${it.points.length}` : "요청 메모 없음";
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
        hint={picking ? `고칠 사진을 담고 요청을 적은 뒤 보내요${remaining !== null ? ` · 남은 횟수 ${remaining} 중 1을 써요` : ""}` : bottomHint}
        status={
          picking ? (
            <span className="flex items-center gap-2 type-content-s text-contents-light-bgd-sub">
              담은 사진
              <b className="type-label-semibold-l text-contents-light-bgd-default tabular-nums">{picked.size}</b>
              {pickedDraftCount.points > 0 && <span className="text-contents-light-bgd-weakness">· 점 {pickedDraftCount.points}개</span>}
            </span>
          ) : undefined
        }
        actions={
          picking ? (
            <>
              <ShellCta kind="ghost" onClick={stopPicking}>
                취소
              </ShellCta>
              <ShellCta disabled={picked.size === 0} onClick={() => setReModalOpen(true)}>
                {nextRoundNo}차 요청 보내기
              </ShellCta>
            </>
          ) : resultArrived && isLatest && !archived ? (
            <>
              <span title={canReRequest ? undefined : "남은 보정 횟수가 없어요 · 작가에게 문의해 주세요"} className="inline-flex">
                <ShellCta kind="outline" disabled={!canReRequest} onClick={startPicking}>
                  <EditNoteIcon size={18} />
                  다시 요청하기{remaining !== null ? ` (${remaining})` : ""}
                </ShellCta>
              </span>
            </>
          ) : null
        }
      />

      {reModalOpen && (
        <SendReRequestModal
          galleryId={galleryId}
          roundNo={nextRoundNo}
          requests={reRequests}
          pickedCount={picked.size}
          remaining={remaining}
          onClose={() => setReModalOpen(false)}
          onSent={() => {
            setReModalOpen(false);
            for (const id of picked) writeDraft(galleryId, id, null);
            stopPicking();
            setSelectedRoundNo(null);
            reloadOverview();
          }}
        />
      )}

      {lightboxOpen && currentPhoto && (
        <Lightbox
          photo={currentItem?.photo ?? currentPhoto}
          index={currentIndex}
          total={gridPhotos.length}
          caption={[folderNameOf(currentPhoto), currentItem ? (hasMemo(currentItem) ? "내 요청 있음" : "요청 메모 없음") : null].filter(Boolean).join(" · ") || null}
          tab={currentItem ? tab : "none"}
          tabs={currentItem ? (picking ? TABS.map((t) => (t.key === "request" ? { ...t, label: "다시 요청" } : t)) : TABS) : []}
          onTabChange={(next) => setTab(next as Tab)}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          middle={
            currentItem && picking ? (
              <button
                type="button"
                aria-pressed={picked.has(currentItem.photo.photoId)}
                onClick={() => togglePick(currentItem.photo.photoId)}
                className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s transition-colors duration-fast ${
                  picked.has(currentItem.photo.photoId) ? "bg-brand-secondary-default text-white" : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <EditNoteIcon size={14} />
                {picked.has(currentItem.photo.photoId) ? "다시 요청" : "담기"}
              </button>
            ) : currentItem ? (
              <span className={`inline-flex h-7 items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s ${currentItem.resultUrl ? "bg-function-success-default text-white" : "bg-white/15 text-white/85"}`}>
                {currentItem.resultUrl ? <CheckCircleIcon size={14} /> : <HourglassIcon size={14} />}
                {currentItem.resultUrl ? `${roundLabel} 결과` : "보정 중"}
              </span>
            ) : undefined
          }
          photoNode={
            currentItem?.resultUrl && currentItem.photo.viewUrl
              ? tab === "compare"
                ? <BeforeAfter before={currentItem.photo.viewUrl} after={currentItem.resultUrl} afterLabel={`${roundLabel} 결과`} mode={compareMode} />
                : // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentItem.resultUrl} alt={currentItem.photo.originalFileName} draggable={false} className={`block max-h-[calc(100dvh-56px)] max-w-full object-contain ${tab !== "none" ? "rounded-l-(--radius-12)" : "rounded-(--radius-12)"}`} />
              : undefined
          }
          onPhotoClick={picking && currentItem && tab === "request" ? (x, y) => addPoint(currentItem.photo.photoId, x, y) : undefined}
          overlay={
            currentItem && tab === "request" && picking ? (
              <RetouchPins points={draftOf(drafts, currentItem.photo.photoId).points} onRemove={(id) => removePoint(currentItem.photo.photoId, id)} />
            ) : currentItem && tab === "request" && !currentItem.resultUrl ? (
              <>
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
              tab === "compare" ? (
                currentItem.resultUrl ? (
                  <>
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
                    <p className="type-content-xs text-contents-light-bgd-weakness">고칠 곳이 남았으면 하단 &ldquo;다시 요청하기&rdquo;로 이 사진을 담아요.</p>
                  </>
                ) : (
                  <p className="type-content-s text-contents-light-bgd-sub">아직 결과가 없어요. 작가가 보정을 마치면 여기서 전/후를 비교할 수 있어요.</p>
                )
              ) : tab === "request" ? (
                picking ? (
                  <>
                    {!picked.has(currentItem.photo.photoId) && (
                      <p className="rounded-(--radius-8) bg-function-warning-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
                        아직 담지 않은 사진이에요. 점을 찍으면 자동으로 담겨요.
                      </p>
                    )}
                    <RetouchPanel galleryId={galleryId} photoId={currentItem.photo.photoId} picked={picked.has(currentItem.photo.photoId)} editable />
                  </>
                ) : (
                  <MyRequestPanel item={currentItem} roundLabel={roundLabel} />
                )
              ) : (
                <PhotoInfoPanel galleryId={galleryId} photo={currentItem.photo} folderName={folderNameOf(currentItem.photo)} score={currentItem.photo.score} editable={false} onRate={() => {}} />
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

/** 싱글뷰 "내 요청" 탭 — 보낸 요청 읽기 */
function MyRequestPanel({ item, roundLabel }: { item: RetouchItem; roundLabel: string }) {
  if (!hasMemo(item))
    return (
      <div className="flex flex-col items-center gap-2 rounded-(--radius-12) border border-dashed border-border-default px-4 py-8 text-center">
        <p className="type-content-s text-contents-light-bgd-sub">이 사진에는 요청 메모를 쓰지 않았어요</p>
        <p className="type-content-xs text-contents-light-bgd-weakness">선택한 사진은 모두 기본 보정을 받아요</p>
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
      <p className="type-content-xs text-contents-light-bgd-weakness">{roundLabel}에 보낸 요청이에요.</p>
    </>
  );
}
