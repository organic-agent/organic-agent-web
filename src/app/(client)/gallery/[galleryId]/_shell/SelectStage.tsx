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
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircleIcon, ChevronRightIcon, PhotoIcon } from "@/components/icons";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellBottomBar } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader, type SortKey } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryResponse } from "@/lib/api/galleries";
import { ApiError } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";
import { clearPhotoRating, ratePhoto } from "@/lib/api/ratings";
import { ALL_FILTER, ClientFolderTree, type FolderKey, isAllFilter, type PhotoFilter } from "./ClientFolderTree";
import { ClientSidebar, type ClientView, type StatusLine } from "./ClientSidebar";
import { countView } from "./clientMemory";
import { type ClientPhase, clientStageIndexOf, clientStagesOf } from "./clientStages";
import { Lightbox, type LightboxTab } from "./Lightbox";
import { PhotoInfoPanel } from "./PhotoInfoPanel";
import { countDrafts, draftOf, newPointId, retouchDraftStore, writeDraft } from "./retouchDraft";
import { RetouchPanel, RetouchPins } from "./RetouchPanel";
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
}) {
  const editable = phase === "select";
  const maxSelectable = gallery.maxSelectablePhotoCount;
  const { selection, pickedIds, toggle, notice, clearNotice } = useSelectionSync(galleryId, editable, maxSelectable);
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
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName, "ko"));
    else sorted.sort((a, b) => a.displayOrder - b.displayOrder || a.photoId - b.photoId);
    return sorted;
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
                zoom={zoom}
                onZoomChange={writeZoom}
                sort={sort}
                onSortChange={setSort}
                filter="none"
                onFilterChange={() => {}}
                showFilters={false}
                sortable={view === "all"}
                onSingleView={() => {
                  if (gridPhotos.length > 0) openPhoto(currentPhoto ? currentPhoto.photoId : gridPhotos[0].photoId);
                }}
              />
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {gridPhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
                    {view === "selected" ? "아직 고른 사진이 없어요" : "조건에 맞는 사진이 없어요"}
                  </p>
                ) : (
                  <PhotoGrid
                    photos={gridPhotos}
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
              : `마감 ${ddayLabel(gallery.selectionDeadline)}${draftCount.photos > 0 ? ` · 보정 요청 ${draftCount.photos}장 · 점 ${draftCount.points}개` : ""}`
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
        actions={null}
      />

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
              <p className="type-content-s text-contents-light-bgd-sub">AI 추천은 다음 단계에서 열려요.</p>
            ) : (
              <RetouchPanel galleryId={galleryId} photoId={currentPhoto.photoId} picked={pickedIds.has(currentPhoto.photoId)} editable={editable} />
            )
          }
        />
      )}
    </>
  );
}
