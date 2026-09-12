"use client";

/**
 * 클라이언트 — 갤러리 셸 v2 (C3, 2026-09-11)
 * 위치: src/app/(client)/gallery/[galleryId]/page.tsx
 *
 * 작가 셸의 부품(상단바 · 폴더 열 · 그리드 · 메인 헤더 · 하단 바 · 폴더 모달)을 그대로 쓴다.
 * 상단 왼쪽은 로고만, 사이드바는 기본 닫힘, 1단계 컨셉 분류는 작가 1단계 검토 화면과 같은 3열
 * (사이드바 + 컨셉 폴더 열 + 그리드)이다.
 *
 * 단계(clientStages): 대기(DRAFT — 서버가 사진 · 폴더를 주지 않아 안내 카드만) → 컨셉 분류(폴더 확정 전 —
 * 사진 옮기기 · 폴더 추가 · 삭제 · 검토 완료 · 폴더 확정) → 셀렉 & 보정 요청(WES-312) → 보정 검토(WES-313)
 * → (앨범 구성) → 완료.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { useSidebar } from "@/components/SidebarProvider";
import { CheckCircleIcon, ChevronRightIcon, PhotoIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { FolderColumn, ReviewBadge, type FolderSelection } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/FolderColumn";
import {
  FolderDeleteModal,
  FolderNameModal,
  MovePhotosModal,
  type FolderDeleteTarget,
} from "@/app/(studio)/studio/gallery/[galleryId]/_shell/FolderModals";
import { normalizeFolders } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/folderView";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import {
  markReviewed,
  parseReviewed,
  readReviewedRaw,
  subscribeReviewed,
  unmarkReviewed,
} from "@/app/(studio)/studio/gallery/[galleryId]/_shell/reviewMemory";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader, type FilterKey, type SortKey, sortPhotos } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { ShellTopbar } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellTopbar";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import { ApiError } from "@/lib/api/client";
import {
  createConceptFolder,
  createDetailFolder,
  deleteConceptFolder,
  deleteDetailFolder,
  listConceptFolders,
  moveCategoryPhotos,
  type ConceptFolderResponse,
} from "@/lib/api/conceptFolders";
import { listGalleryMembers } from "@/lib/api/galleries";
import { listAllPhotos, type PhotoResponse } from "@/lib/api/photos";
import { useInvitedGallery } from "../_lib/useInvitedGallery";
import { ClientCoachMarks } from "./_shell/ClientCoachMarks";
import { ClientSidebar, type ClientView, type StatusLine } from "./_shell/ClientSidebar";
import { ConfirmFoldersModal } from "./_shell/ConfirmFoldersModal";
import { ReviewStage } from "./_shell/ReviewStage";
import { SelectStage } from "./_shell/SelectStage";
import { WaitCard } from "./_shell/WaitCard";
import { clientPhaseOf, clientStageIndexOf, clientStageLabelOf, clientStagesOf } from "./_shell/clientStages";

function ddayLabel(deadline: string | null): string {
  const offset = deadlineOffset(deadline);
  if (offset === null) return "기한 없음";
  if (offset < 0) return `D-${-offset}`;
  if (offset === 0) return "D-day";
  return `+${offset}일`;
}

export default function ClientGalleryPage() {
  const params = useParams<{ galleryId: string }>();
  const galleryId = Number(params.galleryId);
  const { collapsed, hasPreference, setCollapsed } = useSidebar();
  const { showComingSoon, comingSoonToast } = useComingSoonToast();
  const { result: galleryResult, reload: reloadGallery } = useInvitedGallery(params.galleryId);
  const gallery = galleryResult?.kind === "ready" ? galleryResult.gallery : null;
  const phase = gallery ? clientPhaseOf(gallery) : null;
  /** 폴더 확정 뒤 — 셀렉은 SelectStage, 전달한 뒤(보정 중 · 검토 · 앨범 · 완료)는 ReviewStage가 그린다 */
  const selecting = phase !== null && phase !== "wait" && phase !== "sort";
  const reviewing = phase === "submitted" || phase === "review" || phase === "album" || phase === "done";
  // 사이드바 기본값: 1단계 닫힘 · 2단계부터 열림. 사용자가 직접 여닫은 기록(쿠키)이 있으면 그 값을 따른다
  useEffect(() => {
    if (selecting && !hasPreference && collapsed) setCollapsed(false);
  }, [selecting, hasPreference, collapsed, setCollapsed]);

  const [photos, setPhotos] = useState<PhotoResponse[] | null>(null);
  const [rawFolders, setFolders] = useState<ConceptFolderResponse[] | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [contentBlocked, setContentBlocked] = useState(false);

  const [view, setView] = useState<ClientView>("all");
  const [folderSel, setFolderSel] = useState<FolderSelection>({ kind: "all" });
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));
  const [sort, setSort] = useState<SortKey>("uploaded");
  const [filter, setFilter] = useState<FilterKey>("none");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<
    | { kind: "createConcept" }
    | { kind: "createDetail"; concept: ConceptFolderResponse }
    | { kind: "delete"; target: FolderDeleteTarget }
    | null
  >(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── 사진 · 폴더 (열린 뒤에만 — DRAFT는 서버가 클라이언트에게 주지 않는다) ──
  const opened = gallery !== null && phase !== "wait";
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    (async () => {
      const [p, f] = await Promise.allSettled([listAllPhotos(galleryId), listConceptFolders(galleryId)]);
      if (cancelled) return;
      const blocked = p.status === "rejected" && p.reason instanceof ApiError && p.reason.status === 403;
      setContentBlocked(blocked);
      setPhotos(p.status === "fulfilled" ? p.value : []);
      setFolders(f.status === "fulfilled" ? f.value : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [opened, galleryId]);
  useEffect(() => {
    if (!gallery) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listGalleryMembers(galleryId);
        if (!cancelled) setMemberCount(list.length);
      } catch {
        if (!cancelled) setMemberCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gallery, galleryId]);

  const refreshPhotos = useCallback(async () => {
    try {
      setPhotos(await listAllPhotos(galleryId));
    } catch {
      // 다음 갱신 때 다시
    }
  }, [galleryId]);
  const refreshFolders = useCallback(async () => {
    try {
      setFolders(await listConceptFolders(galleryId));
    } catch {
      // 다음 갱신 때 다시
    }
  }, [galleryId]);

  // ── 파생값 ──
  const allPhotos = useMemo(() => (photos ?? []).filter((p) => p.status === "UPLOADED"), [photos]);
  const reviewedRaw = useSyncExternalStore(subscribeReviewed, () => readReviewedRaw(galleryId), () => "");
  const reviewedIds = useMemo(() => new Set(parseReviewed(reviewedRaw)), [reviewedRaw]);
  const folders = useMemo(
    () => (rawFolders ? normalizeFolders(rawFolders, allPhotos, reviewedIds) : null),
    [rawFolders, allPhotos, reviewedIds],
  );
  const details = useMemo(() => folders?.flatMap((c) => c.details) ?? [], [folders]);
  const sortedIds = useMemo(() => new Set(details.flatMap((d) => d.photoIds)), [details]);
  const reviewIds = useMemo(
    () => new Set(details.filter((d) => d.needsReview).flatMap((d) => d.photoIds)),
    [details],
  );
  const reviewFolderCount = details.filter((d) => d.needsReview).length;
  const unsortedCount =
    folders && folders.length > 0 ? allPhotos.filter((p) => !sortedIds.has(p.photoId)).length : 0;

  const visiblePhotos = useMemo(() => {
    let list = allPhotos;
    if (folderSel.kind === "detail") {
      const ids = new Set(details.find((d) => d.id === folderSel.detailId)?.photoIds ?? []);
      list = list.filter((p) => ids.has(p.photoId));
    } else if (folderSel.kind === "concept") {
      const ids = new Set(folders?.find((c) => c.id === folderSel.conceptId)?.details.flatMap((d) => d.photoIds) ?? []);
      list = list.filter((p) => ids.has(p.photoId));
    } else if (folderSel.kind === "unsorted") {
      list = list.filter((p) => !sortedIds.has(p.photoId));
    }
    if (filter === "review") list = list.filter((p) => reviewIds.has(p.photoId));
    if (filter === "unsorted") list = list.filter((p) => !sortedIds.has(p.photoId));
    return sortPhotos(list, sort);
  }, [allPhotos, folderSel, folders, details, sortedIds, filter, reviewIds, sort]);

  const selectedDetail =
    folderSel.kind === "detail" ? details.find((d) => d.id === folderSel.detailId) ?? null : null;
  const selectedConcept =
    folderSel.kind === "detail" || folderSel.kind === "concept"
      ? folders?.find((c) => c.id === folderSel.conceptId) ?? null
      : null;

  const sorting = phase === "sort";
  const editable = sorting && !contentBlocked;

  function toggleSelect(photoId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }
  function selectAllVisible() {
    setSelected(new Set(visiblePhotos.map((p) => p.photoId)));
  }
  const anyModalOpen = folderModal !== null || moveOpen || confirmOpen;
  // ⌘/Ctrl+A — 컨셉 분류에서, 입력란 · 모달이 아닐 때 보고 있는 사진 전부
  useEffect(() => {
    if (!editable || anyModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "a") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      setSelected(new Set(visiblePhotos.map((p) => p.photoId)));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editable, anyModalOpen, visiblePhotos]);

  function changeFolder(next: FolderSelection) {
    setFolderSel(next);
    setView("all");
    setSelected(new Set());
  }

  // ── 폴더 편집 (서버가 403이면 작가만 할 수 있다는 뜻 — 모달이 문구를 보인다) ──
  async function submitFolderName(name: string) {
    if (!folderModal || folderModal.kind === "delete") return;
    if (folderModal.kind === "createConcept") await createConceptFolder(galleryId, name);
    else await createDetailFolder(galleryId, folderModal.concept.id, name);
    await refreshFolders();
    setFolderModal(null);
  }
  async function confirmFolderDelete() {
    if (!folderModal || folderModal.kind !== "delete") return;
    const { target } = folderModal;
    if (target.kind === "concept") await deleteConceptFolder(galleryId, target.concept.id);
    else await deleteDetailFolder(galleryId, target.concept.id, target.detail.id);
    await refreshFolders();
    if (
      (folderSel.kind === "detail" || folderSel.kind === "concept") &&
      (folderSel.conceptId === target.concept.id ||
        (target.kind === "detail" && folderSel.kind === "detail" && folderSel.detailId === target.detail.id))
    )
      setFolderSel({ kind: "all" });
    setFolderModal(null);
  }
  async function confirmMove(targetDetailId: number | null) {
    await moveCategoryPhotos(galleryId, [...selected], targetDetailId);
    await refreshFolders();
    setSelected(new Set());
    setMoveOpen(false);
  }

  // ── 상태줄 · 하단 문구 ──
  const status: StatusLine = (() => {
    if (!gallery) return { text: "불러오는 중…", tone: "muted" };
    if (phase === "wait") return { text: "작가가 사진을 준비하고 있어요", tone: "muted" };
    if (phase === "sort") {
      if (photos === null) return { text: "불러오는 중…", tone: "muted" };
      return reviewFolderCount > 0
        ? { text: `컨셉 분류 · 확인 필요 ${reviewFolderCount} · 폴더를 확정하면 고를 수 있어요`, tone: "warning" }
        : { text: "컨셉 분류 · 폴더를 확정하면 고를 수 있어요", tone: "accent" };
    }
    if (phase === "select") return { text: `고르는 중 · ${ddayLabel(gallery.selectionDeadline)}`, tone: "accent" };
    return { text: clientStageLabelOf(phase ?? "done", gallery), tone: "accent" };
  })();
  const bottomHint = (() => {
    if (notice) return notice;
    if (phase === "wait") return "준비가 끝나면 알림으로 알려 드려요 · 함께 볼 사람은 작가가 초대해요";
    if (phase === "sort") {
      if (contentBlocked) return "사진을 아직 볼 수 없어요 · 작가가 준비를 마치면 열려요";
      return "폴더를 확인하고 확정하면 사진을 고를 수 있어요 · 확정은 한 번만 할 수 있어요";
    }
    return "사진 셀렉 화면을 준비하고 있어요";
  })();
  const bottomActions =
    phase === "sort" ? (
      <span data-coach="confirm" className="inline-flex">
        <ShellCta disabled={folders === null || contentBlocked} onClick={() => setConfirmOpen(true)}>
          폴더 확정
        </ShellCta>
      </span>
    ) : null;

  // ── 오류 · 없음 ──
  if (galleryResult && galleryResult.kind !== "ready") {
    const notFound = galleryResult.kind === "notFound";
    return (
      <div className="grid min-h-dvh place-items-center bg-background-default-main px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="type-title-m text-contents-light-bgd-default">
            {notFound ? "이 갤러리를 볼 수 없어요" : "갤러리를 불러오지 못했어요"}
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            {notFound
              ? "초대받은 갤러리가 아니거나 삭제됐어요. 초대 링크를 다시 확인해 주세요."
              : "네트워크 연결을 확인한 뒤 다시 시도해 주세요."}
          </p>
          {notFound ? <Button href="/gallery">내 갤러리로</Button> : <Button onClick={reloadGallery}>다시 시도</Button>}
        </div>
      </div>
    );
  }

  const headerCommon = {
    zoom,
    onZoomChange: writeZoom,
    sort,
    onSortChange: setSort,
    filter,
    onFilterChange: setFilter,
    onSingleView: showComingSoon,
  };
  const allTitle =
    selectedDetail && selectedConcept ? (
      <>
        <span className="font-normal text-contents-light-bgd-weakness">{selectedConcept.name}</span>
        <span className="flex text-contents-light-bgd-weakness">
          <ChevronRightIcon size={18} />
        </span>
        <span className="truncate">{selectedDetail.name}</span>
        {selectedDetail.needsReview && (
          <>
            <ReviewBadge />
            {editable && (
              <button
                type="button"
                onClick={() => markReviewed(galleryId, selectedDetail.id)}
                className="ml-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--radius-8) border border-border-default px-2.5 type-label-medium-s font-medium text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
              >
                <CheckCircleIcon size={14} />
                검토 완료
              </button>
            )}
          </>
        )}
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{visiblePhotos.length}장</small>
      </>
    ) : folderSel.kind === "concept" && selectedConcept ? (
      <>
        <span className="truncate">{selectedConcept.name}</span>
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
          전체 · 세부 폴더 {selectedConcept.details.length}
        </small>
      </>
    ) : folderSel.kind === "unsorted" ? (
      <>미분류</>
    ) : (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{allPhotos.length}장</small>
      </>
    );

  const showFolderColumn = sorting && !contentBlocked && view === "all";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <ShellTopbar
        stageLabel={phase ? clientStageLabelOf(phase, gallery) : "…"}
        deadline={gallery?.selectionDeadline ?? null}
        notificationHrefFor={(n) => (n.scope === "GALLERY" && n.scopeId !== null ? `/gallery/${n.scopeId}` : null)}
      />

      {reviewing && gallery && phase ? (
        <ReviewStage galleryId={galleryId} gallery={gallery} phase={phase} photos={allPhotos} folders={folders} sidebarOpen={!collapsed} reloadGallery={reloadGallery} />
      ) : selecting && gallery && phase ? (
        <SelectStage
          galleryId={galleryId}
          gallery={gallery}
          phase={phase}
          photos={allPhotos}
          photosLoaded={photos !== null}
          folders={folders}
          sidebarOpen={!collapsed}
          reloadGallery={reloadGallery}
        />
      ) : (
        <>
        <div className="flex min-h-0 flex-1">
          {!collapsed && (
            <ClientSidebar
              title={gallery?.title ?? "…"}
              status={status}
              phase={phase ?? "wait"}
              stages={clientStagesOf(gallery)}
              stageIndex={clientStageIndexOf(phase ?? "wait", gallery)}
              photoCount={opened && photos !== null ? allPhotos.length : null}
              selectedCount={0}
              maxSelectable={gallery?.maxSelectablePhotoCount ?? null}
              view={view}
              onViewChange={(next) => {
                setView(next);
                setFolderSel({ kind: "all" });
                setSelected(new Set());
              }}
            />
          )}

          {showFolderColumn && (
            <div data-coach="folders" className="flex min-h-0">
              <FolderColumn
                folders={folders}
                totalPhotos={allPhotos.length}
                unsortedCount={unsortedCount}
                selection={folderSel}
                onSelect={changeFolder}
                onCreateConcept={() => setFolderModal({ kind: "createConcept" })}
                onCreateDetail={(concept) => setFolderModal({ kind: "createDetail", concept })}
                onDeleteConcept={(concept) => setFolderModal({ kind: "delete", target: { kind: "concept", concept } })}
                onDeleteDetail={(concept, detail) =>
                  setFolderModal({ kind: "delete", target: { kind: "detail", concept, detail } })
                }
                reviewedIds={reviewedIds}
                onMarkReviewed={(detail) => markReviewed(galleryId, detail.id)}
                onUnmarkReviewed={(detail) => unmarkReviewed(galleryId, detail.id)}
                pendingNote={
                  folders && folders.length === 0
                    ? { label: "없음", note: "작가가 아직 폴더를 만들지 않았어요. 미분류 사진은 그대로 고를 수 있어요." }
                    : null
                }
              />
            </div>
          )}

          <main className="flex min-w-0 flex-1 flex-col">
            {!gallery ? (
              <div className="flex-1" aria-busy="true" />
            ) : phase === "wait" ? (
              <WaitCard gallery={gallery} memberCount={memberCount} />
            ) : photos === null ? (
              <div className="flex-1" aria-busy="true" />
            ) : contentBlocked ? (
              <WaitCard gallery={gallery} memberCount={memberCount} />
            ) : allPhotos.length === 0 ? (
              <div className="grid flex-1 place-items-center px-6 py-8">
                <p className="type-content-s text-contents-light-bgd-sub">아직 올라온 사진이 없어요</p>
              </div>
            ) : (
              <>
                <ShellMainHeader {...headerCommon} title={allTitle} />
                <div data-coach="photos" className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                  {visiblePhotos.length === 0 ? (
                    <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">조건에 맞는 사진이 없어요</p>
                  ) : (
                    <PhotoGrid
                      photos={visiblePhotos}
                      zoom={zoom}
                      selectedIds={selected}
                      onToggle={toggleSelect}
                      selectable={editable}
                    />
                  )}
                </div>
              </>
            )}
          </main>
        </div>

        <ShellBottomBar
          selectionCount={selected.size}
          visibleCount={visiblePhotos.length}
          onSelectAll={selectAllVisible}
          onClearSelection={() => setSelected(new Set())}
          onMoveSelection={() => setMoveOpen(true)}
          hint={bottomHint}
          actions={bottomActions}
        />

        {folderModal && folderModal.kind !== "delete" && (
          <FolderNameModal
            kind={folderModal.kind === "createConcept" ? "concept" : "detail"}
            parentName={folderModal.kind === "createDetail" ? folderModal.concept.name : undefined}
            onClose={() => setFolderModal(null)}
            onSubmit={submitFolderName}
          />
        )}
        {folderModal && folderModal.kind === "delete" && (
          <FolderDeleteModal target={folderModal.target} onClose={() => setFolderModal(null)} onConfirm={confirmFolderDelete} />
        )}
        {moveOpen && (
          <MovePhotosModal
            count={selected.size}
            folders={folders ?? []}
            currentDetailId={folderSel.kind === "detail" ? folderSel.detailId : null}
            onClose={() => setMoveOpen(false)}
            onConfirm={confirmMove}
          />
        )}
        {confirmOpen && gallery && (
          <ConfirmFoldersModal
            galleryId={galleryId}
            folders={folders ?? []}
            photoCount={allPhotos.length}
            unsortedCount={unsortedCount}
            reviewCount={reviewFolderCount}
            onClose={() => setConfirmOpen(false)}
            onConfirmed={() => {
              setConfirmOpen(false);
              setSelected(new Set());
              setNotice("폴더를 확정했어요 · 이제 사진을 고를 수 있어요");
              reloadGallery();
              void refreshPhotos();
            }}
          />
        )}
        </>
      )}
      <ClientCoachMarks ready={editable && folders !== null && photos !== null && allPhotos.length > 0} />
      {comingSoonToast}
    </div>
  );
}
