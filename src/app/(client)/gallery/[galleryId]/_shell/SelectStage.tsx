"use client";

/**
 * 클라이언트 2단계 — 셀렉 & 보정 요청 화면 (WES-312, 2026-09-12 보드 확정)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/SelectStage.tsx
 *
 * 폴더 확정 뒤에는 폴더 열이 사라지고 2열이다: 사이드바(기본 열림 — 폴더 | 공유 탭, 체크박스 트리) + 그리드.
 * 그리드에 레일 · 우측 패널은 없고 정보 · AI · 보정 요청은 싱글뷰에서 한다.
 * 선택 앨범(photo-selection)은 서버가 정본 — 신랑 · 신부가 같이 고르므로 화면이 보일 때 주기적으로 다시 읽는다.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircleIcon, ChevronRightIcon, PhotoIcon } from "@/components/icons";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellBottomBar } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader, type SortKey } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryResponse } from "@/lib/api/galleries";
import type { PhotoResponse } from "@/lib/api/photos";
import { getPhotoSelection, type PhotoSelectionResponse } from "@/lib/api/selection";
import { ALL_FILTER, ClientFolderTree, type FolderKey, isAllFilter, type PhotoFilter } from "./ClientFolderTree";
import { ClientSidebar, type ClientView, type StatusLine } from "./ClientSidebar";
import { type ClientPhase, clientStageIndexOf, clientStagesOf } from "./clientStages";

/** 선택 앨범 다시 읽는 간격 — 함께 고르는 사람의 변경을 따라간다(화면이 보일 때만) */
const SELECTION_POLL_MS = 15_000;

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
  const [selection, setSelection] = useState<PhotoSelectionResponse | null>(null);
  const [view, setView] = useState<ClientView>("all");
  const [tab, setTab] = useState<"folder" | "share">("folder");
  const [filter, setFilter] = useState<PhotoFilter>(ALL_FILTER);
  const [sort, setSort] = useState<SortKey>("uploaded");
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));

  // ── 선택 앨범: 처음 · 주기 · 탭이 다시 보일 때 ──
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function load() {
      try {
        const next = await getPhotoSelection(galleryId);
        if (!cancelled) setSelection(next);
      } catch {
        // 다음 주기에 다시
      }
    }
    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await load();
        if (!cancelled) schedule();
      }, SELECTION_POLL_MS);
    }
    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    void load();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [galleryId]);

  // ── 파생값 ──
  const pickedIds = useMemo(() => new Set(selection?.photos.map((s) => s.photo.photoId) ?? []), [selection]);
  const pickedPhotos = useMemo(() => selection?.photos.map((s) => s.photo) ?? [], [selection]);
  const selectedCount = selection?.selectedCount ?? pickedIds.size;
  const maxSelectable = gallery.maxSelectablePhotoCount;
  const details = useMemo(() => folders?.flatMap((c) => c.details) ?? [], [folders]);
  const sortedIds = useMemo(() => new Set(details.flatMap((d) => d.photoIds)), [details]);
  const unsortedIds = useMemo(
    () => new Set(photos.filter((p) => !sortedIds.has(p.photoId)).map((p) => p.photoId)),
    [photos, sortedIds],
  );
  const visiblePhotos = useMemo(() => {
    let list = photos;
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
  }, [photos, filter, details, unsortedIds, sort]);

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
              tab,
              onTabChange: setTab,
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
                onSingleView={() => {}}
              />
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {gridPhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
                    {view === "selected" ? "아직 고른 사진이 없어요" : "조건에 맞는 사진이 없어요"}
                  </p>
                ) : (
                  <PhotoGrid photos={gridPhotos} zoom={zoom} selectedIds={new Set()} onToggle={() => {}} markedIds={pickedIds} selectable={false} />
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
          phase === "select"
            ? "사진을 누르면 선택돼요 · 돋보기로 한 장씩 보며 별점과 보정 요청"
            : status.text
        }
        status={
          <span className="flex items-center gap-2 type-content-s text-contents-light-bgd-sub">
            선택한 사진
            <b className="type-label-semibold-l text-contents-light-bgd-default tabular-nums">{selectedCount}</b>
            {maxSelectable !== null && <span className="text-contents-light-bgd-weakness">/ {maxSelectable}</span>}
          </span>
        }
        actions={null}
      />
    </>
  );
}
