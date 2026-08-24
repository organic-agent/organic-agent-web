"use client";

/**
 * 작가 — 갤러리 워크스페이스 (피그마 Photographer/Gallery-Sidebar 대응)
 * 위치: src/app/(photographer)/galleries/[galleryId]/page.tsx
 *
 * 부부 워크스페이스와 같은 뷰 4종(그리드 라지/스몰·비교·싱글)을 공유하되 껍데기가 다르다:
 * - 풀와이드 탑바: 사이드바 토글 + 로고(홈 복귀) + 뷰 전환 + 줌 | 전달 완료 버튼(조건부) + 알림 + 초대 + 프로필
 * - 사이드바: 갤러리명·상태 칩 + 상태 전환(열기/마감/재오픈) + 사진 업로드 + 자동 분류 + 필터 + 앨범
 * - 별점·선택은 부부의 것이라 전부 읽기 전용, 하단 툴바는 비교·싱글 뷰에서만
 * - 부부가 셀렉을 제출(SUBMITTED)하면 "선택 다시 열기"로 되돌릴 수 있다(작가 전용)
 * - 우측 레일: 댓글(부부 보정 요청 포함) · 정보(파일 정보만)
 *
 * 갤러리 메타·사진·선택 현황·별점은 서버가 진실이고,
 * 업로드·전달 데모 플래그만 아직 목업(07 보정에서 서버 전환)이다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppRightRail } from "@/components/app/AppRightRail";
import { AppToolbar } from "@/components/app/AppToolbar";
import {
  FilmstripChip,
  useFilmstripOpen,
} from "@/components/app/FilmstripChip";
import { AssistPanel } from "@/components/app/AssistPanel";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { NotificationBell } from "@/components/app/NotificationBell";
import { InfoPanel } from "@/components/app/InfoPanel";
import { ReactionPanel } from "@/components/app/ReactionPanel";
import { ZoomSelect, type ZoomLevel } from "@/components/app/ZoomSelect";
import { BrandLogo } from "@/components/BrandLogo";
import { ComparePhotoCard } from "@/components/gallery/ComparePhotoCard";
import { PhotoCell } from "@/components/gallery/PhotoCell";
import { PhotoThumbnail } from "@/components/gallery/PhotoThumbnail";
import {
  CompareIcon,
  DropdownIcon,
  GridLargeIcon,
  GridSmallIcon,
  InfoIcon,
  MenuIcon,
  PhotoIcon,
  ReactionIcon,
  ShareIcon,
  SingleViewIcon,
  SortIcon,
  UploadIcon,
} from "@/components/icons";
import { useSidebar } from "@/components/SidebarProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/MenuItem";
import { StarRating } from "@/components/ui/StarRating";
import { GalleryStatusChip } from "@/components/photographer/GalleryStatusChip";
import {
  EMPTY_REACTION,
  usePhotoReactions,
  useRetouchRequests,
} from "@/lib/couple";
import { ApiError } from "@/lib/api/client";
import { withdrawSelection } from "@/lib/api/selection";
import {
  deleteFolder,
  deleteFolderGroup,
  movePhotosToFolder,
  removePhotoFromFolder,
  renameFolder,
  renameFolderGroup,
} from "@/lib/api/folders";
import { updateGallery, useGalleries } from "@/lib/galleries";
import { useStudioInfo } from "@/lib/studio";
import { AlbumTreeSection } from "./_components/AlbumTreeSection";
import { ClusterStackCell } from "./_components/ClusterStackCell";
import { DeleteFolderModal } from "./_components/DeleteFolderModal";
import { GalleryDeliveryConfirmModal } from "./_components/GalleryDeliveryConfirmModal";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "../_components/GalleryModalShell";
import { GalleryInviteModal } from "./_components/GalleryInviteModal";
import { PhotoContextMenu } from "./_components/PhotoContextMenu";
import { SaveAlbumModal } from "./_components/SaveAlbumModal";
import { SelectionActionBar } from "./_components/SelectionActionBar";
import {
  CloseGalleryConfirmModal,
  OpenGalleryConfirmModal,
  ReopenGalleryModal,
} from "./_components/GalleryStatusModals";
import { GalleryUploadModal } from "./_components/GalleryUploadModal";
import { useClusterPreview } from "./_lib/useClusterPreview";
import { useEmbeddingProgress } from "./_lib/useEmbeddingProgress";
import { useFolderGroups } from "./_lib/useFolderGroups";
import { useFolderPhotos } from "./_lib/useFolderPhotos";
import { useGalleryDetail } from "./_lib/useGalleryDetail";
import { useSelectionOverview } from "./_lib/useSelectionOverview";
import { useGalleryPhotos } from "@/lib/galleryPhotos";

// AI 연동 전 mock (시안 문구 — 부부 워크스페이스와 동일)
const MOCK_ANALYSIS = [
  { label: "피사체 선명도", value: "88점" },
  { label: "눈 선명도", value: "100점" },
  { label: "눈 뜨기", value: "좋음" },
];

/** 사이드바 필터: 모든 사진 / 부부 선택 사진 / 특정 폴더("album:groupId:folderId") */
type GalleryView = "all" | "selected" | `album:${string}`;
type ViewMode = "grid-large" | "grid-small" | "single" | "compare";

export default function PhotographerGalleryWorkspacePage() {
  const params = useParams<{ galleryId: string }>();
  // 갤러리 메타(제목·상태·마감일·계약 장수)는 서버가 진실
  const { result, reload, replace } = useGalleryDetail(params.galleryId);
  // 업로드·전달 데모 플래그는 아직 레거시 스토어 몫(04·07에서 서버 전환) — 없으면 감춘다
  const galleries = useGalleries();
  const legacy = galleries.find((g) => g.id === params.galleryId);
  const studio = useStudioInfo();
  const { collapsed, toggle } = useSidebar();
  // 정렬(별점 순)은 기획만 있고 미구현 — 준비 중 토스트로 안내 (부부 화면과 동일)
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  const [view, setView] = useState<GalleryView>("all");
  const [mode, setMode] = useState<ViewMode>("grid-large");
  const [currentPhotoId, setCurrentPhotoId] = useState<number | null>(null);
  const [rightPanel, setRightPanel] = useState<"reaction" | "info" | null>(
    null,
  );
  const [compareCount, setCompareCount] = useState<2 | 4>(2);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  // 상태 전환 다이얼로그 — DRAFT→열기 / OPEN→선택 마감 / CLOSED→재오픈
  const [statusAction, setStatusAction] = useState<
    "open" | "close" | "reopen" | null
  >(null);
  // 제출 되돌리기(withdraw) 확인 — 부부가 제출한 선택을 다시 연다
  const [reopenSelectionOpen, setReopenSelectionOpen] = useState(false);
  // 자동 분류(클러스터) 미리보기 — 켜짐·레벨은 훅이 소유, 묶기는 서버가 한다
  const cluster = useClusterPreview(params.galleryId);
  // 앨범(폴더) 목록 — 사이드바 트리의 데이터 원천, 저장 성공 시 재조회
  const { result: folderGroupsResult, reload: reloadFolderGroups } =
    useFolderGroups(params.galleryId);
  // 미리보기에서 연 묶음 — null이면 접힌 스택 그리드
  const [openClusterIndex, setOpenClusterIndex] = useState<number | null>(null);
  const [saveAlbumOpen, setSaveAlbumOpen] = useState(false);
  // 앨범 저장 완료 토스트 (하단 검정 pill — ComingSoonToast와 같은 문법)
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const savedToastTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(savedToastTimer.current), []);
  // 폴더 열람의 다중 선택(관리용) — 탐색기 문법(클릭·Shift·⌘), 표시는 딤.
  // selectedIds(부부 셀렉)와 다른 것이라 pickedIds로 구분한다.
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [lastSelIndex, setLastSelIndex] = useState<number | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  // 삭제 확인 대상 (앨범/폴더 공용)
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "group" | "folder";
    groupId: number;
    folderId?: number;
    name: string;
  } | null>(null);
  // 사진 드래그 출발지 — 트리의 같은 앨범 다른 폴더가 드롭 대상이 된다
  const [dragSource, setDragSource] = useState<{
    groupId: number;
    folderId: number;
  } | null>(null);

  function clearSelection() {
    setPickedIds([]);
    setLastSelIndex(null);
    setCtxMenu(null);
  }

  // 부부 선택 현황 — 서버(GET /photo-selection)가 진실, 작가는 관찰만
  const { result: selectionResult, replace: replaceSelection } =
    useSelectionOverview(params.galleryId);
  const selection =
    selectionResult?.kind === "ready" ? selectionResult.sel : null;
  const selectedIds = useMemo(() => selection?.selectedIds ?? [], [selection]);
  const retouchRequests = useRetouchRequests();
  const reactions = usePhotoReactions();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  // 사진은 서버가 진실 — viewUrl(서명 URL)로 그리고, TTL 만료 전 재조회한다
  const {
    result: photosResult,
    reload: reloadPhotos,
    refreshOnImageError,
    silentRefresh: silentRefreshPhotos,
  } = useGalleryPhotos(params.galleryId);
  // 사진 분석(임베딩) — UI 없이 자동 실행·폴링, 진행분만큼 준비 중 셀이 실사진으로.
  // 새로 분석된 사진은 클러스터에도 합류해야 하므로 미리보기도 조용히 재조회한다.
  const { notifyUploaded: notifyEmbedding } = useEmbeddingProgress(
    params.galleryId,
    () => {
      silentRefreshPhotos();
      cluster.refresh();
    },
  );
  const allPhotos = useMemo(
    () => (photosResult?.kind === "ready" ? photosResult.photos : []),
    [photosResult],
  );
  // 열람 중인 폴더 — view "album:groupId:folderId"에서 파싱
  const folderView = useMemo(() => {
    if (!view.startsWith("album:")) return null;
    const [groupId, folderId] = view.slice("album:".length).split(":");
    return { groupId: Number(groupId), folderId: Number(folderId) };
  }, [view]);
  const { result: folderPhotosResult, reload: reloadFolderPhotos } =
    useFolderPhotos(params.galleryId, folderView);
  // 다른 폴더의 지난 응답이 얹히지 않게 — 현재 폴더와 일치할 때만 사용
  const activeFolderPhotos =
    folderView &&
    folderPhotosResult &&
    folderPhotosResult.groupId === folderView.groupId &&
    folderPhotosResult.folderId === folderView.folderId
      ? folderPhotosResult
      : null;
  const folderGroupsReady =
    folderGroupsResult?.kind === "ready" ? folderGroupsResult.groups : [];
  const activeGroupMeta = folderView
    ? folderGroupsReady.find((g) => g.groupId === folderView.groupId)
    : undefined;
  const activeFolderMeta = folderView
    ? activeGroupMeta?.folders.find(
        (f) => f.folderId === folderView.folderId,
      )
    : undefined;
  // 이동 대상 — 같은 앨범의 다른 폴더들 (액션 바·우클릭·드래그가 공유)
  const moveTargets =
    folderView && activeGroupMeta
      ? activeGroupMeta.folders
          .filter((f) => f.folderId !== folderView.folderId)
          .map((f) => ({ folderId: f.folderId, name: f.name }))
      : [];

  // 클러스터 미리보기 파생값 — 켜져 있고 조회가 끝났을 때만
  const clusterReady =
    cluster.enabled && cluster.result?.kind === "ready" ? cluster.result : null;
  const clusterGroups = clusterReady?.groups ?? [];
  const clusterSingles = clusterReady?.singles ?? [];
  // 미리보기에서 연 묶음 — 재조회로 묶음 수가 줄면 자연히 접힌 화면으로 돌아간다
  const openClusterGroup =
    cluster.enabled && view === "all" && openClusterIndex !== null
      ? clusterGroups[openClusterIndex]
      : undefined;
  // 접힌 미리보기(스택 그리드) 상태 — 싱글·비교의 이동 목록은 나머지 사진들
  const collapsedPreview =
    cluster.enabled && view === "all" && !openClusterGroup;
  // "분석 중" 안내는 화면에 있는 사진 기준 — 서버 unclassified는 올리다 만
  // PENDING 잔재까지 세서 실제보다 커질 수 있다
  const preparingCount = allPhotos.filter((photo) => photo.preparing).length;

  const photos =
    view === "selected"
      ? allPhotos.filter((photo) => selectedSet.has(photo.id))
      : folderView
        ? activeFolderPhotos?.kind === "ready"
          ? activeFolderPhotos.photos
          : []
        : openClusterGroup
          ? openClusterGroup
          : collapsedPreview && clusterReady
            ? clusterSingles
            : allPhotos;

  const currentIndex = photos.findIndex((p) => p.id === currentPhotoId);
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : undefined;
  // 필름스트립 접기 (C안: 헤더 칩으로 흡수 — localStorage에 기억, 부부 화면과 공유)
  const { filmstripOpen, toggleFilmstrip } = useFilmstripOpen();

  function openPhoto(photoId: number) {
    setCurrentPhotoId(photoId);
    setMode("single");
  }

  function movePhoto(delta: number) {
    if (photos.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : 0;
    const next = Math.min(Math.max(base + delta, 0), photos.length - 1);
    setCurrentPhotoId(photos[next].id);
  }

  // 단일·비교 보기에서 ←/→ 키로 사진 이동, F로 필름스트립 접기
  useEffect(() => {
    if (mode !== "single" && mode !== "compare") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") movePhoto(-1);
      if (e.key === "ArrowRight") movePhoto(1);
      if (e.key === "f" || e.key === "F") toggleFilmstrip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Esc — 폴더 열람의 선택·우클릭 메뉴 해제
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (pickedIds.length > 0 || ctxMenu !== null) clearSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // 서버 조회 결과별 화면 — 로딩 / 권한 없음(403) / 없음(404) / 실패
  if (result === null || result.kind !== "ready") {
    const state =
      result === null
        ? {
            title: "갤러리를 불러오는 중이에요",
            desc: "잠시만 기다려 주세요.",
            retry: false,
          }
        : result.kind === "forbidden"
          ? {
              title: "이 갤러리를 볼 권한이 없어요",
              desc: "담당 작가의 갤러리만 열 수 있어요.",
              retry: false,
            }
          : result.kind === "notFound"
            ? {
                title: "갤러리를 찾을 수 없어요",
                desc: "휴지통으로 이동했거나 주소가 잘못됐을 수 있어요.",
                retry: false,
              }
            : {
                title: "갤러리를 불러오지 못했어요",
                desc: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
                retry: true,
              };
    return (
      <div className="grid min-h-dvh place-items-center bg-bg-layer-default px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="type-heading-card text-fg-neutral">{state.title}</h1>
          <p className="type-body-medium text-fg-neutral-muted">{state.desc}</p>
          {result !== null && (
            <div className="flex gap-2">
              {state.retry && <Button onClick={reload}>다시 시도</Button>}
              <Button kind={state.retry ? "ghost" : "primary"} href="/galleries">
                갤러리 목록으로
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const gallery = result.gallery;

  // 하단 알림 토스트 — 저장·이름 변경의 성공/실패 공용
  function notice(message: string) {
    window.clearTimeout(savedToastTimer.current);
    setSavedToast(message);
    savedToastTimer.current = window.setTimeout(() => setSavedToast(null), 2400);
  }

  /** 선택 다시 열기(withdraw) — 담당 작가만. 부부가 이어서 고를 수 있게 된다 */
  async function handleReopenSelection() {
    try {
      const res = await withdrawSelection(gallery.id);
      replaceSelection(res);
      setReopenSelectionOpen(false);
      notice("선택이 다시 열렸어요 — 부부가 이어서 고를 수 있어요");
    } catch (err) {
      setReopenSelectionOpen(false);
      notice(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  async function handleRenameGroup(groupId: number, name: string) {
    try {
      await renameFolderGroup(gallery.id, groupId, name);
      reloadFolderGroups();
      notice("앨범 이름을 바꿨어요");
    } catch (err) {
      notice(
        err instanceof ApiError
          ? err.message
          : "이름을 바꾸지 못했어요 — 네트워크를 확인해 주세요.",
      );
    }
  }

  async function handleRenameFolder(
    groupId: number,
    folderId: number,
    name: string,
  ) {
    try {
      await renameFolder(gallery.id, groupId, folderId, name);
      reloadFolderGroups();
      notice("폴더 이름을 바꿨어요");
    } catch (err) {
      notice(
        err instanceof ApiError
          ? err.message
          : "이름을 바꾸지 못했어요 — 네트워크를 확인해 주세요.",
      );
    }
  }

  /** 폴더 열람 그리드 — 탐색기 문법: 클릭=한 장, Shift=범위, ⌘/Ctrl=추가·해제 */
  function handleSelectClick(
    e: React.MouseEvent,
    photoId: number,
    index: number,
  ) {
    setCurrentPhotoId(photoId);
    if (e.shiftKey && lastSelIndex !== null) {
      const from = Math.min(lastSelIndex, index);
      const to = Math.max(lastSelIndex, index);
      const range = photos.slice(from, to + 1).map((p) => p.id);
      setPickedIds((prev) => Array.from(new Set([...prev, ...range])));
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      setPickedIds((prev) =>
        prev.includes(photoId)
          ? prev.filter((id) => id !== photoId)
          : [...prev, photoId],
      );
    } else {
      // 같은 한 장을 다시 누르면 해제
      setPickedIds((prev) =>
        prev.length === 1 && prev[0] === photoId ? [] : [photoId],
      );
    }
    setLastSelIndex(index);
  }

  async function handleMoveSelection(targetFolderId: number) {
    if (!folderView || pickedIds.length === 0) return;
    const count = pickedIds.length;
    const target = activeGroupMeta?.folders.find(
      (f) => f.folderId === targetFolderId,
    );
    try {
      await movePhotosToFolder(gallery.id, folderView.groupId, folderView.folderId, {
        targetFolderId,
        photoIds: pickedIds,
      });
      notice(`${count}장을 '${target?.name ?? "폴더"}'(으)로 옮겼어요`);
      clearSelection();
      reloadFolderPhotos();
      reloadFolderGroups();
    } catch (err) {
      notice(
        err instanceof ApiError
          ? err.message
          : "옮기지 못했어요 — 네트워크를 확인해 주세요.",
      );
    }
  }

  async function handleRemoveSelection() {
    if (!folderView || pickedIds.length === 0) return;
    const count = pickedIds.length;
    try {
      // 제거는 장당 한 번 — 서버 계약이 단건 DELETE다
      await Promise.all(
        pickedIds.map((photoId) =>
          removePhotoFromFolder(
            gallery.id,
            folderView.groupId,
            folderView.folderId,
            photoId,
          ),
        ),
      );
      notice(`${count}장을 폴더에서 뺐어요 — 사진 원본은 그대로예요`);
    } catch (err) {
      notice(
        err instanceof ApiError
          ? err.message
          : "일부 사진을 빼지 못했어요 — 다시 시도해 주세요.",
      );
    }
    clearSelection();
    reloadFolderPhotos();
    reloadFolderGroups();
  }

  /** 삭제 확정 — 실패 시 throw해 모달이 배너를 보여주게 둔다 */
  async function handleDeleteTarget() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "group") {
      await deleteFolderGroup(gallery.id, deleteTarget.groupId);
    } else {
      await deleteFolder(
        gallery.id,
        deleteTarget.groupId,
        deleteTarget.folderId!,
      );
    }
    // 열람 중이던 대상이 지워졌으면 모든 사진으로 복귀
    if (
      folderView &&
      folderView.groupId === deleteTarget.groupId &&
      (deleteTarget.kind === "group" ||
        folderView.folderId === deleteTarget.folderId)
    ) {
      setView("all");
    }
    setDeleteTarget(null);
    clearSelection();
    reloadFolderGroups();
    notice(
      deleteTarget.kind === "group" ? "앨범을 삭제했어요" : "폴더를 삭제했어요",
    );
  }

  const title =
    view === "selected"
      ? "선택 사진"
      : folderView
        ? // 이름은 트리(목록)가 먼저 — 이름 변경 직후에도 새 이름이 바로 보인다
          `${activeGroupMeta?.name ?? "앨범"} / ${activeFolderMeta?.name ?? (activeFolderPhotos?.kind === "ready" ? activeFolderPhotos.name : "폴더")}`
        : "모든 사진";

  // 비교 모드: 현재 위치부터 compareCount장 (부부 워크스페이스와 같은 계산)
  const compareStart = Math.max(
    0,
    Math.min(
      currentIndex >= 0 ? currentIndex : 0,
      photos.length - compareCount,
    ),
  );
  const comparePhotos = photos.slice(compareStart, compareStart + compareCount);
  const compareImageWidth = `min(calc((100cqh - 36px) * 0.8), calc((100cqw - ${
    (compareCount - 1) * 24
  }px) / ${compareCount}))`;

  // 그리드 공용 조각 — 일반 목록·폴더 열람이 같은 셀 그리드를 쓴다
  const gridTemplateColumns = `repeat(auto-fill, ${Math.round(
    (mode === "grid-small" ? 160 : 200) * zoom,
  )}px)`;
  const gridSkeleton = (
    <div
      className="grid w-full justify-center gap-2"
      style={{ gridTemplateColumns }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="aspect-4/5 w-full rounded-(--radius-4) bg-bg-disabled"
        />
      ))}
    </div>
  );
  const photoCellGrid = (
    <div
      className="grid w-full justify-center gap-2"
      style={{ gridTemplateColumns }}
    >
      {photos.map((photo) => (
        <PhotoCell
          key={photo.id}
          onClick={() => setCurrentPhotoId(photo.id)}
          variant={mode === "grid-small" ? "small" : "large"}
          focused={photo.id === currentPhoto?.id}
          name={photo.name}
          format={photo.format}
          label={photo.name}
          imageUrl={photo.url}
          preparing={photo.preparing}
          onImageError={refreshOnImageError}
        />
      ))}
    </div>
  );

  // 뷰 전환 토글 — 그리드에선 헤더 우측, 싱글·비교에선 필름스트립 우측 (구글 포토식)
  const viewToggles = (
    <>
      <IconButton
        icon={<GridLargeIcon size={20} />}
        selected={mode === "grid-large"}
        onClick={() => setMode("grid-large")}
        aria-label="큰 그리드 보기"
      />
      <IconButton
        icon={<GridSmallIcon size={20} />}
        selected={mode === "grid-small"}
        onClick={() => setMode("grid-small")}
        aria-label="작은 그리드 보기"
      />
      <IconButton
        icon={<CompareIcon size={20} />}
        selected={mode === "compare"}
        onClick={() => setMode("compare")}
        aria-label="비교 보기"
      />
      <IconButton
        icon={<SingleViewIcon size={20} />}
        selected={mode === "single"}
        onClick={() => {
          const target = currentPhoto?.id ?? photos[0]?.id ?? allPhotos[0]?.id;
          if (target !== undefined) openPhoto(target);
        }}
        aria-label="한 장씩 보기"
      />
    </>
  );

  // 높이는 화면에 비례(clamp 64~96px)해 작은 화면에서 사진 몫을 지킨다
  const filmstrip = (
    <div className="flex h-[clamp(64px,12dvh,96px)] shrink-0 items-center gap-1 overflow-x-auto border-b border-stroke-neutral-muted bg-bg-layer-default px-3 py-2">
      {collapsedPreview && clusterReady ? (
        // 폴더 미리보기 — 스트립도 폴더(대표+장수 뱃지)와 나머지 사진으로.
        // 폴더 칩을 누르면 그 폴더를 열고, 나머지는 그대로 이동한다.
        <>
          {clusterGroups.map((group, index) => (
            <PhotoThumbnail
              key={`group-${group[0].id}`}
              onClick={() => {
                setOpenClusterIndex(index);
                setCurrentPhotoId(group[0].id);
              }}
              label={`폴더 ${index + 1} — ${group.length}장`}
              badge={`${group.length}장`}
              imageUrl={group[0].url}
              onImageError={refreshOnImageError}
            />
          ))}
          {clusterSingles.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              onClick={() => setCurrentPhotoId(photo.id)}
              label={photo.name}
              selected={photo.id === currentPhoto?.id}
              imageUrl={photo.url}
              preparing={photo.preparing}
              onImageError={refreshOnImageError}
            />
          ))}
        </>
      ) : (
        photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            onClick={() => setCurrentPhotoId(photo.id)}
            label={photo.name}
            selected={photo.id === currentPhoto?.id}
            imageUrl={photo.url}
            preparing={photo.preparing}
            onImageError={refreshOnImageError}
          />
        ))
      )}
    </div>
  );

  // 콘텐츠 헤더 — 모든 뷰 공통. 도구가 항상 같은 자리에 있다 (부부 화면과 동일 구조).
  // 뷰 4버튼은 클러스터 맨 오른쪽 고정, 뷰에 따라 생기는 줌은 그 왼쪽에 끼어 토글이 안 움직인다.
  const contentHeader = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-fg-neutral">
        <PhotoIcon size={20} />
        <h2 className="type-body-medium text-fg-neutral">{title}</h2>
      </div>
      <div className="flex items-center gap-1">
        {/* 별점 순 정렬 예정 — 구현 전까지 준비 중 안내 */}
        <IconButton
          icon={<SortIcon size={20} />}
          onClick={showComingSoon}
          aria-label="정렬"
        />
        {(mode === "grid-large" || mode === "grid-small") && (
          <div className="mx-1">
            <ZoomSelect value={zoom} onChange={setZoom} direction="down" />
          </div>
        )}
        {(mode === "single" || mode === "compare") && (
          <div className="mx-1">
            <FilmstripChip
              open={filmstripOpen}
              position={(currentIndex >= 0 ? currentIndex : 0) + 1}
              total={photos.length}
              onToggle={toggleFilmstrip}
            />
          </div>
        )}
        {viewToggles}
        <p className="ml-2 type-body-small text-fg-neutral-muted">
          {collapsedPreview && clusterReady
            ? `폴더 ${clusterGroups.length}개 · 나머지 사진 ${clusterSingles.length}장`
            : `${photos.length}/${allPhotos.length} 장의 사진`}
        </p>
      </div>
    </div>
  );

  // 패널이 보여줄 사진 (단일 보기의 현재 사진, 그리드에선 목록 첫 사진)
  const panelPhoto = currentPhoto ?? photos[0];
  const panelFileInfo = panelPhoto
    ? [
        { label: "파일 이름", value: panelPhoto.name },
        // 촬영 일시·크기는 사진 메타 API 확장 전까지 표기 보류
        { label: "형식", value: panelPhoto.format || "-" },
        {
          label: "앨범",
          value: folderView ? (activeGroupMeta?.name ?? "-") : "-",
        },
        {
          label: "부부 별점",
          value: `${panelPhoto.score ?? 0} / 5`,
        },
      ]
    : [];
  const panelReaction = panelPhoto
    ? (reactions[panelPhoto.id] ?? EMPTY_REACTION)
    : EMPTY_REACTION;
  const reactionLikesLabel = panelReaction.likes.length
    ? `${panelReaction.likes.length}명이 좋아해요`
    : "아직 좋아요가 없어요";
  const panelRetouch = panelPhoto
    ? (retouchRequests[panelPhoto.id] ?? "").trim()
    : "";
  // 부부가 남긴 보정 요청을 댓글 목록 맨 위에 칩과 함께 합류시킨다
  const reactionComments = [
    ...(panelRetouch
      ? [
          {
            initial: gallery.title.trim().slice(0, 1) || "부",
            meta: gallery.title,
            tag: "보정 요청",
            text: panelRetouch,
          },
        ]
      : []),
    ...panelReaction.comments.map((comment) => ({
      initial: comment.initial,
      meta: `${comment.author} · ${comment.timeLabel}`,
      text: comment.text,
    })),
  ];
  const retouchCount = allPhotos.filter((photo) =>
    (retouchRequests[photo.id] ?? "").trim(),
  ).length;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-layer-default">
      {/* 풀와이드 탑바 (피그마 작가 워크스페이스 탑바) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-stroke-neutral-muted bg-bg-layer-default px-3">
        {/* 좌측은 내비(메뉴·로고)만 — 뷰 도구는 콘텐츠 영역으로 이동 (구글 포토식, 사용자 결정) */}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<MenuIcon size={20} />}
            onClick={toggle}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          />
          <Link
            href="/galleries"
            className="mx-2 flex items-center gap-2 text-fg-neutral"
          >
            <BrandLogo size={28} />
            <b className="type-brand-wordmark">Easy Select</b>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {/* 핵심 CTA는 사이드바 소속이지만, 접혀 있을 땐 액션이 사라지지 않게 탑바로 폴백 */}
          {collapsed && gallery.status === "DRAFT" && (
            <Button
              size="sm"
              onClick={() => setStatusAction("open")}
              className="mr-1"
            >
              갤러리 열기
            </Button>
          )}
          {collapsed && legacy?.uploaded && !legacy.delivered && (
            <Button
              size="sm"
              onClick={() => setDeliveryOpen(true)}
              className="mr-1"
            >
              전달 완료로 표시
            </Button>
          )}
          <NotificationBell />
          <IconButton
            icon={<ShareIcon size={20} />}
            selected={inviteOpen}
            onClick={() => setInviteOpen(true)}
            aria-label="부부 초대"
          />
          <Avatar initial={studio.name.trim().slice(0, 1) || "스"} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 작가 사이드바 — 커플명 + 업로드 + 자동 분류 + 필터 + 앨범 */}
        {!collapsed && (
          <aside className="hidden w-70 shrink-0 flex-col border-r border-stroke-neutral-muted bg-bg-layer-default md:flex">
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-5">
              <h1 className="truncate type-heading-card text-fg-neutral">
                {gallery.title}
              </h1>
              <GalleryStatusChip gallery={gallery} className="shrink-0 px-0!" />
            </div>
            <div className="mx-5 h-px shrink-0 bg-stroke-neutral-muted" />
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
              <div className="flex w-full flex-col gap-2">
                {/* 상태 전환 — DRAFT의 핵심 CTA. 열어야 초대된 부부에게 보인다 */}
                {gallery.status === "DRAFT" && (
                  <Button
                    onClick={() => setStatusAction("open")}
                    className="w-full"
                  >
                    갤러리 열기
                  </Button>
                )}
                <Button
                  onClick={() => setUploadOpen(true)}
                  icon={<UploadIcon />}
                  className="w-full"
                >
                  사진 업로드
                </Button>
                {/* 상태 전환 보조 액션 — 아웃라인 스타일은 공용 Button에 없어 직접 그린다 */}
                {gallery.status === "OPEN" && (
                  <button
                    type="button"
                    onClick={() => setStatusAction("close")}
                    className="flex h-10 w-full cursor-pointer items-center justify-center rounded-(--pill) border border-stroke-neutral-weak bg-bg-layer-default px-5 type-label-button text-fg-neutral transition-colors duration-fast hover:bg-bg-layer-default-hover"
                  >
                    선택 마감
                  </button>
                )}
                {gallery.status === "CLOSED" && (
                  <button
                    type="button"
                    onClick={() => setStatusAction("reopen")}
                    className="flex h-10 w-full cursor-pointer items-center justify-center rounded-(--pill) border border-stroke-neutral-weak bg-bg-layer-default px-5 type-label-button text-fg-neutral transition-colors duration-fast hover:bg-bg-layer-default-hover"
                  >
                    재오픈
                  </button>
                )}
                {/* 부부가 셀렉을 제출한 뒤에만 — 되돌릴지는 작가가 판단(서버 규칙) */}
                {selection?.status === "SUBMITTED" && (
                  <button
                    type="button"
                    onClick={() => setReopenSelectionOpen(true)}
                    className="flex h-10 w-full cursor-pointer items-center justify-center rounded-(--pill) border border-stroke-neutral-weak bg-bg-layer-default px-5 type-label-button text-fg-neutral transition-colors duration-fast hover:bg-bg-layer-default-hover"
                  >
                    선택 다시 열기
                  </button>
                )}
                {/* 워크플로 종결 액션 — 업로드 아래에 배치 (사용자 결정).
                    원래 조건은 부부의 셀렉 제출 후지만 BE 연동 전이라 업로드 후부터 노출.
                    업로드·전달 플래그는 레거시 스토어 몫(04·07에서 서버 전환) */}
                {legacy?.uploaded && !legacy.delivered && (
                  <button
                    type="button"
                    onClick={() => setDeliveryOpen(true)}
                    className="flex h-10 w-full cursor-pointer items-center justify-center rounded-(--pill) border border-stroke-neutral-weak bg-bg-layer-default px-5 type-label-button text-fg-neutral transition-colors duration-fast hover:bg-bg-layer-default-hover"
                  >
                    전달 완료로 표시
                  </button>
                )}
              </div>

              <AssistPanel
                onOpenChange={(open) => {
                  setOpenClusterIndex(null);
                  cluster.setEnabled(open);
                }}
                levelIndex={cluster.levelIndex}
                onLevelChange={(index) => {
                  setOpenClusterIndex(null);
                  cluster.setLevelIndex(index);
                }}
                summary={
                  cluster.result === null
                    ? null
                    : cluster.result.kind === "error"
                      ? "묶음을 불러오지 못했어요 — 잠시 후 다시 시도해 주세요"
                      : `폴더 ${clusterGroups.length}개 · 나머지 사진 ${clusterSingles.length}장`
                }
                hint={
                  clusterReady && preparingCount > 0
                    ? `분석 중인 사진 ${preparingCount}장은 끝나는 대로 폴더에 담겨요`
                    : undefined
                }
                onSave={() => setSaveAlbumOpen(true)}
                saveDisabled={
                  !clusterReady ||
                  clusterGroups.length + clusterSingles.length === 0
                }
              />

              <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />

              <div className="flex w-full flex-col gap-1">
                <MenuItem
                  icon={<PhotoIcon size={20} />}
                  label="모든 사진"
                  count={allPhotos.length}
                  selected={view === "all"}
                  onClick={() => {
                    clearSelection();
                    setView("all");
                  }}
                />
                <MenuItem
                  icon={<PhotoIcon size={20} />}
                  label="선택 사진"
                  count={(() => {
                    const max =
                      selection?.max ?? gallery.maxSelectablePhotoCount;
                    const count = selection?.selectedCount ?? 0;
                    return max !== null ? `${count}/${max}` : count;
                  })()}
                  selected={view === "selected"}
                  onClick={() => {
                    clearSelection();
                    setView("selected");
                  }}
                />
              </div>

              <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />

              <AlbumTreeSection
                result={folderGroupsResult}
                activeKey={
                  folderView
                    ? `${folderView.groupId}:${folderView.folderId}`
                    : null
                }
                dragContext={dragSource}
                onSelectFolder={(groupId, folderId) => {
                  setOpenClusterIndex(null);
                  clearSelection();
                  setView(`album:${groupId}:${folderId}`);
                }}
                onRenameGroup={(groupId, name) =>
                  void handleRenameGroup(groupId, name)
                }
                onRenameFolder={(groupId, folderId, name) =>
                  void handleRenameFolder(groupId, folderId, name)
                }
                onDeleteGroup={(groupId, name) =>
                  setDeleteTarget({ kind: "group", groupId, name })
                }
                onDeleteFolder={(groupId, folderId, name) =>
                  setDeleteTarget({ kind: "folder", groupId, folderId, name })
                }
                onDropPhotos={(folderId) => void handleMoveSelection(folderId)}
              />
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            {mode === "single" ? (
              <main className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="px-4 pt-4 pb-3">{contentHeader}</div>
                {filmstripOpen && filmstrip}
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-bg-stage p-3">
                  {currentPhoto ? (
                    currentPhoto.preparing ? (
                      // 파생 JPEG 준비 전 — 물결 + 아이콘 (그리드 셀과 동일 문법)
                      <div
                        aria-label={`${currentPhoto.name} — 미리보기 준비 중`}
                        className="relative aspect-4/5 h-full overflow-hidden rounded-(--radius-4) bg-bg-disabled"
                      >
                        <span className="shimmer-sweep" />
                        <span className="absolute inset-0 grid place-items-center text-fg-neutral-subtle">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentPhoto.url ?? undefined}
                        alt={currentPhoto.name}
                        onError={refreshOnImageError}
                        className="max-h-full max-w-full object-contain"
                      />
                    )
                  ) : (
                    <p className="type-body-medium text-fg-stage">
                      표시할 사진이 없어요.
                    </p>
                  )}
                </div>
              </main>
            ) : mode === "compare" ? (
              <main className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="px-4 pt-4 pb-3">{contentHeader}</div>
                {filmstripOpen && filmstrip}
                <div className="flex shrink-0 items-center justify-end bg-bg-layer-default px-4 py-1">
                  <button
                    type="button"
                    onClick={() => setCompareCount(compareCount === 2 ? 4 : 2)}
                    className="flex cursor-pointer items-center gap-1 type-body-medium text-fg-neutral"
                  >
                    {compareCount}장 보기
                    <DropdownIcon size={16} />
                  </button>
                </div>
                {/* 비교 스테이지 — 작가는 관찰만: 선택 테두리·별점 모두 읽기 전용 */}
                <div className="flex min-h-0 flex-1 items-center justify-center gap-6 bg-bg-layer-default p-3 [container-type:size]">
                  {comparePhotos.length === 0 ? (
                    <p className="type-body-medium text-fg-neutral-muted">
                      비교할 사진이 없어요.
                    </p>
                  ) : (
                    comparePhotos.map((photo) => (
                      <ComparePhotoCard
                        key={photo.id}
                        imageWidth={compareImageWidth}
                        label={photo.name}
                        selected={selectedSet.has(photo.id)}
                        rating={photo.score ?? 0}
                        imageUrl={photo.url}
                        preparing={photo.preparing}
                        onImageError={refreshOnImageError}
                      />
                    ))
                  )}
                </div>
              </main>
            ) : (
              <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                {/* 헤더는 스크롤 영역 밖 — 뷰 전환·스크롤에도 도구 위치 고정 */}
                <div className="px-4 pt-4 pb-3">{contentHeader}</div>
                {/* 클러스터 미리보기 보조 줄 — 펼침: 돌아가기, 접힘: 안내 캡션 */}
                {cluster.enabled && view === "all" && openClusterGroup && (
                  <div className="flex items-baseline gap-2 px-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setOpenClusterIndex(null)}
                      className="cursor-pointer type-label-button text-fg-neutral hover:underline"
                    >
                      ← 미리보기로
                    </button>
                    <span className="type-body-small text-fg-neutral-muted">
                      폴더 {(openClusterIndex ?? 0) + 1} ·{" "}
                      {openClusterGroup.length}장
                    </span>
                  </div>
                )}
                {cluster.enabled &&
                  view === "all" &&
                  !openClusterGroup &&
                  clusterReady &&
                  clusterGroups.length > 0 && (
                    <p className="px-4 pb-2 type-body-small text-fg-neutral-muted">
                      겹친 카드가 폴더예요 — 누르면 안의 사진만 보여요
                    </p>
                  )}
                <div
                  className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 scrollbar-gutter-stable"
                  onClick={(e) => {
                    // 빈 곳 클릭 — 선택 해제 (탐색기 문법)
                    if (e.target === e.currentTarget) clearSelection();
                  }}
                >
                {collapsedPreview ? (
                  cluster.result === null ? (
                    gridSkeleton
                  ) : cluster.result.kind === "error" ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <p className="type-body-medium text-fg-neutral-muted">
                        묶음을 불러오지 못했어요. 네트워크를 확인한 뒤 다시
                        시도해 주세요.
                      </p>
                      <Button size="sm" onClick={cluster.retry}>
                        다시 불러오기
                      </Button>
                    </div>
                  ) : clusterGroups.length + clusterSingles.length === 0 ? (
                    <p className="py-16 text-center type-body-medium text-fg-neutral-muted">
                      묶을 사진이 아직 없어요 — 업로드한 사진의 분석이 끝나면
                      여기에 묶여요.
                    </p>
                  ) : (
                    <div
                      className="grid w-full justify-center gap-2"
                      style={{ gridTemplateColumns }}
                    >
                      {clusterGroups.map((group, index) => (
                        <ClusterStackCell
                          key={group[0].id}
                          photos={group}
                          onOpen={() => setOpenClusterIndex(index)}
                          onImageError={refreshOnImageError}
                        />
                      ))}
                      {clusterSingles.map((photo) => (
                        <PhotoCell
                          key={photo.id}
                          onClick={() => setCurrentPhotoId(photo.id)}
                          variant={mode === "grid-small" ? "small" : "large"}
                          focused={photo.id === currentPhoto?.id}
                          name={photo.name}
                          format={photo.format}
                          label={photo.name}
                          imageUrl={photo.url}
                          preparing={photo.preparing}
                          onImageError={refreshOnImageError}
                        />
                      ))}
                    </div>
                  )
                ) : folderView ? (
                  // 폴더 열람 — 목록·오류·빈 상태를 폴더 기준으로
                  activeFolderPhotos === null ? (
                    gridSkeleton
                  ) : activeFolderPhotos.kind === "error" ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <p className="type-body-medium text-fg-neutral-muted">
                        폴더를 불러오지 못했어요. 네트워크를 확인한 뒤 다시
                        시도해 주세요.
                      </p>
                      <Button size="sm" onClick={reloadFolderPhotos}>
                        다시 불러오기
                      </Button>
                    </div>
                  ) : photos.length === 0 ? (
                    <p className="py-16 text-center type-body-medium text-fg-neutral-muted">
                      폴더가 비어 있어요.
                    </p>
                  ) : (
                    // 폴더 열람 전용 그리드 — 탐색기식 선택·우클릭·드래그를 셀 래퍼가 받는다
                    <div
                      className="grid w-full justify-center gap-2"
                      style={{ gridTemplateColumns }}
                    >
                      {photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          draggable={pickedIds.includes(photo.id)}
                          onDragStart={(e) => {
                            if (!folderView) return;
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", "");
                            setDragSource({
                              groupId: folderView.groupId,
                              folderId: folderView.folderId,
                            });
                          }}
                          onDragEnd={() => setDragSource(null)}
                          onClick={(e) =>
                            handleSelectClick(e, photo.id, index)
                          }
                          onDoubleClick={() => openPhoto(photo.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (!pickedIds.includes(photo.id)) {
                              setPickedIds([photo.id]);
                              setLastSelIndex(index);
                            }
                            setCtxMenu({ x: e.clientX, y: e.clientY });
                          }}
                        >
                          <PhotoCell
                            variant={mode === "grid-small" ? "small" : "large"}
                            focused={photo.id === currentPhoto?.id}
                            name={photo.name}
                            format={photo.format}
                            label={photo.name}
                            imageUrl={photo.url}
                            preparing={photo.preparing}
                            dimmed={pickedIds.includes(photo.id)}
                            onImageError={refreshOnImageError}
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : photosResult === null ? (
                  gridSkeleton
                ) : photosResult.kind === "error" ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <p className="type-body-medium text-fg-neutral-muted">
                      사진을 불러오지 못했어요. 네트워크를 확인한 뒤 다시
                      시도해 주세요.
                    </p>
                    <Button size="sm" onClick={reloadPhotos}>
                      다시 불러오기
                    </Button>
                  </div>
                ) : photos.length === 0 ? (
                  <p className="py-16 text-center type-body-medium text-fg-neutral-muted">
                    아직 사진이 없어요 — 사진 업로드로 시작해 보세요.
                  </p>
                ) : (
                  photoCellGrid
                )}
                </div>
                {folderView && pickedIds.length > 0 && (
                  <SelectionActionBar
                    count={pickedIds.length}
                    targets={moveTargets}
                    onMove={(folderId) => void handleMoveSelection(folderId)}
                    onRemove={() => void handleRemoveSelection()}
                  />
                )}
              </main>
            )}

            {rightPanel === "reaction" && (
              <ReactionPanel
                likesLabel={reactionLikesLabel}
                comments={reactionComments}
              />
            )}
            {rightPanel === "info" && panelPhoto && (
              <InfoPanel analysis={MOCK_ANALYSIS} fileInfo={panelFileInfo} />
            )}
          </div>

          {/* 하단 툴바 — 비교·싱글 뷰 전용 (그리드 줌은 탑바로 이동, 사용자 결정) */}
          {(mode === "single" || mode === "compare") && (
            <AppToolbar
              left={
                <span className="type-body-small text-fg-neutral-muted">
                  {currentPhoto
                    ? `${currentIndex + 1} / ${photos.length}`
                    : `${photos.length} / ${allPhotos.length}`}
                </span>
              }
              center={
                <StarRating value={currentPhoto?.score ?? 0} />
              }
            />
          )}
        </div>

        <AppRightRail>
          <IconButton
            icon={<ReactionIcon size={20} />}
            selected={rightPanel === "reaction"}
            onClick={() =>
              setRightPanel(rightPanel === "reaction" ? null : "reaction")
            }
            aria-label="댓글 패널"
          />
          <IconButton
            icon={<InfoIcon size={20} />}
            selected={rightPanel === "info"}
            onClick={() => setRightPanel(rightPanel === "info" ? null : "info")}
            aria-label="정보 패널"
          />
        </AppRightRail>
      </div>

      {uploadOpen && (
        <GalleryUploadModal
          galleryId={gallery.id}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            // 방금 올린 사진이 바로 그리드에 보이게 (UPLOADED = 준비 중 셀)
            reloadPhotos();
            // 분석 자동 실행 + 진행 폴링 재가동 (#24)
            notifyEmbedding();
            // 전달 CTA 데모 플래그 — 전달 흐름(07) 서버 전환 전까지 레거시 유지
            if (legacy) {
              updateGallery(legacy.id, {
                uploaded: true,
                total: allPhotos.length,
              });
            }
          }}
        />
      )}
      {inviteOpen && (
        <GalleryInviteModal
          galleryId={gallery.id}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {deliveryOpen && (
        <GalleryDeliveryConfirmModal
          selectedCount={selection?.selectedCount ?? 0}
          target={selection?.max ?? gallery.maxSelectablePhotoCount ?? 0}
          retouchCount={retouchCount}
          selectionSubmitted={selection?.status === "SUBMITTED"}
          onClose={() => setDeliveryOpen(false)}
          onConfirm={() => {
            if (legacy) updateGallery(legacy.id, { delivered: true });
            setDeliveryOpen(false);
          }}
        />
      )}
      {/* 선택 다시 열기 확인 — 이미 보정에 들어갔을 수 있어 최종 판단은 작가 몫 */}
      {reopenSelectionOpen && (
        <GalleryModalShell
          title="부부 선택을 다시 열까요?"
          desc="다시 열면 부부가 이어서 고를 수 있어요. 이미 보정을 시작했다면 열기 전에 부부와 한번 확인해 주세요."
          onClose={() => setReopenSelectionOpen(false)}
        >
          <GalleryModalButtons
            onClose={() => setReopenSelectionOpen(false)}
            onConfirm={() => void handleReopenSelection()}
            confirmLabel="선택 다시 열기"
          />
        </GalleryModalShell>
      )}
      {statusAction === "open" && (
        <OpenGalleryConfirmModal
          gallery={gallery}
          onClose={() => setStatusAction(null)}
          onDone={(updated) => {
            replace(updated);
            setStatusAction(null);
          }}
        />
      )}
      {statusAction === "close" && (
        <CloseGalleryConfirmModal
          gallery={gallery}
          onClose={() => setStatusAction(null)}
          onDone={(updated) => {
            replace(updated);
            setStatusAction(null);
          }}
        />
      )}
      {statusAction === "reopen" && (
        <ReopenGalleryModal
          gallery={gallery}
          onClose={() => setStatusAction(null)}
          onDone={(updated) => {
            replace(updated);
            setStatusAction(null);
          }}
        />
      )}
      {saveAlbumOpen && clusterReady && (
        <SaveAlbumModal
          galleryId={gallery.id}
          groups={clusterGroups}
          singles={clusterSingles}
          existingNames={
            folderGroupsResult?.kind === "ready"
              ? folderGroupsResult.groups.map((g) => g.name)
              : []
          }
          onClose={() => setSaveAlbumOpen(false)}
          onSaved={(group) => {
            setSaveAlbumOpen(false);
            reloadFolderGroups();
            notice(`앨범 '${group.name}'에 저장했어요`);
          }}
        />
      )}
      {ctxMenu && folderView && pickedIds.length > 0 && (
        <PhotoContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          count={pickedIds.length}
          targets={moveTargets}
          onMove={(folderId) => {
            setCtxMenu(null);
            void handleMoveSelection(folderId);
          }}
          onRemove={() => {
            setCtxMenu(null);
            void handleRemoveSelection();
          }}
          onClose={() => setCtxMenu(null)}
        />
      )}
      {deleteTarget && (
        <DeleteFolderModal
          kind={deleteTarget.kind}
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteTarget}
        />
      )}
      {savedToast && (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-200 -translate-x-1/2 rounded-(--pill) border border-stroke-neutral-inverted bg-bg-neutral-inverted px-5 py-3 type-label-button text-fg-neutral-inverted shadow-(--shadow-hover)"
        >
          {savedToast}
        </div>
      )}
      {comingSoonToast}
    </div>
  );
}
