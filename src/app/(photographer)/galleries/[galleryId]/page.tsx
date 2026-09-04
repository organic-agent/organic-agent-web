"use client";

/**
 * 작가 — 갤러리 워크스페이스 (피그마 Photographer/Gallery-Sidebar 대응)
 * 위치: src/app/(photographer)/galleries/[galleryId]/page.tsx
 *
 * 부부 워크스페이스와 같은 뷰 4종(그리드 라지/스몰·비교·싱글)을 공유하되 껍데기가 다르다:
 * - 풀와이드 탑바: 사이드바 토글 + 로고(홈 복귀) + 뷰 전환 + 줌 | 전달 완료 버튼(조건부) + 알림 + 초대 + 프로필
 * - 사이드바: 갤러리명·상태 칩 + 상태 전환 + 사진 업로드 + 카테고리 + 필터
 * - 별점·선택은 부부의 것이라 전부 읽기 전용, 하단 툴바는 비교·싱글 뷰에서만
 * - 부부가 셀렉을 제출(SUBMITTED)하면 "선택 다시 열기"로 되돌릴 수 있다(작가 전용)
 * - 우측 레일: 서버 기반 파일·카테고리 정보
 *
 * 갤러리 메타·사진·선택 현황·별점·보정 현황은 서버가 진실이다.
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
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { NotificationBell } from "@/components/app/NotificationBell";
import { InfoPanel } from "@/components/app/InfoPanel";
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
  ShareIcon,
  SingleViewIcon,
  SortIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";
import { useSidebar } from "@/components/SidebarProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/MenuItem";
import { StarRating } from "@/components/ui/StarRating";
import { GalleryStatusChip } from "@/components/photographer/GalleryStatusChip";
import { ApiError } from "@/lib/api/client";
import {
  deletePhotos,
  eraseTrashedPhotos,
  restoreTrashedPhotos,
} from "@/lib/api/photos";
import { withdrawSelection } from "@/lib/api/selection";
import { changeGalleryWorkflowStatus } from "@/lib/api/galleries";
import { useStudioInfo } from "@/lib/studio";
import { CategoryTreeSection } from "./_components/CategoryTreeSection";
import { CollabSessionsModal } from "./_components/CollabSessionsModal";
import { GalleryDeliveryConfirmModal } from "./_components/GalleryDeliveryConfirmModal";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "../_components/GalleryModalShell";
import { GalleryInviteModal } from "./_components/GalleryInviteModal";
import { PhotoContextMenu } from "./_components/PhotoContextMenu";
import { SelectionActionBar } from "./_components/SelectionActionBar";
import {
  CloseGalleryConfirmModal,
  OpenGalleryConfirmModal,
  ReopenGalleryModal,
} from "./_components/GalleryStatusModals";
import { GalleryUploadModal } from "./_components/GalleryUploadModal";
import { useCategoryOverview } from "./_lib/useCategoryOverview";
import { useEmbeddingProgress } from "./_lib/useEmbeddingProgress";
import { useGalleryDetail } from "./_lib/useGalleryDetail";
import { useSelectionOverview } from "./_lib/useSelectionOverview";
import { useTrashedPhotos } from "./_lib/useTrashedPhotos";
import { useGalleryPhotos } from "@/lib/galleryPhotos";
import { useRetouchOverview } from "@/lib/retouch";

// AI 연동 전 mock (시안 문구 — 부부 워크스페이스와 동일)
const MOCK_ANALYSIS = [
  { label: "피사체 선명도", value: "88점" },
  { label: "눈 선명도", value: "100점" },
  { label: "눈 뜨기", value: "좋음" },
];

/** 사이드바 필터: 모든 사진 / 부부 선택 사진 / 카테고리 / 미분류 / 휴지통 */
type GalleryView =
  | "all"
  | "selected"
  | "unclassified"
  | "trash"
  | `category:${number}`;
type ViewMode = "grid-large" | "grid-small" | "single" | "compare";

export default function PhotographerGalleryWorkspacePage() {
  const params = useParams<{ galleryId: string }>();
  // 갤러리 메타(제목·상태·마감일·계약 장수)는 서버가 진실
  const { result, reload, replace } = useGalleryDetail(params.galleryId);
  const studio = useStudioInfo();
  const { collapsed, toggle } = useSidebar();
  // 정렬(별점 순)은 기획만 있고 미구현 — 준비 중 토스트로 안내 (부부 화면과 동일)
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  const [view, setView] = useState<GalleryView>("all");
  const [mode, setMode] = useState<ViewMode>("grid-large");
  const [currentPhotoId, setCurrentPhotoId] = useState<number | null>(null);
  const [rightPanel, setRightPanel] = useState<"info" | null>(null);
  const [compareCount, setCompareCount] = useState<2 | 4>(2);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  // 상태 전환 다이얼로그 — DRAFT→열기 / OPEN→선택 마감 / CLOSED→재오픈
  const [statusAction, setStatusAction] = useState<
    "open" | "close" | "reopen" | null
  >(null);
  // 제출 되돌리기(withdraw) 확인 — 부부가 제출한 선택을 다시 연다
  const [reopenSelectionOpen, setReopenSelectionOpen] = useState(false);
  // 사진 휴지통 이동·완전 삭제 확인 (WES-266·267)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);
  const [eraseConfirmOpen, setEraseConfirmOpen] = useState(false);
  const categories = useCategoryOverview(params.galleryId);
  // 서버 작업 결과를 알리는 하단 토스트
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const savedToastTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(savedToastTimer.current), []);
  // 폴더 열람의 다중 선택(관리용) — 탐색기 문법(클릭·Shift·⌘), 표시는 딤.
  // selectedIds(부부 셀렉)와 다른 것이라 pickedIds로 구분한다.
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [lastSelIndex, setLastSelIndex] = useState<number | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
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
  const retouchOverview = useRetouchOverview(params.galleryId);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  // 사진은 서버가 진실 — viewUrl(서명 URL)로 그리고, TTL 만료 전 재조회한다
  const {
    result: photosResult,
    reload: reloadPhotos,
    refreshOnImageError,
    silentRefresh: silentRefreshPhotos,
  } = useGalleryPhotos(params.galleryId);
  // 사진 분석(임베딩) — UI 없이 자동 실행·폴링, 진행분만큼 준비 중 셀이 실사진으로.
  // 새로 분석된 사진은 카테고리 작업 결과에도 합류해야 한다.
  const { notifyUploaded: notifyEmbedding } = useEmbeddingProgress(
    params.galleryId,
    () => {
      silentRefreshPhotos();
      categories.reload();
    },
  );
  const allPhotos = useMemo(
    () => (photosResult?.kind === "ready" ? photosResult.photos : []),
    [photosResult],
  );
  // 사진 휴지통 — 사이드바 개수와 휴지통 뷰가 함께 쓴다
  const { result: trashResult, reload: reloadTrash } = useTrashedPhotos(
    params.galleryId,
  );
  const trashedPhotos = useMemo(
    () => (trashResult?.kind === "ready" ? trashResult.photos : []),
    [trashResult],
  );
  // 휴지통 사진을 그리드 셀 모양에 맞춘다 (점수·포맷 없음, 항상 표시 가능)
  const trashAsGalleryPhotos = useMemo(
    () =>
      trashedPhotos.map((p) => ({
        id: p.id,
        url: p.url,
        preparing: false,
        name: p.name,
        format: "",
        score: null,
      })),
    [trashedPhotos],
  );
  const categoryReady =
    categories.result?.kind === "ready" ? categories.result : null;
  const activeDetailFolderId = view.startsWith("category:")
    ? Number(view.slice("category:".length))
    : view === "unclassified"
      ? 0
      : null;
  const activeDetailFolder = categoryReady?.folders
    .flatMap((concept) => concept.details)
    .find((detail) => detail.id === activeDetailFolderId);
  const categoryPhotoIds = new Set(
    view === "unclassified"
      ? (categoryReady?.latestJob?.photos
          .filter(
            (photo) =>
              photo.status === "UNCLASSIFIED" || photo.status === "FAILED",
          )
          .map((photo) => photo.photoId) ?? [])
      : (activeDetailFolder?.photoIds ?? []),
  );

  const photos =
    view === "selected"
      ? allPhotos.filter((photo) => selectedSet.has(photo.id))
      : view === "trash"
        ? trashAsGalleryPhotos
        : activeDetailFolderId !== null
          ? allPhotos.filter((photo) => categoryPhotoIds.has(photo.id))
          : allPhotos;

  const currentIndex = photos.findIndex((p) => p.id === currentPhotoId);
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : undefined;
  // 필름스트립 접기 (C안: 헤더 칩으로 흡수, 부부 화면과 공유)
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

  // Esc — 관리 선택·우클릭 메뉴 해제
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (pickedIds.length > 0 || ctxMenu !== null) clearSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // ⌘A — 현재 그리드 전체 선택 (관리 선택이 있는 뷰: 모든 사진·폴더·휴지통)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "a") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;
      if (mode !== "grid-large" && mode !== "grid-small") return;
      const manageable = view !== "selected";
      if (!manageable || photos.length === 0) return;
      e.preventDefault();
      setPickedIds(photos.map((p) => p.id));
      setLastSelIndex(null);
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

  async function handleMarkDelivered() {
    try {
      replace(await changeGalleryWorkflowStatus(gallery.id, "COMPLETED"));
      setDeliveryOpen(false);
      notice("전달 완료로 표시했어요");
    } catch (err) {
      notice(err instanceof ApiError ? err.message : "전달 상태를 바꾸지 못했습니다.");
    }
  }

  /** 사진 그리드 — 탐색기 문법: 클릭=한 장, Shift=범위, ⌘/Ctrl=추가·해제 */
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

  const title =
    view === "selected"
      ? "선택 사진"
      : view === "trash"
        ? "휴지통"
        : view === "unclassified"
          ? "미분류 사진"
          : activeDetailFolder?.name ?? "모든 사진";

  /** 현재 그리드 전체 선택 — 액션 바·우클릭 메뉴의 "전체 선택" */
  function selectAllInView() {
    setPickedIds(photos.map((p) => p.id));
    setLastSelIndex(null);
    setCtxMenu(null);
  }

  /** 휴지통 이동 확정 — 전부-아니면-404: 낡은 화면이면 재조회로 푼다 */
  async function handleTrashPicked() {
    const ids = [...pickedIds];
    setTrashConfirmOpen(false);
    if (ids.length === 0) return;
    try {
      await deletePhotos(gallery.id, ids);
      notice(`${ids.length}장을 휴지통으로 옮겼어요`);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        notice(
          err instanceof ApiError
            ? err.message
            : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
        );
        return;
      }
      notice("화면이 최신이 아니었어요 — 목록을 다시 불러왔어요");
    }
    clearSelection();
    silentRefreshPhotos();
    categories.reload();
    reloadTrash();
  }

  /** 휴지통 복원 — 목록·카테고리로 돌아온다 */
  async function handleRestorePicked() {
    const ids = [...pickedIds];
    if (ids.length === 0) return;
    try {
      await restoreTrashedPhotos(gallery.id, ids);
      notice(`${ids.length}장을 복원했어요 — 모든 사진에 돌아왔어요`);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        notice(
          err instanceof ApiError
            ? err.message
            : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
        );
        return;
      }
      notice("화면이 최신이 아니었어요 — 목록을 다시 불러왔어요");
    }
    clearSelection();
    reloadTrash();
    silentRefreshPhotos();
    categories.reload();
  }

  /** 완전 삭제 확정 — 복구 불가라 빨간 재확인을 거친 뒤에만 온다 */
  async function handleErasePicked() {
    const ids = [...pickedIds];
    setEraseConfirmOpen(false);
    if (ids.length === 0) return;
    try {
      await eraseTrashedPhotos(gallery.id, ids);
      notice(`${ids.length}장을 완전히 삭제했어요`);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        notice(
          err instanceof ApiError
            ? err.message
            : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
        );
        return;
      }
      notice("화면이 최신이 아니었어요 — 목록을 다시 불러왔어요");
    }
    clearSelection();
    reloadTrash();
  }

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
  // 모든 사진: 탐색기 문법(클릭=선택·더블클릭=크게 보기, #39) / 선택 사진 뷰: 열람만
  const photoCellGrid = (
    <div
      className="grid w-full justify-center gap-2"
      style={{ gridTemplateColumns }}
    >
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          onClick={(e) =>
            view === "all"
              ? handleSelectClick(e, photo.id, index)
              : setCurrentPhotoId(photo.id)
          }
          onDoubleClick={() => openPhoto(photo.id)}
          onContextMenu={(e) => {
            if (view !== "all") return;
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
            managed={view === "all" && pickedIds.includes(photo.id)}
            name={photo.name}
            format={photo.format}
            label={photo.name}
            imageUrl={photo.url}
            preparing={photo.preparing}
            onImageError={refreshOnImageError}
          />
        </div>
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
      {photos.map((photo) => (
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
    </div>
  );

  // 콘텐츠 헤더 — 모든 뷰 공통. 도구가 항상 같은 자리에 있다 (부부 화면과 동일 구조).
  // 뷰 4버튼은 오른쪽에 고정하고 줌은 그 왼쪽에 둔다.
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
        {/* 휴지통은 열람 전용 목록 — 크게 보기·비교 진입을 두지 않는다(시안 확정) */}
        {view !== "trash" && viewToggles}
        <p className="ml-2 type-body-small text-fg-neutral-muted">
          {view === "trash"
            ? `${photos.length}장 · 보관 기간이 지나면 자동으로 완전히 삭제됩니다`
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
        { label: "카테고리", value: activeDetailFolder?.name ?? "-" },
        {
          label: "부부 별점",
          value: `${panelPhoto.score ?? 0} / 5`,
        },
      ]
    : [];
  const retouchCount = retouchOverview?.currentRound?.photos.length ?? 0;

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
          {collapsed && gallery.stage === "DELIVERY" && gallery.workflowStatus !== "COMPLETED" && (
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
        {/* 작가 사이드바 — 커플명 + 업로드 + 카테고리 + 필터 */}
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
                <Button
                  kind="ghost"
                  onClick={() => setCollabOpen(true)}
                  className="w-full"
                >
                  하객 공유 링크
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
                {gallery.stage === "DELIVERY" && gallery.workflowStatus !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => setDeliveryOpen(true)}
                    className="flex h-10 w-full cursor-pointer items-center justify-center rounded-(--pill) border border-stroke-neutral-weak bg-bg-layer-default px-5 type-label-button text-fg-neutral transition-colors duration-fast hover:bg-bg-layer-default-hover"
                  >
                    전달 완료로 표시
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  kind="ghost"
                  className="w-full"
                  disabled={categories.running}
                  onClick={() => void categories.categorize()}
                >
                  {categories.running ? "분류 중" : "AI 카테고리 분류"}
                </Button>
                {categoryReady?.latestJob && (
                  <p className="px-1 type-body-small text-fg-neutral-muted">
                    최근 작업 {categoryReady.latestJob.status} · 처리 {categoryReady.latestJob.processedPhotoCount}장
                  </p>
                )}
              </div>

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

              <CategoryTreeSection
                result={categories.result}
                activeDetailFolderId={activeDetailFolderId}
                onSelectDetailFolder={(detailFolderId) => {
                  clearSelection();
                  setView(`category:${detailFolderId}`);
                }}
                onSelectUnclassified={() => {
                  clearSelection();
                  setView("unclassified");
                }}
              />

              <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />

              {/* 휴지통 진입점 — 트리 맨 아래 고정, 지운 게 있을 때만 개수 (시안 확정) */}
              <MenuItem
                icon={<TrashIcon size={20} />}
                label="휴지통"
                count={trashedPhotos.length > 0 ? trashedPhotos.length : undefined}
                selected={view === "trash"}
                onClick={() => {
                  clearSelection();
                  setView("trash");
                }}
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
                <div
                  className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 scrollbar-gutter-stable"
                  onClick={(e) => {
                    // 빈 곳 클릭 — 선택 해제 (탐색기 문법)
                    if (e.target === e.currentTarget) clearSelection();
                  }}
                >
                {view === "trash" ? (
                  // 휴지통 — 반투명 셀 그리드, 클릭=선택·우클릭=메뉴 (크게 보기 없음)
                  trashResult === null ? (
                    gridSkeleton
                  ) : trashResult.kind === "error" ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <p className="type-body-medium text-fg-neutral-muted">
                        휴지통을 불러오지 못했어요. 네트워크를 확인한 뒤 다시
                        시도해 주세요.
                      </p>
                      <Button size="sm" onClick={reloadTrash}>
                        다시 불러오기
                      </Button>
                    </div>
                  ) : photos.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="type-body-medium text-fg-neutral-muted">
                        휴지통이 비어 있어요.
                      </p>
                      <p className="mt-1 type-body-small text-fg-neutral-subtle">
                        지운 사진은 여기서 복원할 수 있습니다.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="grid w-full justify-center gap-2"
                      style={{ gridTemplateColumns }}
                    >
                      {photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="opacity-60"
                          onClick={(e) => handleSelectClick(e, photo.id, index)}
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
                            managed={pickedIds.includes(photo.id)}
                            name={photo.name}
                            format={photo.format}
                            label={photo.name}
                            imageUrl={photo.url}
                            onImageError={reloadTrash}
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
                {pickedIds.length > 0 &&
                  (view === "trash" ? (
                    <SelectionActionBar
                      count={pickedIds.length}
                      onSelectAll={selectAllInView}
                      onRestore={() => void handleRestorePicked()}
                      onErase={() => setEraseConfirmOpen(true)}
                    />
                  ) : view !== "selected" ? (
                    <SelectionActionBar
                      count={pickedIds.length}
                      onSelectAll={selectAllInView}
                      onTrash={() => setTrashConfirmOpen(true)}
                    />
                  ) : null)}
              </main>
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
          }}
        />
      )}
      {inviteOpen && (
        <GalleryInviteModal
          galleryId={gallery.id}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {collabOpen && (
        <CollabSessionsModal
          galleryId={gallery.id}
          onClose={() => setCollabOpen(false)}
        />
      )}
      {deliveryOpen && (
        <GalleryDeliveryConfirmModal
          selectedCount={selection?.selectedCount ?? 0}
          target={selection?.max ?? gallery.maxSelectablePhotoCount ?? 0}
          retouchCount={retouchCount}
          selectionSubmitted={selection?.status === "SUBMITTED"}
          onClose={() => setDeliveryOpen(false)}
          onConfirm={() => void handleMarkDelivered()}
        />
      )}
      {/* 휴지통 이동 확인 — 복원 가능한 이동이라 검정 확인 버튼 (시안 확정 문구) */}
      {trashConfirmOpen && (
        <GalleryModalShell
          title={`사진 ${pickedIds.length}장을 휴지통으로 옮길까요?`}
          desc="휴지통에서 복원할 수 있습니다. 보관 기간이 지나면 자동으로 완전히 삭제됩니다."
          onClose={() => setTrashConfirmOpen(false)}
        >
          <p className="mb-6 type-body-small text-fg-neutral-subtle">
            선택 목록과 카테고리에서도 함께 사라집니다.
          </p>
          <GalleryModalButtons
            onClose={() => setTrashConfirmOpen(false)}
            onConfirm={() => void handleTrashPicked()}
            confirmLabel="휴지통으로 이동"
          />
        </GalleryModalShell>
      )}
      {/* 완전 삭제 재확인 — 복구 불가, 유일한 빨간 버튼 */}
      {eraseConfirmOpen && (
        <GalleryModalShell
          title={`${pickedIds.length}장을 완전히 삭제할까요?`}
          desc="원본까지 삭제되고 복구할 수 없습니다."
          onClose={() => setEraseConfirmOpen(false)}
        >
          <GalleryModalButtons
            onClose={() => setEraseConfirmOpen(false)}
            onConfirm={() => void handleErasePicked()}
            confirmLabel="완전 삭제"
            confirmVariant="danger"
          />
        </GalleryModalShell>
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
      {ctxMenu && pickedIds.length > 0 && (
        <PhotoContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          count={pickedIds.length}
          onSelectAll={selectAllInView}
          onTrash={
            view === "trash"
              ? undefined
              : () => {
                  setCtxMenu(null);
                  setTrashConfirmOpen(true);
                }
          }
          onRestore={
            view === "trash"
              ? () => {
                  setCtxMenu(null);
                  void handleRestorePicked();
                }
              : undefined
          }
          onErase={
            view === "trash"
              ? () => {
                  setCtxMenu(null);
                  setEraseConfirmOpen(true);
                }
              : undefined
          }
          onClose={() => setCtxMenu(null)}
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
