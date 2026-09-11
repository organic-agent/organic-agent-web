"use client";

/**
 * 작가 — 갤러리 셸 v2 (구조 확정 2026-09-11 · 1단계 사진 업로드 · 2단계 셀렉 대기)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/page.tsx
 *
 * 상단 한 줄 · 사이드바(접힘 가능) · 폴더 열(1단계만) · 메인(헤더 + 그리드) · 하단 바(주 버튼).
 * B1 = 화면 구성: 갤러리 · 사진 · 폴더 · 선택 앨범은 읽고, 갤러리 열기 · 기간 연장 · 장수 바꾸기 ·
 * 초대 링크처럼 작은 쓰기만 한다. B2 = 업로드(useUploadRun · UploadModal · 하단 진행 막대) · AI 분석 ·
 * 폴더 편집 · 사진 삭제.
 * 셀렉 완료 → 보정 작업 전환은 서버 방법 확인 전이라 확인 모달까지만.
 *
 * 개발 서버 전용 장치(배포 빌드에서는 코드가 빠진다):
 *  - ?stage=N : 단계 화면 강제(1~5) — 레이아웃 확인용. C2 끝날 때 남길지 결정.
 *  - 사진 0장에서도 "갤러리 열기" 허용 — 업로드(B2)가 없어 만든 우회. **삭제 시점: B2 머지 뒤.**
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  UploadIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { ANALYSIS_JOB_ALREADY_ACTIVE, requestAnalysis } from "@/lib/api/analysis";
import { ApiError } from "@/lib/api/client";
import { listConceptFolders, type ConceptFolderResponse } from "@/lib/api/conceptFolders";
import {
  getGallery,
  listGalleryMembers,
  type GalleryMemberResponse,
  type GalleryResponse,
} from "@/lib/api/galleries";
import { markNotificationsRead } from "@/lib/api/notifications";
import { listPhotos, type PhotoResponse } from "@/lib/api/photos";
import { fetchStudio, type StudioResponse } from "@/lib/api/studios";
import { ChangeQuotaModal } from "./_shell/ChangeQuotaModal";
import { EmptyUploadGuide } from "./_shell/EmptyUploadGuide";
import { ExtendDeadlineModal } from "./_shell/ExtendDeadlineModal";
import { FolderColumn, ReviewBadge, type FolderSelection } from "./_shell/FolderColumn";
import { GalleryInviteModal, type InviteTab } from "./_shell/GalleryInviteModal";
import { OpenGalleryModal } from "./_shell/OpenGalleryModal";
import { PhotoGrid } from "./_shell/PhotoGrid";
import { ShellBottomBar, ShellCta } from "./_shell/ShellBottomBar";
import { ShellMainHeader, type FilterKey, type SortKey } from "./_shell/ShellMainHeader";
import { ShellSidebar, type ShellView, type StatusLine } from "./_shell/ShellSidebar";
import { ShellTopbar } from "./_shell/ShellTopbar";
import { SidebarFolderTree } from "./_shell/SidebarFolderTree";
import { StageConfirmModal } from "./_shell/StageConfirmModal";
import { SHELL_STAGES, stageIndexOf } from "./_shell/stages";
import { UploadModal } from "./_shell/UploadModal";
import { ProgressBar } from "./_shell/UploadProgress";
import { describeUploadError, formatEta } from "./_shell/uploadSupport";
import { useSelectionWatch } from "./_shell/useSelectionWatch";
import { useUploadRun } from "./_shell/useUploadRun";

const DEV = process.env.NODE_ENV === "development";

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
  const searchParams = useSearchParams();
  const { collapsed } = useSidebar();
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  const [gallery, setGallery] = useState<GalleryResponse | null>(null);
  const [studio, setStudio] = useState<StudioResponse | null>(null);
  const [photos, setPhotos] = useState<PhotoResponse[] | null>(null);
  const [folders, setFolders] = useState<ConceptFolderResponse[] | null>(null);
  const [members, setMembers] = useState<GalleryMemberResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<ShellView>("all");
  const [folderSel, setFolderSel] = useState<FolderSelection>({ kind: "all" });
  const [zoom, setZoom] = useState(40);
  const [sort, setSort] = useState<SortKey>("uploaded");
  const [filter, setFilter] = useState<FilterKey>("none");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [openConfirm, setOpenConfirm] = useState(false);
  const [inviteTab, setInviteTab] = useState<InviteTab | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"retouch" | "asis" | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
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
  const refreshPhotos = useCallback(async () => {
    try {
      setPhotos(await listAllPhotos(galleryId));
    } catch {
      // 다음 갱신 때 다시
    }
  }, [galleryId]);

  // ── 업로드 실행기 ──
  // 큐가 비면 분석 잡을 요청한다 — 잡 없이는 폴더가 생기지 않는다. 진행 감시(폴링)는 3단계에서 붙는다.
  const startAnalysis = useCallback(async () => {
    try {
      await requestAnalysis(galleryId);
    } catch (err) {
      if (err instanceof ApiError && err.code === ANALYSIS_JOB_ALREADY_ACTIVE) return; // 도는 잡이 새 사진을 흡수한다
      setUploadNotice(describeUploadError(err));
    }
  }, [galleryId]);
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
      if (done > 0) void startAnalysis();
      if (failed === 0) resetUpload();
    },
  });
  const uploading = run.phase === "running" || run.phase === "paused";
  const uploadFailedIdle = run.phase === "finished" && !run.aborted && run.failed > 0;

  // ── 단계 ──
  const stageOverride = DEV ? Number(searchParams.get("stage")) : NaN;
  const stageIndex = gallery
    ? Number.isInteger(stageOverride) && stageOverride >= 1 && stageOverride <= SHELL_STAGES.length
      ? stageOverride - 1
      : stageIndexOf(gallery)
    : 0;
  const inSelection = gallery !== null && stageIndex >= 1;

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
    } else if (folderSel.kind === "unsorted") {
      list = list.filter((p) => !sortedIds.has(p.photoId));
    }
    if (filter === "review") list = list.filter((p) => reviewIds.has(p.photoId));
    if (filter === "unsorted") list = list.filter((p) => !sortedIds.has(p.photoId));
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName, "ko"));
    else sorted.sort((a, b) => a.displayOrder - b.displayOrder || a.photoId - b.photoId);
    return sorted;
  }, [allPhotos, pendingPhotos, uploading, folderSel, details, sortedIds, filter, reviewIds, sort]);

  const selectedDetail =
    folderSel.kind === "detail" ? details.find((d) => d.id === folderSel.detailId) ?? null : null;
  const selectedConcept =
    folderSel.kind === "detail" ? folders?.find((c) => c.id === folderSel.conceptId) ?? null : null;

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
  // 개발 서버에서는 사진 0장이어도 열 수 있게 — 업로드(B2) 전 임시 우회. 삭제 시점: B2 머지 뒤.
  const canOpen = gallery?.status === "DRAFT" && !uploading && (allPhotos.length > 0 || DEV);
  const showFolderColumn = stageIndex === 0 && allPhotos.length > 0 && view === "all";
  const headerCommon = {
    zoom,
    onZoomChange: setZoom,
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
        {selectedDetail.needsReview && <ReviewBadge />}
        {inSelection && (
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
            {visiblePhotos.length}장 · 고른 사진 {visiblePhotos.filter((p) => pickedIds.has(p.photoId)).length}
          </small>
        )}
      </>
    ) : folderSel.kind === "unsorted" ? (
      <>미분류</>
    ) : (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
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
      if (uploadNotice) return uploadNotice;
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
          <ShellCta kind={allPhotos.length === 0 ? "primary" : "ghost"} onClick={() => setUploadOpen(true)}>
            <UploadIcon size={18} />
            {allPhotos.length === 0 ? "사진 업로드" : "사진 더 올리기"}
          </ShellCta>
          {(allPhotos.length > 0 || DEV) && (
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
              if (next !== "all") setFolderSel({ kind: "all" });
              else setFolderSel({ kind: "all" });
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
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {pickedPhotos.length === 0 ? (
                  selectedEmpty
                ) : (
                  <PhotoGrid photos={pickedPhotos} zoom={zoom} selectedIds={selected} onToggle={() => {}} selectable={false} />
                )}
              </div>
            </>
          ) : allPhotos.length === 0 ? (
            <EmptyUploadGuide />
          ) : (
            <>
              <ShellMainHeader {...headerCommon} title={allTitle} />
              {quotaBanner}
              <div className="min-h-0 flex-1 overflow-y-auto">
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
        onClearSelection={() => setSelected(new Set())}
        onMoveSelection={showComingSoon}
        onDeleteSelection={showComingSoon}
        hint={bottomHint}
        progress={stageIndex === 0 ? uploadProgress : null}
        status={bottomStatus}
        actions={bottomActions}
      />

      {uploadOpen && (
        <UploadModal
          existingCount={photos?.length ?? 0}
          planMaxPhotoCount={gallery?.planMaxPhotoCount ?? null}
          onClose={() => setUploadOpen(false)}
          onStart={(files) => {
            setUploadOpen(false);
            setUploadNotice(null);
            void startUpload(files);
          }}
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
