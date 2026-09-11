"use client";

/**
 * 작가 — 갤러리 셸 v2 (구조 확정 2026-09-11 · 1단계 사진 업로드 화면부터)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/page.tsx
 *
 * 상단 한 줄 · 사이드바(접힘 가능) · 폴더 열(1단계만) · 메인(헤더 + 그리드) · 하단 바(주 버튼).
 * B1 = 화면 구성: 갤러리 · 사진 · 폴더는 읽기만, 단계 전환(갤러리 열기)까지 한다.
 * 업로드 · AI 분석 · 폴더 편집 · 사진 삭제는 B2 — 버튼은 자리만 두고 "준비 중"으로 답한다.
 * 사진 휴지통 화면은 두지 않는다(2026-09-11).
 * 옛 셸(v1)의 부품(_components · _lib)은 클라이언트 페이지가 아직 쓰므로 C3까지 남긴다.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { useSidebar } from "@/components/SidebarProvider";
import { ChevronRightIcon, PhotoIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { listConceptFolders, type ConceptFolderResponse } from "@/lib/api/conceptFolders";
import { getGallery, type GalleryResponse } from "@/lib/api/galleries";
import { listPhotos, type PhotoResponse } from "@/lib/api/photos";
import { fetchStudio, type StudioResponse } from "@/lib/api/studios";
import { EmptyUploadGuide } from "./_shell/EmptyUploadGuide";
import { FolderColumn, ReviewBadge, type FolderSelection } from "./_shell/FolderColumn";
import { OpenGalleryModal } from "./_shell/OpenGalleryModal";
import { PhotoGrid } from "./_shell/PhotoGrid";
import { ShellBottomBar, ShellCta } from "./_shell/ShellBottomBar";
import { ShellMainHeader, type FilterKey, type SortKey } from "./_shell/ShellMainHeader";
import { ShellSidebar, type ShellView, type StatusLine } from "./_shell/ShellSidebar";
import { ShellTopbar } from "./_shell/ShellTopbar";
import { stageIndexOf, stageLabelOf } from "./_shell/stages";

/** 사진 목록은 200장씩 — 전부 받아 한 화면에서 거른다 (수천 장까지) */
async function listAllPhotos(galleryId: number): Promise<PhotoResponse[]> {
  const all: PhotoResponse[] = [];
  for (let page = 0; page < 50; page++) {
    const res = await listPhotos(galleryId, page, 200);
    all.push(...res.contents);
    if (!res.hasNext) break;
  }
  return all;
}

export default function StudioGalleryShellPage() {
  const params = useParams<{ galleryId: string }>();
  const galleryId = Number(params.galleryId);
  const { collapsed } = useSidebar();
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  const [gallery, setGallery] = useState<GalleryResponse | null>(null);
  const [studio, setStudio] = useState<StudioResponse | null>(null);
  const [photos, setPhotos] = useState<PhotoResponse[] | null>(null);
  const [folders, setFolders] = useState<ConceptFolderResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<ShellView>("all");
  const [folderSel, setFolderSel] = useState<FolderSelection>({ kind: "all" });
  const [zoom, setZoom] = useState(40);
  const [sort, setSort] = useState<SortKey>("uploaded");
  const [filter, setFilter] = useState<FilterKey>("none");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [openConfirm, setOpenConfirm] = useState(false);

  // 갤러리 → 스튜디오(이름 · 내 역할) 순으로, 사진 · 폴더는 나란히
  useEffect(() => {
    if (!Number.isFinite(galleryId)) return;
    let cancelled = false;
    (async () => {
      try {
        const g = await getGallery(galleryId);
        if (cancelled) return;
        setGallery(g);
        const [s, p, f] = await Promise.allSettled([
          fetchStudio(g.workspaceId),
          listAllPhotos(galleryId),
          listConceptFolders(galleryId),
        ]);
        if (cancelled) return;
        if (s.status === "fulfilled") setStudio(s.value);
        setPhotos(p.status === "fulfilled" ? p.value : []);
        setFolders(f.status === "fulfilled" ? f.value : []);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError && (err.status === 403 || err.status === 404)
            ? "이 갤러리를 볼 수 없어요. 내 스튜디오의 갤러리가 아니거나 삭제됐어요."
            : "갤러리를 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId]);

  // ── 파생값 ──
  const stageIndex = gallery ? stageIndexOf(gallery) : 0;
  const details = useMemo(() => folders?.flatMap((c) => c.details) ?? [], [folders]);
  const sortedIds = useMemo(() => new Set(details.flatMap((d) => d.photoIds)), [details]);
  const reviewIds = useMemo(
    () => new Set(details.filter((d) => d.needsReview).flatMap((d) => d.photoIds)),
    [details],
  );
  const reviewFolderCount = details.filter((d) => d.needsReview).length;
  const allPhotos = useMemo(() => photos ?? [], [photos]);
  const unsortedCount = folders && folders.length > 0 ? allPhotos.filter((p) => !sortedIds.has(p.photoId)).length : 0;

  const visiblePhotos = useMemo(() => {
    let list = allPhotos;
    if (folderSel.kind === "detail") {
      const ids = new Set(details.find((d) => d.id === folderSel.detailId)?.photoIds ?? []);
      list = list.filter((p) => ids.has(p.photoId));
    } else if (folderSel.kind === "unsorted") {
      list = list.filter((p) => !sortedIds.has(p.photoId));
    }
    if (filter === "review") list = list.filter((p) => reviewIds.has(p.photoId));
    if (filter === "unsorted") list = list.filter((p) => !sortedIds.has(p.photoId));
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName, "ko"));
    else sorted.sort((a, b) => a.displayOrder - b.displayOrder || a.photoId - b.photoId);
    return sorted;
  }, [allPhotos, folderSel, details, sortedIds, filter, reviewIds, sort]);

  const selectedDetail =
    folderSel.kind === "detail" ? details.find((d) => d.id === folderSel.detailId) ?? null : null;
  const selectedConcept =
    folderSel.kind === "detail" ? folders?.find((c) => c.id === folderSel.conceptId) ?? null : null;

  // 사이드바 상태줄 — 단계 안의 하위 상태
  const status: StatusLine = (() => {
    if (photos === null) return { text: "불러오는 중…", tone: "muted" };
    if (stageIndex === 0) {
      if (allPhotos.length === 0) return { text: "사진 없음", tone: "muted" };
      if (!folders || folders.length === 0) return { text: `${allPhotos.length}장 · 폴더 만들기 전`, tone: "muted" };
      return reviewFolderCount > 0
        ? { text: `검토 중 · 폴더 ${details.length} · 확인 필요 ${reviewFolderCount}`, tone: "warning" }
        : { text: `검토 중 · 폴더 ${details.length}`, tone: "accent" };
    }
    const limit = gallery?.maxSelectablePhotoCount;
    return { text: `${allPhotos.length}장${limit !== null && limit !== undefined ? ` · 고를 장수 ${limit}` : ""}`, tone: "accent" };
  })();

  function toggleSelect(photoId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function changeView(next: ShellView) {
    setView(next);
    setSelected(new Set());
  }

  function changeFolder(next: FolderSelection) {
    setFolderSel(next);
    setSelected(new Set());
  }

  // ── 오류 · 로딩 ──
  if (loadError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background-default-main px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="type-title-m text-contents-light-bgd-default">갤러리를 열 수 없어요</h1>
          <p className="type-content-m text-contents-light-bgd-sub">{loadError}</p>
          <Button href="/studio">내 스튜디오로</Button>
        </div>
      </div>
    );
  }

  const isOwner = studio?.role === "OWNER";
  const canOpen = gallery?.status === "DRAFT" && allPhotos.length > 0;
  const showFolderColumn = stageIndex === 0 && allPhotos.length > 0 && view === "all";

  const mainTitle =
    selectedDetail && selectedConcept ? (
      <>
        <span className="font-normal text-contents-light-bgd-weakness">{selectedConcept.name}</span>
        <span className="flex text-contents-light-bgd-weakness">
          <ChevronRightIcon size={18} />
        </span>
        <span className="truncate">{selectedDetail.name}</span>
        {selectedDetail.needsReview && <ReviewBadge />}
      </>
    ) : folderSel.kind === "unsorted" ? (
      <>미분류</>
    ) : (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
      </>
    );

  const bottomHint =
    stageIndex !== 0
      ? "이 단계 화면은 준비 중이에요"
      : allPhotos.length === 0
        ? "원본은 그대로 보관되고 화면에는 줄인 미리보기를 써요"
        : folders && folders.length > 0
          ? reviewFolderCount > 0
            ? `폴더와 사진을 확인하고 갤러리를 열어 주세요 · "검토"는 AI가 확신이 낮은 폴더예요 · 확인 필요 ${reviewFolderCount}`
            : "폴더와 사진을 확인하고 갤러리를 열어 주세요"
          : "폴더는 업로드가 끝나면 AI가 만들어요";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <ShellTopbar
        studioName={studio?.name ?? "스튜디오"}
        studioHref={studio ? `/studio/${studio.galleryUrl}` : "/studio"}
        workspaceId={gallery?.workspaceId ?? null}
        stageLabel={gallery ? stageLabelOf(gallery) : "…"}
        deadline={gallery?.selectionDeadline ?? null}
        onInviteClick={isOwner ? showComingSoon : undefined}
      />

      <div className="flex min-h-0 flex-1">
        {!collapsed && (
          <ShellSidebar
            title={gallery?.title ?? "…"}
            status={status}
            stageIndex={stageIndex}
            photoCount={allPhotos.length}
            selectedLocked={stageIndex === 0}
            view={view}
            onViewChange={changeView}
          />
        )}

        {showFolderColumn && (
          <FolderColumn
            folders={folders}
            totalPhotos={allPhotos.length}
            unsortedCount={unsortedCount}
            selection={folderSel}
            onSelect={changeFolder}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {photos === null ? (
            <div className="flex-1" aria-busy="true" />
          ) : allPhotos.length === 0 ? (
            <EmptyUploadGuide />
          ) : (
            <>
              <ShellMainHeader
                title={mainTitle}
                zoom={zoom}
                onZoomChange={setZoom}
                sort={sort}
                onSortChange={setSort}
                filter={filter}
                onFilterChange={setFilter}
                onSingleView={showComingSoon}
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                {visiblePhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
                    조건에 맞는 사진이 없어요
                  </p>
                ) : (
                  <PhotoGrid photos={visiblePhotos} zoom={zoom} selectedIds={selected} onToggle={toggleSelect} />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <ShellBottomBar
        selectionCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        onMoveSelection={showComingSoon}
        onDeleteSelection={showComingSoon}
        hint={bottomHint}
        actions={
          stageIndex === 0 ? (
            <>
              <ShellCta kind={allPhotos.length === 0 ? "primary" : "ghost"} onClick={showComingSoon}>
                <UploadIcon size={18} />
                사진 업로드
              </ShellCta>
              {allPhotos.length > 0 && (
                <ShellCta disabled={!canOpen} onClick={() => setOpenConfirm(true)}>
                  갤러리 열기
                </ShellCta>
              )}
            </>
          ) : null
        }
      />

      {openConfirm && gallery && (
        <OpenGalleryModal
          gallery={gallery}
          photoCount={allPhotos.length}
          folderCount={details.length}
          reviewCount={reviewFolderCount}
          onClose={() => setOpenConfirm(false)}
          onOpened={(updated) => {
            setGallery(updated);
            setOpenConfirm(false);
          }}
        />
      )}
      {comingSoonToast}
    </div>
  );
}
