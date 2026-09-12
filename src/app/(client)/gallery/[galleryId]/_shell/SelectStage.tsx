"use client";

/**
 * 클라이언트 2단계 — 셀렉 & 보정 요청 화면 (WES-312, 2026-09-12 보드 확정)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/SelectStage.tsx
 *
 * 폴더 확정 뒤에는 폴더 열이 사라지고 2열이다: 사이드바(기본 열림 — 폴더 | 공유 탭, 체크박스 트리) + 그리드.
 * 그리드에 레일 · 우측 패널은 없고 정보 · AI · 보정 요청은 싱글뷰에서 한다.
 * 선택 앨범(photo-selection)은 서버가 정본 — 신랑 · 신부가 같이 고르므로 화면이 보일 때 주기적으로 다시 읽는다
 * (useSelectionSync: 화면은 즉시, 서버는 잠깐 뒤 차이만). 타일 표시 = 체크만 + 현재 사진 올리브 선 + 별점 배지.
 * 싱글뷰(Lightbox)는 돋보기 · 더블클릭 · 헤더 "한 장 보기"로 열고, 닫으면 그 사진으로 스크롤한다.
 * 별점은 사진당 한 칸을 신랑 · 신부 · 작가가 같이 쓴다(ratings API) — 화면은 override로 바로 바꾼다.
 * 보정 요청은 싱글뷰 "보정 요청" 탭에서 사진 위를 눌러 점을 찍고, 초안은 브라우저(retouchDraft)에 두다가 전달하기에 실린다.
 * AI 추천은 헤더 버튼 하나(폴더 단위, 입력 없음) → 결과가 그리드 맨 위 그룹 + ✦ 배지, 이유는 호버 캡션 · 싱글뷰 AI 탭.
 * 하단: 선택 요약 · "선택 장수 추가 요청"(작가 알림) · "작가에게 전달하기"(계약 장수를 채웠을 때만 — 서버가 정확히 채워야 받는다).
 * 전달한 뒤(submitted)는 읽기 전용 + 배너 + CSV 내려받기.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AddPhotoIcon, CheckCircleIcon, ChevronRightIcon, DownloadIcon, PhotoIcon, PlaylistAddCheckIcon, RefreshIcon, SparkleIcon, StarFillIcon, StarIcon } from "@/components/icons";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader, type SortKey, sortPhotos } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryResponse } from "@/lib/api/galleries";
import { ApiError } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";
import { clearPhotoRating, ratePhoto } from "@/lib/api/ratings";
import { downloadSelectionCsv } from "@/lib/api/selection";
import { ALL_FILTER, ClientFolderTree, type FolderKey, isAllFilter, type PhotoFilter } from "./ClientFolderTree";
import { ClientSelectCoachMarks } from "./ClientSelectCoachMarks";
import { ClientSidebar, type ClientView, type StatusLine } from "./ClientSidebar";
import { countView } from "./clientMemory";
import { type ClientPhase, clientStageIndexOf, clientStagesOf } from "./clientStages";
import { increaseStore, readIncreaseRequest, writeIncreaseRequest } from "./increaseMemory";
import { IncreaseRequestModal } from "./IncreaseRequestModal";
import { Lightbox, type LightboxTab } from "./Lightbox";
import { PhotoInfoPanel } from "./PhotoInfoPanel";
import { countDrafts, draftOf, newPointId, retouchDraftStore, toRequestItems, writeDraft } from "./retouchDraft";
import { SubmitSelectionModal } from "./SubmitSelectionModal";
import { RetouchPanel, RetouchPins } from "./RetouchPanel";
import { useAiRecommendations } from "./useAiRecommendations";
import { useSelectionSync } from "./useSelectionSync";

function ddayLabel(deadline: string | null): string {
  const offset = deadlineOffset(deadline);
  if (offset === null) return "기한 없음";
  if (offset < 0) return `D-${-offset}`;
  if (offset === 0) return "오늘 마감";
  return `${offset}일 지남`;
}

export function SelectStage({
  galleryId,
  gallery,
  phase,
  photos,
  photosLoaded,
  folders,
  sidebarOpen,
  reloadGallery,
}: {
  galleryId: number;
  gallery: GalleryResponse;
  phase: ClientPhase;
  /** 올라온(UPLOADED) 사진 전부 */
  photos: PhotoResponse[];
  photosLoaded: boolean;
  /** 정규화된 컨셉 폴더(null = 아직) */
  folders: ConceptFolderResponse[] | null;
  sidebarOpen: boolean;
  /** 전달한 뒤 갤러리 단계를 다시 읽는다 */
  reloadGallery: () => void;
}) {
  const editable = phase === "select";
  const maxSelectable = gallery.maxSelectablePhotoCount;
  const { selection, pickedIds, toggle, pickMany, refresh: refreshSelection, notice, clearNotice } = useSelectionSync(galleryId, editable, maxSelectable);
  const [increaseOpen, setIncreaseOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const increaseRaw = useSyncExternalStore(increaseStore.subscribe, () => increaseStore.readRaw(galleryId), () => "");
  const increasePending = useMemo(() => {
    void increaseRaw;
    return readIncreaseRequest(galleryId);
  }, [increaseRaw, galleryId]);
  // 작가가 장수를 바꿨으면(요청 당시와 다름) "요청함" 기억을 지운다
  useEffect(() => {
    if (increasePending && increasePending.maxAtRequest !== maxSelectable) writeIncreaseRequest(galleryId, null);
  }, [increasePending, maxSelectable, galleryId]);
  const ai = useAiRecommendations(galleryId);
  const { current: aiCurrent, byPhotoId: aiByPhotoId } = ai;
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tab, setTab] = useState<LightboxTab>("none");
  const [scrollToId, setScrollToId] = useState<number | null>(null);
  /** 별점 낙관적 갱신 — 서버 답이 오기 전에 화면부터 */
  const [scoreOverrides, setScoreOverrides] = useState<Map<number, number | null>>(() => new Map());
  const [view, setView] = useState<ClientView>("all");
  const [sideTab, setSideTab] = useState<"folder" | "share">("folder");
  const [filter, setFilter] = useState<PhotoFilter>(ALL_FILTER);
  const [sort, setSort] = useState<SortKey>("uploaded");
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));
  const draftsRaw = useSyncExternalStore(retouchDraftStore.subscribe, () => retouchDraftStore.readRaw(galleryId), () => "");
  const drafts = useMemo(() => retouchDraftStore.parse(draftsRaw), [draftsRaw]);
  const draftCount = useMemo(() => countDrafts(drafts), [drafts]);

  // ── 파생값 ──
  const scoredPhotos = useMemo(
    () => (scoreOverrides.size === 0 ? photos : photos.map((p) => (scoreOverrides.has(p.photoId) ? { ...p, score: scoreOverrides.get(p.photoId) ?? null } : p))),
    [photos, scoreOverrides],
  );
  const photoById = useMemo(() => new Map(scoredPhotos.map((p) => [p.photoId, p])), [scoredPhotos]);
  // 고른 사진 — 화면(local)이 정본, 서버 응답의 보정본 정보는 아직 안 쓴다
  const pickedPhotos = useMemo(
    () => [...pickedIds].map((id) => photoById.get(id)).filter((p): p is PhotoResponse => p !== undefined),
    [pickedIds, photoById],
  );
  const selectedCount = pickedIds.size;
  const full = maxSelectable !== null && selectedCount >= maxSelectable;
  const details = useMemo(() => folders?.flatMap((c) => c.details) ?? [], [folders]);
  const sortedIds = useMemo(() => new Set(details.flatMap((d) => d.photoIds)), [details]);
  const unsortedIds = useMemo(
    () => new Set(photos.filter((p) => !sortedIds.has(p.photoId)).map((p) => p.photoId)),
    [photos, sortedIds],
  );
  /** 사진 → "컨셉 / 세부" (호버 캡션) */
  const folderNameOf = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of folders ?? []) for (const d of c.details) for (const id of d.photoIds) map.set(id, `${c.name} / ${d.name}`);
    return (photo: PhotoResponse) => map.get(photo.photoId) ?? (unsortedIds.has(photo.photoId) ? "미분류" : null);
  }, [folders, unsortedIds]);
  const visiblePhotos = useMemo(() => {
    let list = scoredPhotos;
    if (!isAllFilter(filter)) {
      const ids = new Set<number>();
      for (const d of details) if (filter.detailIds.has(d.id)) for (const id of d.photoIds) ids.add(id);
      if (filter.unsorted) for (const id of unsortedIds) ids.add(id);
      list = list.filter((p) => ids.has(p.photoId));
    }
    return sortPhotos(list, sort);
  }, [scoredPhotos, filter, details, unsortedIds, sort]);

  // ── 폴더 필터 ──
  function focusFolder(key: FolderKey) {
    setView("all");
    setFilter(key === "unsorted" ? { detailIds: new Set(), unsorted: true } : { detailIds: new Set([key]), unsorted: false });
  }
  function toggleFolder(key: FolderKey) {
    setView("all");
    setFilter((prev) => {
      if (key === "unsorted") return { detailIds: prev.detailIds, unsorted: !prev.unsorted };
      const next = new Set(prev.detailIds);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { detailIds: next, unsorted: prev.unsorted };
    });
  }

  // ── 상태줄 · 제목 ──
  const status: StatusLine = (() => {
    if (phase === "submitted") return { text: "작가에게 전달했어요 · 작가가 확인 중", tone: "muted" };
    if (phase === "review") return { text: "보정 검토 · 작가가 보정하고 있어요", tone: "accent" };
    if (phase === "album") return { text: "앨범 구성", tone: "accent" };
    if (phase === "done") return { text: "작업이 끝났어요", tone: "muted" };
    if (selection === null) return { text: "불러오는 중…", tone: "muted" };
    const count = maxSelectable !== null ? `${selectedCount} / ${maxSelectable}장` : `${selectedCount}장`;
    return { text: `${count} 선택했어요 · ${ddayLabel(gallery.selectionDeadline)}`, tone: "accent" };
  })();
  const focusedDetail = filter.detailIds.size === 1 && !filter.unsorted ? details.find((d) => d.id === [...filter.detailIds][0]) ?? null : null;
  const focusedConcept = focusedDetail ? folders?.find((c) => c.details.some((d) => d.id === focusedDetail.id)) ?? null : null;
  const title = (() => {
    if (view === "selected")
      return (
        <>
          <span className="flex text-contents-light-bgd-weakness">
            <CheckCircleIcon size={18} />
          </span>
          선택한 사진
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
            {maxSelectable !== null ? `${selectedCount} / ${maxSelectable}장` : `${selectedCount}장`}
          </small>
        </>
      );
    if (focusedDetail && focusedConcept)
      return (
        <>
          <span className="font-normal text-contents-light-bgd-weakness">{focusedConcept.name}</span>
          <span className="flex text-contents-light-bgd-weakness">
            <ChevronRightIcon size={18} />
          </span>
          <span className="truncate">{focusedDetail.name}</span>
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{visiblePhotos.length}장</small>
        </>
      );
    if (!isAllFilter(filter)) {
      const n = filter.detailIds.size + (filter.unsorted ? 1 : 0);
      return (
        <>
          {filter.detailIds.size === 0 ? "미분류" : `폴더 ${n}개`}
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{visiblePhotos.length}장</small>
        </>
      );
    }
    return (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{photos.length}장</small>
      </>
    );
  })();

  const gridPhotos = view === "selected" ? pickedPhotos : visiblePhotos;

  // ── AI 추천: 지금 보는 범위 안의 이번 라운드 추천 ──
  const visibleIds = useMemo(() => new Set(visiblePhotos.map((p) => p.photoId)), [visiblePhotos]);
  const aiInScope = useMemo(() => aiCurrent.filter((r) => visibleIds.has(r.photo.photoId)), [aiCurrent, visibleIds]);
  const aiIds = useMemo(() => new Set(aiInScope.map((r) => r.photo.photoId)), [aiInScope]);
  const aiPhotos = useMemo(
    () => aiInScope.map((r) => photoById.get(r.photo.photoId)).filter((p): p is PhotoResponse => p !== undefined),
    [aiInScope, photoById],
  );
  const aiBusy = ai.phase === "requesting" || ai.phase === "running";
  const showAiGroup = view === "all" && (aiPhotos.length > 0 || aiBusy || ai.error !== null);
  const restPhotos = useMemo(() => (showAiGroup ? gridPhotos.filter((p) => !aiIds.has(p.photoId)) : gridPhotos), [showAiGroup, gridPhotos, aiIds]);
  const aiReasonOf = (photo: PhotoResponse) => {
    const r = aiByPhotoId.get(photo.photoId);
    return r ? (r.reasonReady && r.reason ? r.reason : "이유 준비 중…") : null;
  };
  const scopeLabel = focusedDetail ? focusedDetail.name : isAllFilter(filter) ? "모든 사진" : "보는 폴더";
  const aiUnpicked = aiPhotos.filter((p) => !pickedIds.has(p.photoId));
  /** 별점 순이면 점수별 그룹(5 → 1 → 없음) */
  const scoreGroups = useMemo(() => {
    if (sort !== "score" || view !== "all") return null;
    const groups: { score: number | null; photos: PhotoResponse[] }[] = [];
    for (const sc of [5, 4, 3, 2, 1]) {
      const ps = restPhotos.filter((p) => p.score === sc);
      if (ps.length > 0) groups.push({ score: sc, photos: ps });
    }
    const none = restPhotos.filter((p) => !p.score);
    if (none.length > 0) groups.push({ score: null, photos: none });
    return groups;
  }, [sort, view, restPhotos]);

  // ── 전달하기 ──
  const ratedCount = scoredPhotos.filter((p) => p.score !== null).length;
  const requests = useMemo(() => toRequestItems(drafts, pickedIds), [drafts, pickedIds]);
  const unpickedDraftCount = draftCount.photos - requests.length;
  const canSubmit = editable && selectedCount > 0 && (maxSelectable === null || selectedCount === maxSelectable);
  const submitHint =
    editable && maxSelectable !== null && selectedCount !== maxSelectable
      ? selectedCount < maxSelectable
        ? `${maxSelectable}장을 채우면 전달할 수 있어요 (지금 ${selectedCount}장)`
        : `${maxSelectable}장까지만 전달할 수 있어요 (지금 ${selectedCount}장)`
      : null;
  const [downloading, setDownloading] = useState(false);
  async function downloadCsv() {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadSelectionCsv(galleryId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${gallery.title} 선택 목록.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setLocalNotice(err instanceof ApiError ? err.message : "내려받지 못했어요 · 다시 시도해 주세요");
    } finally {
      setDownloading(false);
    }
  }

  // ── 싱글뷰 ──
  const currentIndex = currentId === null ? -1 : gridPhotos.findIndex((p) => p.photoId === currentId);
  const currentPhoto = currentIndex >= 0 ? gridPhotos[currentIndex] : null;
  function openPhoto(photoId: number) {
    setCurrentId(photoId);
    setScrollToId(null);
    setLightboxOpen(true);
    countView(galleryId, photoId);
  }
  function closeLightbox() {
    setLightboxOpen(false);
    setTab("none");
    setScrollToId(currentId);
  }
  function step(delta: number) {
    if (gridPhotos.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : 0;
    const next = gridPhotos[(base + delta + gridPhotos.length) % gridPhotos.length];
    setCurrentId(next.photoId);
    countView(galleryId, next.photoId);
  }
  async function rate(photoId: number, score: number | null) {
    if (!editable) return;
    const before = photoById.get(photoId)?.score ?? null;
    setScoreOverrides((prev) => new Map(prev).set(photoId, score));
    try {
      if (score === null) await clearPhotoRating(galleryId, photoId);
      else await ratePhoto(galleryId, photoId, score);
    } catch (err) {
      setScoreOverrides((prev) => new Map(prev).set(photoId, before));
      setLocalNotice(err instanceof ApiError ? err.message : "별점을 저장하지 못했어요 · 다시 시도해 주세요");
    }
  }
  function addPoint(photoId: number, x: number, y: number) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, {
      ...d,
      points: [...d.points, { id: newPointId(), x, y, text: "", refinedText: null, useRefinedText: false }],
    });
  }
  function removePoint(photoId: number, id: string) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, { ...d, points: d.points.filter((pt) => pt.id !== id) });
  }
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const shownNotice = notice ?? localNotice;
  function clearNotices() {
    clearNotice();
    setLocalNotice(null);
  }

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
            photoCount={photosLoaded ? photos.length : null}
            selectedCount={selectedCount}
            maxSelectable={maxSelectable}
            view={view}
            onViewChange={(next) => {
              setView(next);
              if (next !== "all") setFilter(ALL_FILTER);
            }}
            tabs={{
              tab: sideTab,
              onTabChange: setSideTab,
              folder:
                folders && folders.length > 0 ? (
                  <ClientFolderTree
                    folders={folders}
                    pickedIds={pickedIds}
                    unsortedIds={unsortedIds}
                    filter={view === "all" ? filter : ALL_FILTER}
                    onFocus={focusFolder}
                    onToggle={toggleFolder}
                  />
                ) : (
                  <p className="px-2 type-content-xs text-contents-light-bgd-weakness">폴더가 없어요 — 모든 사진에서 고르면 돼요.</p>
                ),
              share: (
                <div className="flex flex-col gap-2 rounded-(--radius-12) border border-dashed border-border-default p-3 type-content-xs text-contents-light-bgd-weakness">
                  <p className="type-label-semibold-s text-contents-light-bgd-default">게스트와 함께 보기</p>
                  <p className="leading-relaxed">고른 사진을 공유폴더로 묶어 링크로 보내고, 좋아요 · 댓글로 반응을 받는 기능이 곧 열려요.</p>
                </div>
              ),
            }}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {!photosLoaded ? (
            <div className="flex-1" aria-busy="true" />
          ) : photos.length === 0 ? (
            <div className="grid flex-1 place-items-center px-6 py-8">
              <p className="type-content-s text-contents-light-bgd-sub">아직 올라온 사진이 없어요</p>
            </div>
          ) : (
            <>
              <ShellMainHeader
                title={title}
                leading={
                  view === "all" ? (
                    <button
                      type="button"
                      data-coach="ai"
                      aria-pressed={aiPhotos.length > 0}
                      disabled={!editable || aiBusy}
                      onClick={() => void ai.request(focusedDetail?.id ?? null)}
                      title={focusedDetail ? `${focusedDetail.name}에서 약 10%를 이유와 함께 골라 드려요` : "폴더마다 몇 장씩 이유와 함께 골라 드려요"}
                      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-(--radius-8) border px-3 type-content-s transition-colors duration-fast disabled:cursor-default disabled:opacity-60 ${
                        aiPhotos.length > 0
                          ? "border-brand-secondary-default bg-brand-secondary-background text-contents-light-bgd-default"
                          : "border-border-default text-contents-light-bgd-default hover:bg-surface-default-lightness"
                      }`}
                    >
                      <span className="text-brand-secondary-default">
                        <SparkleIcon size={18} />
                      </span>
                      AI 추천{aiPhotos.length > 0 ? ` ${aiPhotos.length}` : ""}
                    </button>
                  ) : undefined
                }
                zoom={zoom}
                onZoomChange={writeZoom}
                sort={sort}
                onSortChange={setSort}
                filter="none"
                onFilterChange={() => {}}
                showFilters={false}
                coachKey="single"
                sortable={view === "all"}
                onSingleView={() => {
                  if (gridPhotos.length > 0) openPhoto(currentPhoto ? currentPhoto.photoId : gridPhotos[0].photoId);
                }}
              />
              <div data-coach="pick" className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {phase === "submitted" && (
                  <div className="mx-5 mt-1 mb-3 flex items-center gap-2.5 rounded-(--radius-8) bg-brand-secondary-background px-3 py-2.5 type-content-s text-contents-light-bgd-default">
                    <span className="text-brand-secondary-default">
                      <CheckCircleIcon size={18} />
                    </span>
                    작가에게 전달했어요. 작가가 확인하면 보정이 시작돼요 — 다시 고치려면 작가에게 요청해 주세요.
                  </div>
                )}
                {showAiGroup && (
                  <div className="px-5 pt-1 pb-3">
                    <div className="mb-2 flex items-center gap-2.5 rounded-(--radius-8) bg-brand-secondary-background px-3 py-2 type-content-s text-contents-light-bgd-default">
                      {aiBusy ? (
                        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-border-default border-t-brand-secondary-default" />
                      ) : (
                        <span className="text-brand-secondary-default">
                          <SparkleIcon size={18} />
                        </span>
                      )}
                      {aiBusy ? (
                        <>
                          <b className="font-semibold">{scopeLabel}에서 고르는 중…</b>
                          <span className="type-content-xs text-contents-light-bgd-weakness">보통 10초 안에 끝나요</span>
                        </>
                      ) : ai.error && aiPhotos.length === 0 ? (
                        <span className="text-function-error-default">{ai.error}</span>
                      ) : (
                        <>
                          <b className="font-semibold">AI 추천 {aiPhotos.length}장</b>
                          <span className="type-content-xs text-contents-light-bgd-weakness">{scopeLabel} 중 · 이유는 사진에 마우스를 올리면 보여요</span>
                        </>
                      )}
                      <span className="flex-1" />
                      {!aiBusy && editable && (
                        <>
                          <button
                            type="button"
                            onClick={() => void ai.request(focusedDetail?.id ?? null)}
                            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--pill) border border-border-default px-2.5 type-label-medium-xs text-contents-light-bgd-default transition-colors duration-fast hover:bg-background-default-main"
                          >
                            <RefreshIcon size={14} />
                            다시 추천
                          </button>
                          {aiUnpicked.length > 0 && (
                            <button
                              type="button"
                              onClick={() => pickMany(aiUnpicked.map((p) => p.photoId))}
                              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--pill) bg-contents-light-bgd-default px-2.5 type-label-medium-xs text-contents-dark-bgd-default transition-opacity duration-fast hover:opacity-90"
                            >
                              <PlaylistAddCheckIcon size={14} />
                              모두 선택{aiUnpicked.length < aiPhotos.length ? ` (${aiUnpicked.length})` : ""}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {aiPhotos.length > 0 && (
                      <PhotoGrid
                        photos={aiPhotos}
                        zoom={Math.min(100, zoom + 15)}
                        selectedIds={pickedIds}
                        onToggle={toggle}
                        selectable={editable}
                        markStyle="check"
                        currentId={currentId}
                        showScore
                        onOpen={openPhoto}
                        captionOf={aiReasonOf}
                        aiIds={aiIds}
                      />
                    )}
                    {aiPhotos.length > 0 && restPhotos.length > 0 && (
                      <p className="flex items-center gap-2 px-0 pt-1 type-content-xs text-contents-light-bgd-weakness after:h-px after:flex-1 after:bg-divider-default after:content-['']">
                        나머지 {restPhotos.length}장
                      </p>
                    )}
                  </div>
                )}
                {gridPhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
                    {view === "selected" ? "아직 고른 사진이 없어요" : "조건에 맞는 사진이 없어요"}
                  </p>
                ) : restPhotos.length === 0 ? null : scoreGroups ? (
                  scoreGroups.map((g) => (
                    <div key={g.score ?? "none"} className="pt-1">
                      <p className="flex items-center gap-0.5 px-5 pb-2 type-content-xs text-contents-light-bgd-weakness">
                        {g.score !== null ? (
                          <span className="flex text-brand-secondary-default" aria-label={`별점 ${g.score}`}>
                            {[1, 2, 3, 4, 5].map((n) => (n <= g.score! ? <StarFillIcon key={n} size={14} /> : <StarIcon key={n} size={14} className="text-border-default" />))}
                          </span>
                        ) : (
                          <span className="type-label-semibold-xs text-contents-light-bgd-sub">별점 없음</span>
                        )}
                        <span className="ml-2">{g.photos.length}장</span>
                      </p>
                      <PhotoGrid
                        photos={g.photos}
                        zoom={zoom}
                        selectedIds={pickedIds}
                        onToggle={toggle}
                        selectable={editable}
                        markStyle="check"
                        currentId={currentId}
                        showScore={false}
                        onOpen={openPhoto}
                        captionOf={folderNameOf}
                        scrollToId={scrollToId}
                      />
                    </div>
                  ))
                ) : (
                  <PhotoGrid
                    photos={restPhotos}
                    zoom={zoom}
                    selectedIds={pickedIds}
                    onToggle={toggle}
                    selectable={editable}
                    markStyle="check"
                    currentId={currentId}
                    showScore
                    onOpen={openPhoto}
                    captionOf={folderNameOf}
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
          shownNotice ? (
            <button type="button" onClick={clearNotices} className="cursor-pointer text-left text-function-warning-default">
              {shownNotice}
            </button>
          ) : phase === "select" ? (
            selectedCount === 0
              ? "사진을 누르면 선택돼요 · 돋보기나 더블클릭으로 한 장씩 보며 별점과 보정 요청"
              : `마감 ${ddayLabel(gallery.selectionDeadline)}${draftCount.photos > 0 ? ` · 보정 요청 ${draftCount.photos}장 · 점 ${draftCount.points}개` : ""}${submitHint ? ` · ${submitHint}` : ""}`
          ) : phase === "submitted" ? (
            "작가가 확인하고 보정을 시작해요 · 선택 목록은 CSV로 내려받을 수 있어요"
          ) : (
            status.text
          )
        }
        status={
          <span className="flex items-center gap-2 type-content-s text-contents-light-bgd-sub">
            선택한 사진
            <b className={`type-label-semibold-l tabular-nums ${full ? "text-function-warning-default" : "text-contents-light-bgd-default"}`}>
              {selectedCount}
            </b>
            {maxSelectable !== null && <span className="text-contents-light-bgd-weakness">/ {maxSelectable}</span>}
            {pickedPhotos.length > 0 && (
              <span className="ml-1 flex" aria-hidden>
                {pickedPhotos.slice(-3).map((p) => (
                  <span key={p.photoId} className="-ml-2 size-6.5 overflow-hidden rounded-(--radius-4) border-2 border-background-default-main bg-surface-default-light first:ml-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.viewUrl && <img src={p.viewUrl} alt="" className="size-full object-cover" />}
                  </span>
                ))}
              </span>
            )}
          </span>
        }
        actions={
          phase === "select" ? (
            <>
              {increasePending ? (
                <span className="inline-flex h-10 items-center gap-1.5 rounded-(--radius-8) border border-border-default px-3 type-label-medium-s text-contents-light-bgd-sub">
                  <AddPhotoIcon size={16} />
                  {increasePending.requestedCount}장 요청함 · 작가 확인 중
                </span>
              ) : (
                <ShellCta kind="outline" onClick={() => setIncreaseOpen(true)}>
                  <AddPhotoIcon size={18} />
                  선택 장수 추가 요청
                </ShellCta>
              )}
              <span data-coach="submit" className="inline-flex" title={submitHint ?? undefined}>
                <ShellCta disabled={!canSubmit} onClick={() => setSubmitOpen(true)}>
                  작가에게 전달하기
                </ShellCta>
              </span>
            </>
          ) : phase === "submitted" || phase === "review" || phase === "album" || phase === "done" ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-(--pill) bg-brand-secondary-background px-3 py-1.5 type-label-semibold-s text-brand-secondary-dark">
                <CheckCircleIcon size={16} />
                전달 완료 · {selectedCount}장
              </span>
              <ShellCta kind="outline" disabled={downloading} onClick={() => void downloadCsv()}>
                <DownloadIcon size={18} />
                {downloading ? "내려받는 중…" : "선택 목록 내려받기 (CSV)"}
              </ShellCta>
            </>
          ) : null
        }
      />

      <ClientSelectCoachMarks ready={editable && photosLoaded && photos.length > 0 && selection !== null && !lightboxOpen} />

      {increaseOpen && (
        <IncreaseRequestModal
          galleryId={galleryId}
          currentMax={maxSelectable}
          selectedCount={selectedCount}
          onClose={() => setIncreaseOpen(false)}
          onRequested={(count) => {
            setIncreaseOpen(false);
            setLocalNotice(`${count}장으로 늘려 달라고 요청했어요 · 작가가 정하면 알림이 와요`);
          }}
        />
      )}
      {submitOpen && (
        <SubmitSelectionModal
          galleryId={galleryId}
          selectedCount={selectedCount}
          maxSelectable={maxSelectable}
          requests={requests}
          unpickedDraftCount={unpickedDraftCount}
          ratedCount={ratedCount}
          onClose={() => setSubmitOpen(false)}
          onSubmitted={() => {
            setSubmitOpen(false);
            // 전달된 초안은 서버가 가졌으니 지운다(안 고른 사진의 초안은 남긴다)
            for (const id of pickedIds) writeDraft(galleryId, id, null);
            setLocalNotice("작가에게 전달했어요");
            void refreshSelection();
            reloadGallery();
          }}
        />
      )}

      {lightboxOpen && currentPhoto && (
        <Lightbox
          photo={currentPhoto}
          index={currentIndex}
          total={gridPhotos.length}
          caption={folderNameOf(currentPhoto)}
          picked={pickedIds.has(currentPhoto.photoId)}
          editable={editable}
          score={currentPhoto.score}
          tab={tab}
          onTabChange={setTab}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onTogglePick={() => toggle(currentPhoto.photoId)}
          onRate={(score) => void rate(currentPhoto.photoId, score)}
          overlay={
            tab === "memo" ? (
              <RetouchPins
                points={draftOf(drafts, currentPhoto.photoId).points}
                onRemove={editable ? (id) => removePoint(currentPhoto.photoId, id) : undefined}
              />
            ) : undefined
          }
          onPhotoClick={tab === "memo" && editable ? (x, y) => addPoint(currentPhoto.photoId, x, y) : undefined}
          panel={
            tab === "info" ? (
              <PhotoInfoPanel
                galleryId={galleryId}
                photo={currentPhoto}
                folderName={folderNameOf(currentPhoto)}
                score={currentPhoto.score}
                editable={editable}
                onRate={(score) => void rate(currentPhoto.photoId, score)}
              />
            ) : tab === "ai" ? (
              <AiPanel
                rec={aiByPhotoId.get(currentPhoto.photoId) ?? null}
                folderRecs={aiCurrent.filter((r) => r.folderId !== null && r.folderId === (aiByPhotoId.get(currentPhoto.photoId)?.folderId ?? details.find((d) => d.photoIds.includes(currentPhoto.photoId))?.id ?? null))}
                folderName={folderNameOf(currentPhoto)}
                pickedIds={pickedIds}
                editable={editable}
                busy={aiBusy}
                error={ai.error}
                onPick={toggle}
                onRequest={() => void ai.request(details.find((d) => d.photoIds.includes(currentPhoto.photoId))?.id ?? null)}
                onOpen={(id) => setCurrentId(id)}
              />
            ) : (
              <RetouchPanel galleryId={galleryId} photoId={currentPhoto.photoId} picked={pickedIds.has(currentPhoto.photoId)} editable={editable} />
            )
          }
        />
      )}
    </>
  );
}

function AiPanel({
  rec,
  folderRecs,
  folderName,
  pickedIds,
  editable,
  busy,
  error,
  onPick,
  onRequest,
  onOpen,
}: {
  rec: import("@/lib/api/recommendations").AiRecommendation | null;
  folderRecs: import("@/lib/api/recommendations").AiRecommendation[];
  folderName: string | null;
  pickedIds: ReadonlySet<number>;
  editable: boolean;
  busy: boolean;
  error: string | null;
  onPick: (photoId: number) => void;
  onRequest: () => void;
  onOpen: (photoId: number) => void;
}) {
  return (
    <>
      {rec ? (
        <div className="flex flex-col gap-1 rounded-(--radius-8) bg-brand-secondary-background px-3 py-2.5">
          <span className="inline-flex items-center gap-1 type-label-semibold-s text-brand-secondary-dark">
            <SparkleIcon size={14} />
            AI 추천 {rec.rank}위{folderName ? ` · ${folderName.split(" / ").at(-1)}` : ""}
          </span>
          <p className="type-content-s leading-relaxed text-contents-light-bgd-default">{rec.reasonReady && rec.reason ? rec.reason : "이유를 만드는 중이에요…"}</p>
        </div>
      ) : (
        <p className="type-content-s leading-relaxed text-contents-light-bgd-sub">
          {busy ? "AI가 고르는 중이에요…" : folderRecs.length > 0 ? "이 사진은 이번 추천에 들지 않았어요." : "아직 이 폴더에서 추천을 받지 않았어요."}
        </p>
      )}
      {folderRecs.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h4 className="type-label-semibold-xs text-contents-light-bgd-weakness">이 폴더의 추천 {folderRecs.length}장</h4>
          <ul className="flex flex-col divide-y divide-divider-default">
            {folderRecs.map((r) => {
              const picked = pickedIds.has(r.photo.photoId);
              return (
                <li key={r.photo.photoId} className="flex items-center gap-2.5 py-2">
                  <button type="button" onClick={() => onOpen(r.photo.photoId)} aria-label={`${r.photo.originalFileName} 보기`} className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-(--radius-8) bg-surface-default-light">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.photo.viewUrl && <img src={r.photo.viewUrl} alt="" className="size-full object-cover" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="type-label-semibold-xs text-contents-light-bgd-default">
                      {r.rank}위{rec && rec.photo.photoId === r.photo.photoId ? " · 이 사진" : ""}
                    </p>
                    <p className="truncate type-content-xs text-contents-light-bgd-sub">{r.reasonReady && r.reason ? r.reason : "이유 준비 중…"}</p>
                  </div>
                  {picked ? (
                    <span className="text-brand-secondary-default" aria-label="선택됨">
                      <CheckCircleIcon size={18} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => onPick(r.photo.photoId)}
                      className="h-7 cursor-pointer rounded-(--pill) border border-border-default px-2.5 type-label-medium-xs text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:opacity-50"
                    >
                      선택
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {error && <p className="type-content-xs text-function-error-default">{error}</p>}
      <button
        type="button"
        disabled={!editable || busy}
        onClick={onRequest}
        className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-(--radius-8) border border-border-default type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:opacity-50"
      >
        {folderRecs.length > 0 ? <RefreshIcon size={16} /> : <SparkleIcon size={16} />}
        {folderRecs.length > 0 ? "이 폴더에서 다시 추천" : "이 폴더에서 추천 받기"}
      </button>
      <p className="type-content-xs text-contents-light-bgd-weakness">추천은 폴더 단위예요. 최종 선택은 직접 고른 사진만 인정돼요.</p>
    </>
  );
}
