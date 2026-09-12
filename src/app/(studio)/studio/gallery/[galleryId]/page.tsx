"use client";

/**
 * 작가 — 갤러리 셸 v2 (구조 확정 2026-09-11 · 1단계 사진 업로드 · 2단계 셀렉 대기)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/page.tsx
 *
 * 상단 한 줄 · 사이드바(접힘 가능) · 폴더 열(1단계만) · 메인(헤더 + 그리드) · 하단 바(주 버튼).
 * B1 = 화면 구성: 갤러리 · 사진 · 폴더 · 선택 앨범은 읽고, 갤러리 열기 · 기간 연장 · 장수 바꾸기 ·
 * 초대 링크처럼 작은 쓰기만 한다. B2 = 업로드(useUploadRun · UploadModal · 하단 진행 막대) · AI 분석 진행
 * (useAnalysisWatch) · 끊김 복구(RecoveryBanner) · 검토 동작(FolderColumn 케밥 · FolderModals: 폴더 추가 · 삭제 ·
 * 사진 이동 · 사진 삭제=휴지통 이동). 이름 바꾸기는 서버 API가 없어 없다.
 * 셀렉 완료 → 보정 작업 전환은 서버 방법 확인 전이라 확인 모달까지만.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { useSidebar } from "@/components/SidebarProvider";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  CloudUploadIcon,
  ErrorIcon,
  PauseIcon,
  PersonAddIcon,
  PhotoIcon,
  PlayIcon,
  RefreshIcon,
  ScheduleIcon,
  SparkleIcon,
  UploadIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { isAnalysisActive } from "@/lib/api/analysis";
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
import {
  getGallery,
  listGalleryMembers,
  type GalleryMemberResponse,
  type GalleryResponse,
} from "@/lib/api/galleries";
import { markNotificationsRead } from "@/lib/api/notifications";
import { deletePhotos, listAllPhotos, type PhotoResponse } from "@/lib/api/photos";
import { fetchStudio, type StudioResponse } from "@/lib/api/studios";
import { ChangeQuotaModal } from "./_shell/ChangeQuotaModal";
import { EmptyUploadGuide } from "./_shell/EmptyUploadGuide";
import { ExtendDeadlineModal } from "./_shell/ExtendDeadlineModal";
import { FolderColumn, ReviewBadge, type FolderSelection } from "./_shell/FolderColumn";
import { duplicateConceptGroups, mergeDuplicateConcepts, normalizeFolders } from "./_shell/folderView";
import {
  DeletePhotosModal,
  FolderDeleteModal,
  FolderNameModal,
  MovePhotosModal,
  type FolderDeleteTarget,
} from "./_shell/FolderModals";
import { GalleryInviteModal, type InviteTab } from "./_shell/GalleryInviteModal";
import { OpenGalleryModal } from "./_shell/OpenGalleryModal";
import { PhotoGrid } from "./_shell/PhotoGrid";
import { RecoveryBanner } from "./_shell/RecoveryBanner";
import {
  markReviewed,
  parseReviewed,
  readReviewedRaw,
  subscribeReviewed,
  unmarkReviewed,
} from "./_shell/reviewMemory";
import { ShellBottomBar, ShellCta } from "./_shell/ShellBottomBar";
import { ShellMainHeader, type FilterKey, type SortKey, sortPhotos } from "./_shell/ShellMainHeader";
import { ShellSidebar, type ShellView, type StatusLine } from "./_shell/ShellSidebar";
import { ShellTopbar } from "./_shell/ShellTopbar";
import { SidebarFolderTree } from "./_shell/SidebarFolderTree";
import { StageConfirmModal } from "./_shell/StageConfirmModal";
import { SHELL_STAGES, stageIndexOf } from "./_shell/stages";
import { UploadModal } from "./_shell/UploadModal";
import { ProgressBar } from "./_shell/UploadProgress";
import {
  forgetUploaded,
  parseRemembered,
  readRememberedRaw,
  readUploadActiveRaw,
  subscribeRemembered,
} from "./_shell/uploadMemory";
import { matchRecoveryFiles, recoverablePending } from "./_shell/uploadRecovery";
import { describeUploadError, formatEta } from "./_shell/uploadSupport";
import { analysisCounts, useAnalysisWatch } from "./_shell/useAnalysisWatch";
import { useSelectionWatch } from "./_shell/useSelectionWatch";
import { useUploadRun } from "./_shell/useUploadRun";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "./_shell/zoomMemory";

function ddayLabel(deadline: string | null): string {
  const offset = deadlineOffset(deadline);
  if (offset === null) return "기한 없음";
  if (offset < 0) return `D-${-offset}`;
  if (offset === 0) return "D-day";
  return `+${offset}일`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 2단계 셀렉 대기의 하위 상태 */
type SelectSub = "invite" | "picking" | "submitted" | "overdue";

export default function StudioGalleryShellPage() {
  const params = useParams<{ galleryId: string }>();
  const galleryId = Number(params.galleryId);
  const { collapsed } = useSidebar();
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  const [gallery, setGallery] = useState<GalleryResponse | null>(null);
  const [studio, setStudio] = useState<StudioResponse | null>(null);
  const [photos, setPhotos] = useState<PhotoResponse[] | null>(null);
  const [rawFolders, setFolders] = useState<ConceptFolderResponse[] | null>(null);
  const [members, setMembers] = useState<GalleryMemberResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<ShellView>("all");
  const [folderSel, setFolderSel] = useState<FolderSelection>({ kind: "all" });
  // 사진 크기(줌)는 브라우저에 기억 — 새로 고쳐도 맞춰 둔 크기 그대로(서버 렌더는 기본 40)
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));
  const [sort, setSort] = useState<SortKey>("uploaded");
  const [filter, setFilter] = useState<FilterKey>("none");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [openConfirm, setOpenConfirm] = useState(false);
  const [inviteTab, setInviteTab] = useState<InviteTab | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"retouch" | "asis" | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  /** 사진 목록을 마지막으로 읽은 시각 — 복구 대상 PENDING의 나이를 이 시각으로 잰다(렌더 중 시계를 읽지 않기 위해) */
  const [photosLoadedAt, setPhotosLoadedAt] = useState(0);
  const [discarding, setDiscarding] = useState(false);
  const [folderModal, setFolderModal] = useState<
    | { kind: "createConcept" }
    | { kind: "createDetail"; concept: ConceptFolderResponse }
    | { kind: "delete"; target: FolderDeleteTarget }
    | null
  >(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deletePhotosOpen, setDeletePhotosOpen] = useState(false);
  /** 업로드가 끝난 뒤 하단 왼쪽에 잠시 보이는 문구(완료 · 오류) */
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

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
        setPhotosLoadedAt(Date.now());
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

  // ── 조용한 재조회 — 업로드 · 분석 진행이 목록을 갈아 끼울 때(스크롤 유지, 로딩 화면 없음) ──
  // 한 번에 하나만 돌고(겹치면 끝난 뒤 한 번 더), 늦게 온 옛 응답이 새 목록을 덮지 않게 순번을 본다
  const refreshSeqRef = useRef(0);
  const refreshBusyRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const refreshPhotos = useCallback(async () => {
    if (refreshBusyRef.current) {
      refreshQueuedRef.current = true;
      return;
    }
    refreshBusyRef.current = true;
    try {
      do {
        refreshQueuedRef.current = false;
        const seq = ++refreshSeqRef.current;
        try {
          const list = await listAllPhotos(galleryId);
          if (seq === refreshSeqRef.current) {
            setPhotos(list);
            setPhotosLoadedAt(Date.now());
          }
        } catch {
          // 다음 갱신 때 다시
        }
      } while (refreshQueuedRef.current);
    } finally {
      refreshBusyRef.current = false;
    }
  }, [galleryId]);
  // 임베딩 수가 늘 때마다(3초) 전체 목록을 다시 읽으면 수천 장에서 무겁다 — 10초에 한 번만
  const lastEmbeddedRefreshRef = useRef(0);
  const refreshFolders = useCallback(async () => {
    try {
      setFolders(await listConceptFolders(galleryId));
    } catch {
      // 다음 갱신 때 다시
    }
  }, [galleryId]);

  // ── 업로드 실행기 ──
  // 큐가 비면 분석 잡을 요청한다 — 잡 없이는 폴더가 생기지 않는다(감시 훅의 request, 아래에서 ref로 연결).
  const requestAnalysisRef = useRef<() => Promise<void>>(async () => {});
  const {
    run,
    start: startUpload,
    abort: abortUpload,
    pause: pauseUpload,
    resume: resumeUpload,
    retryFailed,
    reset: resetUpload,
  } = useUploadRun(galleryId, {
    onBatchUploaded: () => void refreshPhotos(),
    onFinished: async ({ done, failed, aborted }) => {
      await refreshPhotos();
      if (aborted) setUploadNotice(`업로드를 중단했어요. ${done}장은 올라갔어요.`);
      else if (failed === 0) setUploadNotice(`${done}장 업로드 완료 · AI가 폴더로 정리하고 있어요`);
      if (done > 0) void requestAnalysisRef.current();
      if (failed === 0) resetUpload();
    },
  });
  const uploading = run.phase === "running" || run.phase === "paused";
  const uploadFailedIdle = run.phase === "finished" && !run.aborted && run.failed > 0;

  // ── 단계 ──
  const stageIndex = gallery ? stageIndexOf(gallery) : 0;
  const inSelection = gallery !== null && stageIndex >= 1;

  // ── AI 분석 진행 감시(1단계) — 카운트(요약) + 잡 폴링, 완료 시 폴더 · 사진 재조회 ──
  const analysis = useAnalysisWatch(
    galleryId,
    {
      enabled: stageIndex === 0 && gallery !== null && (uploading || (photos?.length ?? 0) > 0),
      uploading,
    },
    {
      onDone: () => {
        setUploadNotice(null);
        void (async () => {
          const [f, p] = await Promise.all([
            listConceptFolders(galleryId).catch(() => null),
            listAllPhotos(galleryId).catch(() => null),
          ]);
          if (f) setFolders(f);
          if (p) {
            setPhotos(p);
            setPhotosLoadedAt(Date.now());
          }
          if (f && p)
            await mergeDuplicates(
              normalizeFolders(f, p.filter((x) => x.status === "UPLOADED"), reviewedIdsRef.current),
            );
        })();
      },
      onEmbeddedChange: () => {
        const now = Date.now();
        if (now - lastEmbeddedRefreshRef.current < 10_000) return;
        lastEmbeddedRefreshRef.current = now;
        void refreshPhotos();
      },
    },
  );
  useEffect(() => {
    requestAnalysisRef.current = analysis.request;
  }, [analysis.request]);
  const aiJob = analysis.job;
  const aiActive = isAnalysisActive(aiJob);
  const aiCategorizing = aiJob?.status === "CATEGORIZING";
  const aiFailed = aiJob?.status === "FAILED" && !aiActive;
  const aiCounts = analysisCounts(aiJob, analysis.summary);

  // 2단계부터: 선택 앨범(자동 갱신) · 멤버
  const { selection, quotaRequest, reload: reloadSelection } = useSelectionWatch(galleryId, inSelection);
  useEffect(() => {
    if (!inSelection) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listGalleryMembers(galleryId);
        if (!cancelled) setMembers(list);
      } catch {
        if (!cancelled) setMembers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inSelection, galleryId, inviteTab]);

  // ── 파생값 ──
  const allPhotos = useMemo(() => (photos ?? []).filter((p) => p.status === "UPLOADED"), [photos]);
  const pendingPhotos = useMemo(() => (photos ?? []).filter((p) => p.status === "PENDING"), [photos]);
  // "검토 완료"로 표시한 세부 폴더(브라우저 기억) — 서버 needsReview는 지울 수 없어 화면에서만 감춘다
  const reviewedRaw = useSyncExternalStore(subscribeReviewed, () => readReviewedRaw(galleryId), () => "");
  const reviewedIds = useMemo(() => new Set(parseReviewed(reviewedRaw)), [reviewedRaw]);
  const reviewedIdsRef = useRef(reviewedIds);
  useEffect(() => {
    reviewedIdsRef.current = reviewedIds;
  }, [reviewedIds]);
  // 서버의 세부 폴더 photoIds는 순서가 없고 휴지통 사진도 섞여 온다 — 살아 있는 사진만 남기고 업로드 순으로
  const folders = useMemo(
    () => (rawFolders ? normalizeFolders(rawFolders, allPhotos, reviewedIds) : null),
    [rawFolders, allPhotos, reviewedIds],
  );

  // ── 중복 컨셉 합치기 — 재분석이 같은 이름 컨셉을 덧붙이는 서버 동작(백엔드 요청)을 화면에서 정리 ──
  const [merging, setMerging] = useState(false);
  const mergingRef = useRef(false);
  const mergeDuplicates = useCallback(
    async (list: ConceptFolderResponse[]) => {
      if (mergingRef.current || duplicateConceptGroups(list).length === 0) return;
      mergingRef.current = true;
      setMerging(true);
      try {
        await mergeDuplicateConcepts(galleryId, list);
      } catch (err) {
        setUploadNotice(describeUploadError(err));
      } finally {
        await refreshFolders();
        mergingRef.current = false;
        setMerging(false);
      }
    },
    [galleryId, refreshFolders],
  );
  // 화면에 들어왔을 때 이미 중복이 있으면(이전 재분석의 흔적) 한 번 정리 — 올리는 중 · 분석 중엔 기다린다
  const mergedOnLoadRef = useRef(false);
  useEffect(() => {
    if (mergedOnLoadRef.current || !folders || stageIndex !== 0 || uploading || aiActive) return;
    if (duplicateConceptGroups(folders).length === 0) return;
    mergedOnLoadRef.current = true;
    void (async () => {
      await mergeDuplicates(folders);
    })();
  }, [folders, stageIndex, uploading, aiActive, mergeDuplicates]);

  // ── 끊김 복구 — 이 브라우저가 발급한 사진 기억(localStorage 구독) + 서버 PENDING ──
  const rememberedRaw = useSyncExternalStore(
    subscribeRemembered,
    () => readRememberedRaw(galleryId),
    () => "",
  );
  const remembered = useMemo(() => parseRemembered(rememberedRaw), [rememberedRaw]);
  const existingNames = useMemo(() => new Set(allPhotos.map((p) => p.originalFileName)), [allPhotos]);
  // 다른 탭이 이 갤러리를 올리는 중이면(심장 박동 20초 안) 그 탭의 PENDING을 복구 대상으로 삼지 않는다
  const otherTabUploading =
    useSyncExternalStore(subscribeRemembered, () => readUploadActiveRaw(galleryId), () => "") === "1";
  const recoverable = useMemo(
    () =>
      uploading || otherTabUploading || stageIndex !== 0
        ? []
        : recoverablePending(pendingPhotos, remembered, photosLoadedAt),
    [uploading, otherTabUploading, stageIndex, pendingPhotos, remembered, photosLoadedAt],
  );
  // 서버에서 이미 UPLOADED가 됐거나(스윕 보정) 지워진 사진의 기억은 정리 — 목록을 읽은 뒤 발급된 것은 건드리지 않는다
  useEffect(() => {
    if (uploading || photos === null) return;
    const pendingIds = new Set(pendingPhotos.map((p) => p.photoId));
    const stale = remembered
      .filter((item) => !pendingIds.has(item.photoId) && item.issuedAt < photosLoadedAt)
      .map((item) => item.photoId);
    if (stale.length > 0) forgetUploaded(galleryId, stale);
  }, [uploading, photos, pendingPhotos, remembered, photosLoadedAt, galleryId]);

  function onRecoveryFiles(files: File[]) {
    const { resume, fresh } = matchRecoveryFiles(files, recoverable, remembered);
    setUploadNotice(
      resume.length === 0
        ? "짝이 맞는 파일이 없어 새 사진으로 올려요"
        : fresh.length > 0
          ? `${resume.length}장은 이어서, ${fresh.length}장은 새로 올려요`
          : null,
    );
    void startUpload(fresh, resume);
  }
  // ── 검토 동작 — 폴더 만들기 · 삭제 · 사진 이동 · 사진 삭제 (서버는 본문 없이 끝나므로 다시 조회) ──
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
    // 보고 있던 폴더가 사라졌으면 모든 사진으로
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
  async function confirmDeletePhotos() {
    const deleted = new Set(selected);
    await deletePhotos(galleryId, [...deleted]);
    // 사진이 다 빠져 비게 된 폴더는 함께 지운다 — 세부 폴더가 전부 비면 컨셉째, 일부면 그 세부 폴더만.
    // 원래 비어 있던 폴더(작가가 만들어 둔 것)는 건드리지 않는다. 폴더 정리가 실패해도 사진 삭제는 이미 됐으니 화면은 갱신한다.
    let selectionGone = false;
    let cleanupError: unknown = null;
    try {
      for (const concept of folders ?? []) {
        const touched = concept.details.filter((d) => d.photoIds.some((id) => deleted.has(id)));
        if (touched.length === 0) continue;
        const emptied = touched.filter((d) => d.photoIds.every((id) => deleted.has(id)));
        const stillFilled = concept.details.some((d) => d.photoIds.some((id) => !deleted.has(id)));
        if (!stillFilled) {
          await deleteConceptFolder(galleryId, concept.id);
          if ((folderSel.kind === "detail" || folderSel.kind === "concept") && folderSel.conceptId === concept.id)
            selectionGone = true;
        } else {
          for (const detail of emptied) {
            await deleteDetailFolder(galleryId, concept.id, detail.id);
            if (folderSel.kind === "detail" && folderSel.detailId === detail.id) selectionGone = true;
          }
        }
      }
    } catch (err) {
      cleanupError = err;
    } finally {
      await Promise.all([refreshPhotos(), refreshFolders()]);
      if (selectionGone) setFolderSel({ kind: "all" });
      setSelected(new Set());
    }
    if (cleanupError) throw cleanupError; // 모달이 문구를 보인다 — 사진은 지워졌고 폴더만 남은 상태
    setDeletePhotosOpen(false);
  }
  async function discardPending() {
    if (discarding || recoverable.length === 0) return;
    setDiscarding(true);
    const ids = recoverable.map((p) => p.photoId);
    try {
      await deletePhotos(galleryId, ids);
      forgetUploaded(galleryId, ids);
    } catch (err) {
      // 전부-아니면-거부(404) — 화면이 낡았다는 뜻이라 다시 읽는다
      setUploadNotice(describeUploadError(err));
    } finally {
      await refreshPhotos();
      setDiscarding(false);
    }
  }
  const details = useMemo(() => folders?.flatMap((c) => c.details) ?? [], [folders]);
  const sortedIds = useMemo(() => new Set(details.flatMap((d) => d.photoIds)), [details]);
  const reviewIds = useMemo(
    () => new Set(details.filter((d) => d.needsReview).flatMap((d) => d.photoIds)),
    [details],
  );
  const reviewFolderCount = details.filter((d) => d.needsReview).length;
  const unsortedCount =
    folders && folders.length > 0 ? allPhotos.filter((p) => !sortedIds.has(p.photoId)).length : 0;
  const pickedIds = useMemo(
    () => new Set(selection?.photos.map((s) => s.photo.photoId) ?? []),
    [selection],
  );
  const pickedPhotos = useMemo(() => selection?.photos.map((s) => s.photo) ?? [], [selection]);
  const selectedCount = selection?.selectedCount ?? pickedIds.size;
  const maxSelectable = gallery?.maxSelectablePhotoCount ?? null;

  const visiblePhotos = useMemo(() => {
    // 올리는 동안은 PENDING도 회색 자리로 보여 준다(끝난 뒤 남은 PENDING은 복구 배너의 몫)
    let list = uploading ? [...allPhotos, ...pendingPhotos] : allPhotos;
    if (folderSel.kind === "detail") {
      const ids = new Set(details.find((d) => d.id === folderSel.detailId)?.photoIds ?? []);
      list = list.filter((p) => ids.has(p.photoId));
    } else if (folderSel.kind === "concept") {
      const ids = new Set(
        folders?.find((c) => c.id === folderSel.conceptId)?.details.flatMap((d) => d.photoIds) ?? [],
      );
      list = list.filter((p) => ids.has(p.photoId));
    } else if (folderSel.kind === "unsorted") {
      list = list.filter((p) => !sortedIds.has(p.photoId));
    }
    if (filter === "review") list = list.filter((p) => reviewIds.has(p.photoId));
    if (filter === "unsorted") list = list.filter((p) => !sortedIds.has(p.photoId));
    return sortPhotos(list, sort);
  }, [allPhotos, pendingPhotos, uploading, folderSel, folders, details, sortedIds, filter, reviewIds, sort]);

  const selectedDetail =
    folderSel.kind === "detail" ? details.find((d) => d.id === folderSel.detailId) ?? null : null;
  const selectedConcept =
    folderSel.kind === "detail" || folderSel.kind === "concept"
      ? folders?.find((c) => c.id === folderSel.conceptId) ?? null
      : null;

  const offset = deadlineOffset(gallery?.selectionDeadline ?? null);
  const sub: SelectSub =
    members !== null && members.length === 0
      ? "invite"
      : selection?.status === "SUBMITTED"
        ? "submitted"
        : offset !== null && offset > 0
          ? "overdue"
          : "picking";
  const dd = ddayLabel(gallery?.selectionDeadline ?? null);
  const countLabel = `${selectedCount}${maxSelectable !== null ? ` / ${maxSelectable}` : ""}`;

  // 사이드바 상태줄 — 단계 안의 하위 상태
  const status: StatusLine = (() => {
    if (photos === null) return { text: "불러오는 중…", tone: "muted" };
    if (stageIndex === 0) {
      if (uploading) return { text: `올리는 중 ${run.done} / ${run.total}`, tone: "accent" };
      if (aiCategorizing) return { text: "폴더 만드는 중", tone: "accent" };
      if (merging) return { text: "폴더 정리 중…", tone: "accent" };
      if (aiActive)
        return { text: `AI 분석 중 ${aiCounts?.scored ?? 0} / ${aiCounts?.expected ?? 0}`, tone: "accent" };
      if (aiFailed) return { text: "AI 정리 실패 · 다시 시도할 수 있어요", tone: "error" };
      if (allPhotos.length === 0) return { text: "사진 없음", tone: "muted" };
      if (!folders || folders.length === 0) return { text: `${allPhotos.length}장 · 폴더 만들기 전`, tone: "muted" };
      return reviewFolderCount > 0
        ? { text: `검토 중 · 폴더 ${details.length} · 확인 필요 ${reviewFolderCount}`, tone: "warning" }
        : { text: `검토 중 · 폴더 ${details.length}`, tone: "accent" };
    }
    if (stageIndex === 1) {
      if (sub === "invite") return { text: `초대 대기 · ${dd}`, tone: "muted" };
      if (sub === "submitted") return { text: `제출됨 · ${countLabel} · ${shortDate(selection?.submittedAt ?? null)}`, tone: "accent" };
      if (sub === "overdue") return { text: `마감 지남 · ${countLabel}`, tone: "warning" };
      return { text: `고르는 중 ${countLabel} · ${dd}`, tone: "accent" };
    }
    return { text: `${allPhotos.length}장${maxSelectable !== null ? ` · 고를 장수 ${maxSelectable}` : ""}`, tone: "accent" };
  })();

  function toggleSelect(photoId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }
  /** 지금 보고 있는 사진 전부 고르기 — 올리는 중인(PENDING) 자리는 제외 */
  const selectAllVisible = useCallback(() => {
    setSelected(new Set(visiblePhotos.filter((p) => p.status === "UPLOADED").map((p) => p.photoId)));
  }, [visiblePhotos]);
  // ⌘/Ctrl+A — 1단계 검토 화면에서, 입력란 · 모달이 아닐 때
  const anyModalOpen =
    uploadOpen || openConfirm || inviteTab !== null || extendOpen || quotaOpen || confirmKind !== null || folderModal !== null || moveOpen || deletePhotosOpen;
  useEffect(() => {
    if (inSelection || anyModalOpen || view !== "all") return;
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "a") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      selectAllVisible();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inSelection, anyModalOpen, view, selectAllVisible]);
  function changeView(next: ShellView) {
    setView(next);
    setSelected(new Set());
  }
  function changeFolder(next: FolderSelection) {
    setFolderSel(next);
    setView("all");
    setSelected(new Set());
  }
  async function dismissQuotaRequest() {
    if (!quotaRequest) return;
    try {
      await markNotificationsRead({ notificationIds: [quotaRequest.id] });
    } catch {
      // 다음 갱신 때 다시 보인다
    }
    reloadSelection();
  }

  // ── 오류 ──
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
  const canOpen = gallery?.status === "DRAFT" && !uploading && allPhotos.length > 0;
  const showFolderColumn = stageIndex === 0 && allPhotos.length > 0 && view === "all";
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
            {stageIndex === 0 && (
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
        {inSelection && (
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
            {visiblePhotos.length}장 · 고른 사진 {visiblePhotos.filter((p) => pickedIds.has(p.photoId)).length}
          </small>
        )}
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
        {stageIndex === 0 && aiActive && (
          <span className="ml-1.5 inline-flex items-center gap-1 rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-semibold-xs text-brand-secondary-dark">
            <SparkleIcon size={12} />
            {aiCategorizing ? "폴더 만드는 중" : "AI 분석 중"}
          </span>
        )}
        {inSelection && (
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
            {allPhotos.length}장{selectedCount > 0 && ` · 고른 사진 ${selectedCount}`}
          </small>
        )}
      </>
    );

  // 2단계 배너 — 장수 상향 요청 · 제출됨 · 마감 지남
  const quotaBanner =
    inSelection && quotaRequest ? (
      <div className="mx-5 mb-2 flex flex-wrap items-center gap-3 rounded-(--radius-12) bg-brand-secondary-background px-4 py-2.5 type-content-s text-contents-light-bgd-default">
        <span className="flex shrink-0 text-brand-secondary-dark">
          <CheckCircleIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="font-semibold">{quotaRequest.title}</b>
          {quotaRequest.message && <> · {quotaRequest.message}</>}
          {quotaRequest.createdAt && (
            <span className="text-contents-light-bgd-weakness"> · {shortDate(quotaRequest.createdAt)}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => void dismissQuotaRequest()}
          className="cursor-pointer type-content-xs text-contents-light-bgd-sub underline underline-offset-2"
        >
          그대로 두기
        </button>
        <button
          type="button"
          onClick={() => setQuotaOpen(true)}
          className="inline-flex h-8 cursor-pointer items-center rounded-(--radius-8) border border-brand-secondary-light px-3 type-label-medium-s text-brand-secondary-dark transition-colors duration-fast hover:bg-background-default-main"
        >
          장수 바꾸기
        </button>
      </div>
    ) : null;
  const selectionBanner =
    inSelection && view === "selected" && sub === "submitted" ? (
      <div className="mx-5 mb-2 flex items-center gap-2.5 rounded-(--radius-12) bg-brand-secondary-background px-4 py-2.5 type-content-s text-contents-light-bgd-default">
        <span className="flex text-brand-secondary-dark">
          <CheckCircleIcon size={18} />
        </span>
        <b className="font-semibold">클라이언트가 선택을 제출했어요</b> · {shortDate(selection?.submittedAt ?? null)}
      </div>
    ) : inSelection && view === "selected" && sub === "overdue" ? (
      <div className="mx-5 mb-2 flex items-center gap-2.5 rounded-(--radius-12) bg-function-warning-background px-4 py-2.5 type-content-s text-contents-light-bgd-default">
        <span className="flex text-function-warning-default">
          <ScheduleIcon size={18} />
        </span>
        <b className="font-semibold">선택 마감이 지났는데 아직 제출되지 않았어요</b> · 클라이언트는 더 고를 수 없어요
      </div>
    ) : null;

  // 하단 바 — 단계 · 하위 상태별
  const bottomHint = (() => {
    if (stageIndex === 0) {
      if (analysis.error) return analysis.error;
      if (merging) return "같은 이름의 컨셉 폴더를 하나로 합치고 있어요";
      if (uploadNotice) return uploadNotice;
      if (recoverable.length > 0)
        return `${allPhotos.length} / ${allPhotos.length + recoverable.length} 올라옴 · ${recoverable.length}장은 기다리는 중`;
      if (allPhotos.length === 0) return "원본은 그대로 보관되고 화면에는 줄인 미리보기를 써요";
      if (!folders || folders.length === 0) return "폴더는 업로드가 끝나면 AI가 만들어요";
      return reviewFolderCount > 0
        ? `폴더와 사진을 확인하고 갤러리를 열어 주세요 · "검토"는 AI가 확신이 낮은 폴더예요 · 확인 필요 ${reviewFolderCount}`
        : "폴더와 사진을 확인하고 갤러리를 열어 주세요";
    }
    if (stageIndex === 1) {
      if (sub === "invite") return "초대 링크를 보내면 클라이언트가 고를 수 있어요";
      if (sub === "submitted") return `제출 ${shortDate(selection?.submittedAt ?? null)} · 확인하면 보정 작업 단계로 넘어가요`;
      if (sub === "overdue") return "기간을 연장하면 클라이언트가 이어서 고를 수 있어요";
      return "클라이언트가 고르는 중이에요 · 제출하면 알림으로 알려 드려요";
    }
    return "이 단계 화면은 준비 중이에요";
  })();
  const lastPicked = pickedPhotos[pickedPhotos.length - 1];
  const bottomStatus =
    stageIndex === 1 && sub !== "invite" ? (
      <span className="flex items-center gap-2.5 type-content-m text-contents-light-bgd-sub">
        선택한 사진
        <b className="type-title-s text-contents-light-bgd-default tabular-nums">{selectedCount}</b>
        {maxSelectable !== null && <span className="tabular-nums">/ {maxSelectable}</span>}
        <span
          className={`size-11 overflow-hidden rounded-(--radius-8) border bg-surface-default-light ${
            sub === "overdue" ? "border-function-warning-default" : "border-divider-default"
          }`}
        >
          {lastPicked?.viewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lastPicked.viewUrl} alt="" className="size-full object-cover" />
          )}
        </span>
      </span>
    ) : null;
  // 업로드 진행 막대(하단 왼쪽) — 올리는 중 · 실패 남음
  const uploadProgress = uploading ? (
    <ProgressBar
      icon={<CloudUploadIcon size={18} />}
      title={`업로드 ${run.done} / ${run.total}`}
      ratio={run.ratio}
      sub={
        [
          run.phase === "paused" ? "일시정지" : formatEta(run.etaSeconds),
          run.failed > 0 ? `${run.failed}장 실패` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined
      }
    />
  ) : uploadFailedIdle ? (
    <span className="flex min-w-0 items-center gap-2 type-content-s text-contents-light-bgd-default">
      <span className="flex shrink-0 text-function-warning-default">
        <ErrorIcon size={18} />
      </span>
      <span className="min-w-0 truncate">
        <b className="font-semibold">{run.failed}장을 올리지 못했어요</b>
        {run.error ? ` · ${run.error}` : " · 네트워크를 확인한 뒤 다시 올려 주세요"}
      </span>
    </span>
  ) : null;
  const recoveryBanner =
    recoverable.length > 0 ? (
      <RecoveryBanner
        count={recoverable.length}
        onFiles={onRecoveryFiles}
        onDiscard={() => void discardPending()}
        discarding={discarding}
      />
    ) : null;
  const stalledNote = analysis.stalled ? "멈춘 것 같아요 · 서버가 다시 시도해요" : null;
  const aiProgress =
    stageIndex === 0 && !aiFailed && (aiActive || (uploading && aiCounts !== null && aiCounts.expected > 0)) ? (
      aiCategorizing ? (
        <ProgressBar
          icon={<SparkleIcon size={18} />}
          title="AI가 컨셉 · 세부 폴더로 나누고 있어요"
          ratio={null}
          indeterminate
          sub={stalledNote ?? "끝나면 알림으로 알려 드려요"}
        />
      ) : (
        <ProgressBar
          icon={<SparkleIcon size={18} />}
          title={`AI 분석 ${aiCounts?.scored ?? 0} / ${aiCounts?.expected ?? 0}`}
          ratio={
            aiCounts && aiCounts.expected > 0
              ? (aiCounts.embedded + aiCounts.scored) / (2 * aiCounts.expected)
              : null
          }
          sub={stalledNote ?? (aiCounts && aiCounts.embedded < aiCounts.expected ? "임베딩 · 점수" : "점수")}
        />
      )
    ) : stageIndex === 0 && aiFailed && !uploading ? (
      <span className="flex min-w-0 items-center gap-2 type-content-s text-contents-light-bgd-default">
        <span className="flex shrink-0 text-function-warning-default">
          <ErrorIcon size={18} />
        </span>
        <span className="min-w-0 truncate">
          <b className="font-semibold">AI 정리에 실패했어요</b>
          {aiJob?.error ? ` · ${aiJob.error}` : ""}
        </span>
      </span>
    ) : null;
  const aiCanMaterialize =
    aiFailed && aiCounts !== null && aiCounts.expected > 0 && aiCounts.scored >= aiCounts.expected;
  const bottomActions =
    stageIndex === 0 ? (
      uploading ? (
        <>
          <ShellCta kind="ghost" onClick={run.phase === "paused" ? resumeUpload : pauseUpload}>
            {run.phase === "paused" ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
            {run.phase === "paused" ? "계속" : "일시정지"}
          </ShellCta>
          <ShellCta kind="ghost" onClick={abortUpload}>
            취소
          </ShellCta>
        </>
      ) : (
        <>
          {uploadFailedIdle && (
            <ShellCta kind="secondary" onClick={retryFailed}>
              <RefreshIcon size={18} />
              실패 {run.failed}장 다시 올리기
            </ShellCta>
          )}
          {(aiFailed || analysis.error) && (
            <ShellCta kind="secondary" onClick={() => void analysis.request()}>
              <SparkleIcon size={18} />
              AI 정리 다시 시도
            </ShellCta>
          )}
          {aiCanMaterialize && (
            <ShellCta kind="secondary" onClick={() => void analysis.materialize()}>
              폴더 만들기
            </ShellCta>
          )}
          <ShellCta kind={allPhotos.length === 0 ? "primary" : "ghost"} onClick={() => setUploadOpen(true)}>
            <UploadIcon size={18} />
            {allPhotos.length === 0 ? "사진 업로드" : "사진 더 올리기"}
          </ShellCta>
          {allPhotos.length > 0 && (
            <ShellCta disabled={!canOpen} onClick={() => setOpenConfirm(true)}>
              갤러리 열기
            </ShellCta>
          )}
        </>
      )
    ) : stageIndex === 1 ? (
      sub === "invite" ? (
        <ShellCta onClick={() => setInviteTab("client")}>
          <PersonAddIcon size={18} />
          클라이언트 초대
        </ShellCta>
      ) : sub === "submitted" ? (
        <>
          <ShellCta kind="secondary" onClick={() => setExtendOpen(true)}>
            <ScheduleIcon size={18} />
            기간 연장
          </ShellCta>
          <ShellCta onClick={() => setConfirmKind("retouch")}>선택 확인 → 보정 작업</ShellCta>
        </>
      ) : sub === "overdue" ? (
        <>
          <ShellCta kind="secondary" onClick={() => setConfirmKind("asis")}>
            이대로 확인
          </ShellCta>
          <ShellCta onClick={() => setExtendOpen(true)}>
            <ScheduleIcon size={18} />
            기간 연장
          </ShellCta>
        </>
      ) : null
    ) : null;

  const selectedEmpty =
    sub === "invite" ? (
      <div className="grid flex-1 place-items-center px-6 py-8">
        <div className="flex w-full max-w-130 flex-col items-center gap-2 rounded-(--radius-16) border border-dashed border-border-default px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand-secondary-background text-brand-secondary-default">
            <PersonAddIcon size={28} />
          </span>
          <h3 className="mt-1 type-title-s text-contents-light-bgd-default">아직 아무도 들어오지 않았어요</h3>
          <p className="type-content-s text-contents-light-bgd-sub">
            초대 링크를 보내면 클라이언트가 회원가입 후 이 갤러리로 바로 들어와 고를 수 있어요.
          </p>
        </div>
      </div>
    ) : (
      <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
        아직 고른 사진이 없어요
      </p>
    );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <ShellTopbar
        studioName={studio?.name ?? "스튜디오"}
        studioHref={studio ? `/studio/${studio.galleryUrl}` : "/studio"}
        workspaceId={gallery?.workspaceId ?? null}
        stageLabel={gallery ? SHELL_STAGES[stageIndex] : "…"}
        deadline={gallery?.selectionDeadline ?? null}
        onInviteClick={studio ? () => setInviteTab("client") : undefined}
      />

      <div className="flex min-h-0 flex-1">
        {!collapsed && (
          <ShellSidebar
            title={gallery?.title ?? "…"}
            status={status}
            stageIndex={stageIndex}
            photoCount={allPhotos.length}
            selectedLocked={stageIndex === 0}
            selectedCount={selectedCount}
            maxSelectable={maxSelectable}
            folderTree={
              inSelection && folders && folders.length > 0 ? (
                <SidebarFolderTree
                  folders={folders}
                  pickedIds={pickedIds}
                  selection={view === "all" ? folderSel : { kind: "all" }}
                  onSelect={changeFolder}
                />
              ) : undefined
            }
            view={view}
            onViewChange={(next) => {
              changeView(next);
              setFolderSel({ kind: "all" });
            }}
          />
        )}

        {showFolderColumn && (
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
              folders && folders.length === 0 && (uploading || aiActive)
                ? aiCategorizing
                  ? { label: "만드는 중…", note: "AI가 컨셉 · 세부 폴더로 나누고 있어요. 끝나면 알림으로 알려 드려요." }
                  : {
                      label: "대기",
                      note: "폴더는 업로드가 끝나면 AI가 만들어요. 임베딩 · 점수는 올라오는 대로 매기고 있어요.",
                    }
                : null
            }
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {photos === null ? (
            <div className="flex-1" aria-busy="true" />
          ) : view === "selected" && inSelection ? (
            <>
              <ShellMainHeader
                {...headerCommon}
                sortable={false}
                title={
                  <>
                    <span className="flex text-contents-light-bgd-weakness">
                      <CheckCircleIcon size={18} />
                    </span>
                    선택한 사진
                    <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{countLabel}</small>
                  </>
                }
              />
              {quotaBanner}
              {selectionBanner}
              <div className="scrollbar-slim flex min-h-0 flex-1 flex-col overflow-y-auto">
                {pickedPhotos.length === 0 ? (
                  selectedEmpty
                ) : (
                  <PhotoGrid photos={pickedPhotos} zoom={zoom} selectedIds={selected} onToggle={() => {}} selectable={false} />
                )}
              </div>
            </>
          ) : allPhotos.length === 0 ? (
            <>
              {recoveryBanner}
              <EmptyUploadGuide />
            </>
          ) : (
            <>
              <ShellMainHeader {...headerCommon} title={allTitle} />
              {recoveryBanner}
              {quotaBanner}
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {visiblePhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
                    조건에 맞는 사진이 없어요
                  </p>
                ) : (
                  <PhotoGrid
                    photos={visiblePhotos}
                    zoom={zoom}
                    selectedIds={selected}
                    onToggle={toggleSelect}
                    markedIds={inSelection ? pickedIds : undefined}
                    selectable={!inSelection}
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
        onDeleteSelection={() => setDeletePhotosOpen(true)}
        hint={bottomHint}
        progress={
          stageIndex === 0 && (uploadProgress || aiProgress) ? (
            <>
              {uploadProgress}
              {aiProgress}
            </>
          ) : null
        }
        status={bottomStatus}
        actions={bottomActions}
      />

      {uploadOpen && (
        <UploadModal
          existingCount={photos?.length ?? 0}
          existingNames={existingNames}
          planMaxPhotoCount={gallery?.planMaxPhotoCount ?? null}
          onClose={() => setUploadOpen(false)}
          onStart={(files) => {
            setUploadOpen(false);
            setUploadNotice(null);
            void startUpload(files);
          }}
        />
      )}

      {folderModal && folderModal.kind !== "delete" && (
        <FolderNameModal
          kind={folderModal.kind === "createConcept" ? "concept" : "detail"}
          parentName={folderModal.kind === "createDetail" ? folderModal.concept.name : undefined}
          onClose={() => setFolderModal(null)}
          onSubmit={submitFolderName}
        />
      )}
      {folderModal && folderModal.kind === "delete" && (
        <FolderDeleteModal
          target={folderModal.target}
          onClose={() => setFolderModal(null)}
          onConfirm={confirmFolderDelete}
        />
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
      {deletePhotosOpen && (
        <DeletePhotosModal
          count={selected.size}
          onClose={() => setDeletePhotosOpen(false)}
          onConfirm={confirmDeletePhotos}
        />
      )}
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
      {inviteTab && gallery && studio && (
        <GalleryInviteModal
          galleryId={gallery.id}
          galleryTitle={gallery.title}
          workspaceId={gallery.workspaceId}
          studioName={studio.name}
          canInviteStudio={isOwner}
          initialTab={inviteTab}
          onClose={() => setInviteTab(null)}
          onManageMembers={() => {
            window.location.assign(
              `/settings?studio=${gallery.workspaceId}&tab=members&from=${encodeURIComponent(`/studio/gallery/${gallery.id}`)}`,
            );
          }}
        />
      )}
      {extendOpen && gallery && (
        <ExtendDeadlineModal
          gallery={gallery}
          selectedCount={selectedCount}
          submitted={selection?.status === "SUBMITTED"}
          onClose={() => setExtendOpen(false)}
          onDone={(updated) => {
            setGallery(updated);
            setExtendOpen(false);
            reloadSelection();
          }}
        />
      )}
      {quotaOpen && gallery && (
        <ChangeQuotaModal
          gallery={gallery}
          selectedCount={selectedCount}
          requestMessage={quotaRequest ? `${quotaRequest.title}${quotaRequest.message ? ` · ${quotaRequest.message}` : ""}` : null}
          onClose={() => setQuotaOpen(false)}
          onDone={(updated) => {
            setGallery(updated);
            setQuotaOpen(false);
            void dismissQuotaRequest();
          }}
        />
      )}
      {confirmKind && (
        <StageConfirmModal
          kind={confirmKind}
          selectedCount={selectedCount}
          maxCount={maxSelectable}
          retouchCount={null}
          onClose={() => setConfirmKind(null)}
          onConfirm={() => {
            setConfirmKind(null);
            showComingSoon();
          }}
        />
      )}
      {comingSoonToast}
    </div>
  );
}
