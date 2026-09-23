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
import { CheckCircleIcon, ChevronRightIcon, PhotoIcon, SparkleIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ddayLabel } from "@/app/(studio)/_lib/galleryStatus";
import { FolderColumn, ReviewBadge, type FolderSelection } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/FolderColumn";
import {
  DeletePhotosModal,
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
import { usePhotoMove } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/usePhotoMove";
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
import { deletePhotos, listAllPhotos, type PhotoResponse } from "@/lib/api/photos";
import { useAuth } from "@/lib/auth/authStore";
import { useInvitedGallery } from "../_lib/useInvitedGallery";
import { ClientCoachMarks } from "./_shell/ClientCoachMarks";
import { ClientSidebar, type ClientView, type StatusLine } from "./_shell/ClientSidebar";
import { ConfirmFoldersModal } from "./_shell/ConfirmFoldersModal";
import { PersonalCoachMarks } from "./_shell/PersonalCoachMarks";
import { PersonalInviteModal } from "./_shell/PersonalInviteModal";
import { PersonalEmptyGuide } from "./_shell/PersonalEmptyGuide";
import { personalMembershipOf } from "./_shell/personalGallery";
import { ReviewStage } from "./_shell/ReviewStage";
import { SelectStage } from "./_shell/SelectStage";
import { WaitCard } from "./_shell/WaitCard";
import { usePersonalUpload } from "./_shell/usePersonalUpload";
import { clientPhaseOf, clientStageIndexOf, clientStageLabelOf, clientStagesOf, personalPhaseOf } from "./_shell/clientStages";

export default function ClientGalleryPage() {
  const params = useParams<{ galleryId: string }>();
  const galleryId = Number(params.galleryId);
  const { collapsed, hasPreference, setCollapsed } = useSidebar();
  const { showComingSoon, comingSoonToast } = useComingSoonToast();
  const { result: galleryResult, reload: reloadGallery } = useInvitedGallery(params.galleryId);
  const gallery = galleryResult?.kind === "ready" ? galleryResult.gallery : null;
  const auth = useAuth();
  /** 개인 결제 클라이언트(소유자 · 파트너)인지 — 내 소속 목록으로 판정. null이면 스튜디오 초대 클라이언트 */
  const personal = personalMembershipOf(auth.user, gallery);
  const isPersonal = personal !== null;

  const [photos, setPhotos] = useState<PhotoResponse[] | null>(null);
  /** 사진 목록을 마지막으로 읽은 시각 — 개인 갤러리 끊김 복구가 쓴다 */
  const [photosLoadedAt, setPhotosLoadedAt] = useState(0);
  // 개인은 올라온(UPLOADED) 사진 수와 폴더 확정으로 단계를 가른다 — 서버 stage는 업로드 · 컨셉 분류 · 셀렉을 구분하지 않는다.
  // 첫 장이 올라오기 전(PENDING만)엔 작가 1단계처럼 안내 카드가 남는다
  const phase = gallery
    ? isPersonal
      ? personalPhaseOf(gallery, photos === null ? null : photos.filter((p) => p.status === "UPLOADED").length)
      : clientPhaseOf(gallery)
    : null;
  /** 폴더 확정 뒤 — 셀렉은 SelectStage, 전달한 뒤(보정 중 · 검토 · 앨범 · 완료)는 ReviewStage가 그린다 */
  const selecting = phase !== null && phase !== "wait" && phase !== "sort" && phase !== "upload";
  const reviewing = phase === "submitted" || phase === "review" || phase === "album" || phase === "done";
  // 사이드바 기본값: 1단계 닫힘 · 2단계부터 열림. 사용자가 직접 여닫은 기록(쿠키)이 있으면 그 값을 따른다
  useEffect(() => {
    if (selecting && !hasPreference && collapsed) setCollapsed(false);
  }, [selecting, hasPreference, collapsed, setCollapsed]);

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
  /** 상단 "게스트 초대" — 2단계부터(공유폴더 · 링크는 SelectStage · ReviewStage의 useGuestSharing이 그린다) */
  const [inviteOpen, setInviteOpen] = useState(false);
  /** 개인 소유자 — 컨셉 분류에서 고른 사진을 휴지통으로(작가 1단계와 같은 자리) */
  const [deletePhotosOpen, setDeletePhotosOpen] = useState(false);
  /** 개인 — 요청서를 막 내보냈으면 보정 확인 화면이 열리며 내려받기 모달을 바로 연다 */
  const [autoDownload, setAutoDownload] = useState(false);

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
      setPhotosLoadedAt(Date.now());
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
      setPhotosLoadedAt(Date.now());
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
  const pendingPhotos = useMemo(() => (photos ?? []).filter((p) => p.status === "PENDING"), [photos]);
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

  // ── 개인 갤러리 업로드 · AI 정리 — 업로드 · 컨셉 분류 단계에서만 살아 있다(작가 1단계 부품 재사용) ──
  const upload = usePersonalUpload({
    galleryId,
    enabled: isPersonal && (phase === "upload" || phase === "sort"),
    photos,
    photosLoadedAt,
    reviewedIds,
    setPhotos,
    setFolders,
    refreshPhotos,
    planMaxPhotoCount: gallery?.planMaxPhotoCount ?? null,
  });

  const visiblePhotos = useMemo(() => {
    // 올리는 동안은 PENDING도 회색 자리로 보여 준다(작가 1단계와 같음 — 끝난 뒤 남은 PENDING은 복구 배너의 몫)
    let list = isPersonal && upload.uploading ? [...allPhotos, ...pendingPhotos] : allPhotos;
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
  }, [allPhotos, folderSel, folders, details, sortedIds, filter, reviewIds, sort, isPersonal, upload.uploading, pendingPhotos]);

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
  /** 지금 보고 있는 사진 전부 고르기 — 올리는 중인(PENDING) 자리는 제외(작가와 같음) */
  function selectAllVisible() {
    setSelected(new Set(visiblePhotos.filter((p) => p.status === "UPLOADED").map((p) => p.photoId)));
  }
  /** 여러 장 한 번에 — Shift 범위 · 체크 칠하기 */
  const selectMany = useCallback((photoIds: number[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of photoIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, [setSelected]);
  const clearSelection = useCallback(() => setSelected(new Set()), [setSelected]);
  /** 이 사진이 지금 들어 있는 세부 폴더 — 끌어 옮기기의 실행 취소가 쓴다 */
  const folderOfPhoto = useMemo(() => {
    const map = new Map<number, number>();
    for (const detail of details) for (const id of detail.photoIds) map.set(id, detail.id);
    return map;
  }, [details]);
  const folderOf = useCallback((photoId: number) => folderOfPhoto.get(photoId) ?? null, [folderOfPhoto]);
  const photoMove = usePhotoMove({
    galleryId,
    enabled: editable && folders !== null && allPhotos.length > 0,
    photos: visiblePhotos,
    selectedIds: selected,
    clearSelection,
    folderOf,
    onMoved: refreshFolders,
  });
  const anyModalOpen = folderModal !== null || moveOpen || confirmOpen || deletePhotosOpen;
  // ⌘/Ctrl+A — 컨셉 분류에서, 입력란 · 모달이 아닐 때 보고 있는 사진 전부
  useEffect(() => {
    if (!editable || anyModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "a") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      setSelected(new Set(visiblePhotos.filter((p) => p.status === "UPLOADED").map((p) => p.photoId)));
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
  async function confirmDeletePhotos() {
    await deletePhotos(galleryId, [...selected]);
    setSelected(new Set());
    setDeletePhotosOpen(false);
    await Promise.all([refreshPhotos(), refreshFolders()]);
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
    // 개인의 업로드 · AI 구간은 작가 1단계 상태줄과 같은 문구 · 숫자
    if (isPersonal && upload.uploading) return { text: `올리는 중 ${upload.runCounts.done} / ${upload.runCounts.total}`, tone: "accent" };
    if (isPersonal && upload.aiCategorizing) return { text: "폴더 만드는 중", tone: "accent" };
    if (isPersonal && upload.merging) return { text: "폴더 정리 중…", tone: "accent" };
    if (isPersonal && upload.aiActive) return { text: `AI 분석 중 ${upload.aiCounts?.scored ?? 0} / ${upload.aiCounts?.expected ?? 0}`, tone: "accent" };
    if (isPersonal && upload.aiFailed) return { text: "AI 정리 실패 · 다시 시도할 수 있어요", tone: "error" };
    if (phase === "upload") return { text: "사진 없음", tone: "muted" };
    if (phase === "sort") {
      if (photos === null) return { text: "불러오는 중…", tone: "muted" };
      if (isPersonal && (!folders || folders.length === 0)) return { text: `${allPhotos.length}장 · 폴더 만들기 전`, tone: "muted" };
      return reviewFolderCount > 0
        ? { text: `컨셉 분류 · 확인 필요 ${reviewFolderCount} · 폴더를 확정하면 고를 수 있어요`, tone: "warning" }
        : { text: "컨셉 분류 · 폴더를 확정하면 고를 수 있어요", tone: "accent" };
    }
    if (phase === "select") return { text: `고르는 중 · ${ddayLabel(gallery.selectionDeadline)}`, tone: "accent" };
    return { text: clientStageLabelOf(phase ?? "done", gallery, isPersonal), tone: "accent" };
  })();
  const bottomHint = (() => {
    if (notice) return notice;
    if (isPersonal && upload.hint) return upload.hint;
    if (phase === "wait") return "준비가 끝나면 알림으로 알려 드려요 · 함께 볼 사람은 작가가 초대해요";
    if (phase === "upload") return "원본은 그대로 보관되고 화면에는 줄인 미리보기를 써요";
    if (phase === "sort") {
      if (contentBlocked) return "사진을 아직 볼 수 없어요 · 작가가 준비를 마치면 열려요";
      if (isPersonal && (!folders || folders.length === 0)) return "폴더는 업로드가 끝나면 AI가 만들어요";
      return "폴더를 확인하고 확정하면 사진을 고를 수 있어요 · 확정은 한 번만 할 수 있어요";
    }
    return "사진 셀렉 화면을 준비하고 있어요";
  })();
  const bottomActions = isPersonal ? (
    upload.uploading ? (
      upload.actions
    ) : (
      <>
        {upload.actions}
        {phase === "upload" ? (
          <span data-coach="upload" className="inline-flex">
            <ShellCta disabled={photos === null} onClick={upload.openUpload}>
              <UploadIcon size={18} />
              사진 업로드
            </ShellCta>
          </span>
        ) : phase === "sort" ? (
          <>
            <ShellCta kind="ghost" onClick={upload.openUpload}>
              <UploadIcon size={18} />
              사진 더 올리기
            </ShellCta>
            <span data-coach="confirm" className="inline-flex">
              <ShellCta disabled={folders === null || upload.aiActive} onClick={() => setConfirmOpen(true)}>
                폴더 확정
              </ShellCta>
            </span>
          </>
        ) : null}
      </>
    )
  ) : phase === "sort" ? (
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
        {isPersonal && upload.aiActive && (
          <span className="ml-1.5 inline-flex items-center gap-1 rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-semibold-xs text-brand-secondary-dark">
            <SparkleIcon size={12} />
            {upload.aiCategorizing ? "폴더 만드는 중" : "AI 분석 중"}
          </span>
        )}
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{allPhotos.length}장</small>
      </>
    );

  const showFolderColumn = sorting && !contentBlocked && view === "all";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <ShellTopbar
        stages={clientStagesOf(gallery, isPersonal)}
        stageIndex={phase && phase !== "wait" ? clientStageIndexOf(phase, gallery, isPersonal) : null}
        deadlineStage={isPersonal ? 2 : 1}
        deadline={gallery?.selectionDeadline ?? null}
        onInviteClick={isPersonal ? (personal.owner ? () => setInviteOpen(true) : undefined) : selecting ? () => setInviteOpen(true) : undefined}
        inviteLabel={isPersonal ? "초대" : "게스트 초대"}
        inviteCoachKey={isPersonal ? "invite" : undefined}
        notificationHrefFor={(n) => (n.scope === "GALLERY" && n.scopeId !== null ? `/gallery/${n.scopeId}` : null)}
      />

      {reviewing && gallery && phase ? (
        <ReviewStage
          galleryId={galleryId}
          gallery={gallery}
          phase={phase}
          photos={allPhotos}
          folders={folders}
          sidebarOpen={!collapsed}
          reloadGallery={reloadGallery}
          inviteOpen={inviteOpen}
          onInviteClose={() => setInviteOpen(false)}
          personal={isPersonal}
          owner={personal?.owner ?? false}
          autoOpenDownload={autoDownload}
          onAutoOpenDownloadHandled={() => setAutoDownload(false)}
        />
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
          inviteOpen={inviteOpen}
          onInviteClose={() => setInviteOpen(false)}
          personal={isPersonal}
          onExported={() => setAutoDownload(true)}
        />
      ) : (
        <>
        <div className="flex min-h-0 flex-1">
          {!collapsed && (
            <ClientSidebar
              title={gallery?.title ?? "…"}
              status={status}
              phase={phase ?? "wait"}
              plan={isPersonal && gallery ? { used: photos?.length ?? 0, max: gallery.planMaxPhotoCount, expiresAt: gallery.planExpiresAt } : undefined}
              selectedLockNote={isPersonal ? "분류 뒤" : undefined}
              retouchLockNote={isPersonal ? "내보낸 뒤" : undefined}
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
                dropping={photoMove.dropping}
                dropOver={photoMove.dropOver}
                pendingNote={
                  folders && folders.length === 0
                    ? isPersonal
                      ? upload.uploading || upload.aiActive
                        ? upload.aiCategorizing
                          ? { label: "만드는 중…", note: "AI가 컨셉 · 세부 폴더로 나누고 있어요. 끝나면 알림으로 알려 드려요." }
                          : {
                              label: "대기",
                              note: "폴더는 업로드가 끝나면 AI가 만들어요. 임베딩 · 점수는 올라오는 대로 매기고 있어요.",
                            }
                        : null
                      : { label: "없음", note: "작가가 아직 폴더를 만들지 않았어요. 미분류 사진은 그대로 고를 수 있어요." }
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
            ) : phase === "upload" ? (
              <>
                {upload.recoveryBanner}
                <PersonalEmptyGuide />
              </>
            ) : allPhotos.length === 0 ? (
              <div className="grid flex-1 place-items-center px-6 py-8">
                <p className="type-content-s text-contents-light-bgd-sub">아직 올라온 사진이 없어요</p>
              </div>
            ) : (
              <>
                <ShellMainHeader {...headerCommon} title={allTitle} />
                {isPersonal && upload.recoveryBanner}
                <div data-coach="photos" className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                  {visiblePhotos.length === 0 ? (
                    <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">조건에 맞는 사진이 없어요</p>
                  ) : (
                    <PhotoGrid
                      photos={visiblePhotos}
                      zoom={zoom}
                      selectedIds={selected}
                      onToggle={toggleSelect}
                      onSelectMany={selectMany}
                      drag={photoMove.drag}
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
          visibleCount={visiblePhotos.filter((p) => p.status === "UPLOADED").length}
          onSelectAll={selectAllVisible}
          onClearSelection={() => setSelected(new Set())}
          onMoveSelection={() => setMoveOpen(true)}
          onDeleteSelection={isPersonal && personal.owner && sorting ? () => setDeletePhotosOpen(true) : undefined}
          hint={bottomHint}
          progress={isPersonal ? upload.progress ?? undefined : undefined}
          actions={bottomActions}
        />

        {isPersonal && upload.modal}

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
        {deletePhotosOpen && <DeletePhotosModal count={selected.size} onClose={() => setDeletePhotosOpen(false)} onConfirm={confirmDeletePhotos} />}
        {isPersonal && inviteOpen && !selecting && !reviewing && gallery && (
          <PersonalInviteModal galleryId={galleryId} galleryTitle={gallery.title} guest={null} onClose={() => setInviteOpen(false)} />
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
      <PersonalCoachMarks ready={isPersonal && phase === "upload" && photos !== null && !upload.modalOpen} />
      {comingSoonToast}
      {photoMove.overlay}
    </div>
  );
}
