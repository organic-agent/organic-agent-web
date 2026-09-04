"use client";

/**
 * 부부 — 갤러리 워크스페이스 (피그마 Client/Grid-Large·Grid-Small·Single-View 대응)
 * 위치: src/app/(couple)/gallery/page.tsx
 *
 * 시안의 단일 페이지: 모든 사진(전체)이 기본 뷰(Grid-Large)이고,
 * 선택 사진·카테고리는 사이드바 필터, 그리드/단일 보기 전환은 탑바에서 이뤄진다.
 * - Single-View: 필름스트립(64×80 썸네일) + 무대(bg.stage) 뷰어 + 툴바 별점(사진별 저장)
 * - 비교 보기도 페이지 내 모드(mode === "compare")로 동작 — 2장/4장 토글 + 별점
 * - 카테고리는 서버의 컨셉·상세 폴더와 사진별 작업 상태를 조회한다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AppToolbar } from "@/components/app/AppToolbar";
import {
  FilmstripChip,
  useFilmstripOpen,
} from "@/components/app/FilmstripChip";
import { AppRightRail } from "@/components/app/AppRightRail";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { NotificationBell } from "@/components/app/NotificationBell";
import { BrandLogo } from "@/components/BrandLogo";
import { useSidebar } from "@/components/SidebarProvider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/MenuItem";
import { StarRating } from "@/components/ui/StarRating";
import { InfoPanel } from "@/components/app/InfoPanel";
import { ZoomSelect, type ZoomLevel } from "@/components/app/ZoomSelect";
import { ComparePhotoCard } from "@/components/gallery/ComparePhotoCard";
import { PhotoCell } from "@/components/gallery/PhotoCell";
import { PhotoThumbnail } from "@/components/gallery/PhotoThumbnail";
import {
  BackIcon,
  MenuIcon,
  SortIcon,
  GridLargeIcon,
  GridSmallIcon,
  CompareIcon,
  SingleViewIcon,
  InfoIcon,
  SettingIcon,
  PhotoIcon,
  DropdownIcon,
} from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { submitSelection } from "@/lib/api/selection";
import { useGalleryPhotos } from "@/lib/galleryPhotos";
import { useRetouchOverview } from "@/lib/retouch";
import { CategoryTreeSection } from "@/app/(photographer)/galleries/[galleryId]/_components/CategoryTreeSection";
import { useCategoryOverview } from "@/app/(photographer)/galleries/[galleryId]/_lib/useCategoryOverview";
import {
  deadlineLabel,
  isDeadlinePassed,
  useInvitedGallery,
} from "./_lib/useInvitedGallery";
import { usePhotoRating } from "./_lib/usePhotoRating";
import { usePhotoSelection } from "./_lib/usePhotoSelection";
// 모달 셸은 작가 갤러리 모달들과 공용 (추후 공용 컴포넌트로 승격 예정)
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(photographer)/galleries/_components/GalleryModalShell";

// AI 연동 전 mock (시안 문구)
const MOCK_ANALYSIS = [
  { label: "피사체 선명도", value: "88점" },
  { label: "눈 선명도", value: "100점" },
  { label: "눈 뜨기", value: "좋음" },
];

/** 사이드바 필터: 모든 사진 / 선택 사진 / 카테고리 / 미분류 */
type GalleryView = "all" | "selected" | "unclassified" | `category:${number}`;
type ViewMode = "grid-large" | "grid-small" | "single" | "compare";

export default function CoupleGalleryWorkspacePage() {
  const [view, setView] = useState<GalleryView>("all");
  const [mode, setMode] = useState<ViewMode>("grid-large");
  const [currentPhotoId, setCurrentPhotoId] = useState<number | null>(null);
  const [rightPanel, setRightPanel] = useState<"info" | null>(null);
  const [compareCount, setCompareCount] = useState<2 | 4>(2);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  // 서버 작업 알림 토스트
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const savedToastTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(savedToastTimer.current), []);
  // 정렬(별점 순)·설정은 기획만 있고 미구현 — 준비 중 토스트로 안내
  const { showComingSoon, comingSoonToast } = useComingSoonToast();
  const { collapsed, toggle } = useSidebar();
  // 초대받은 갤러리(서버) — 목록 API가 부부에겐 초대 수락한 갤러리만 준다
  const { result: invited, reload: reloadInvited } = useInvitedGallery();
  const gallery = invited?.kind === "ready" ? invited.gallery : undefined;
  // 사이드바 헤더용 컨텍스트: 갤러리명 · 마감 D-day(마감되면 '선택 마감됨') · 목표 장수
  const closed = gallery?.status === "CLOSED";
  const dueLabel = closed
    ? "선택 마감됨"
    : gallery
      ? deadlineLabel(gallery.selectionDeadline)
      : undefined;
  const dueTone =
    !dueLabel || dueLabel.startsWith("D-")
      ? "text-fg-neutral-muted"
      : dueLabel === "오늘 마감"
        ? "text-fg-warning"
        : "text-fg-critical";
  // 편집 잠금 — 마감(CLOSED)이거나 선택 기한이 지났으면 셀렉·별점이 잠긴다.
  const deadlinePassed = gallery
    ? isDeadlinePassed(gallery.selectionDeadline)
    : false;
  const editLocked = closed || deadlinePassed;

  const galleryIdStr = gallery ? String(gallery.id) : "";
  // 셀렉은 서버가 진실. 담기/빼기는 낙관적 반영 후 거절 시 통째 롤백
  const {
    result: selectionResult,
    toggle: toggleSelected,
    replace: replaceSelection,
    refresh: refreshSelection,
  } = usePhotoSelection(galleryIdStr, notice);
  const selection =
    selectionResult?.kind === "ready" ? selectionResult.sel : null;
  const selectedIds = useMemo(() => selection?.selectedIds ?? [], [selection]);
  const selectedCount = selection?.selectedCount ?? 0;
  const selectTarget =
    selection?.max ?? gallery?.maxSelectablePhotoCount ?? null;
  const categories = useCategoryOverview(galleryIdStr);
  // ESC로 싱글·비교 뷰에서 빠져나갈 때 돌아갈 그리드 종류를 기억한다
  const lastGridModeRef = useRef<"grid-large" | "grid-small">("grid-large");
  // 별점 — 서버(score)가 진실, 방금 매긴 값만 오버레이 (기한이 지나면 읽기 전용)
  const { scoreOf, rate } = usePhotoRating(galleryIdStr, notice);
  const retouchOverview = useRetouchOverview(galleryIdStr);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 사진은 서버가 진실 — 서명 URL로 그리고 TTL 만료 전 재조회 (작가와 같은 공용 훅).
  // 부부는 무한 스크롤(incremental) — 첫 페이지만 받고 바닥 근접 시 이어 붙인다.
  const {
    result: photosResult,
    reload: reloadPhotos,
    refreshOnImageError,
    loadMore,
    loadingMore,
    loadMoreFailed,
  } = useGalleryPhotos(gallery ? String(gallery.id) : "", {
    incremental: true,
    pageSize: 100,
  });
  const allPhotos = useMemo(
    () => (photosResult?.kind === "ready" ? photosResult.photos : []),
    [photosResult],
  );
  const totalCount =
    photosResult?.kind === "ready" ? photosResult.totalCount : allPhotos.length;
  const hasMore = photosResult?.kind === "ready" && photosResult.hasMore;
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
  // 바닥 감지 — 마지막 행보다 600px 먼저 다음 페이지를 부른다 (조용한 이어 붙이기)
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  });
  // 셀렉 제출 모달에 보여줄 보정 요청 수
  const retouchCount = retouchOverview?.currentRound?.photos.length ?? 0;
  const photos =
    view === "selected"
      ? allPhotos.filter((photo) => selectedSet.has(photo.id))
      : activeDetailFolderId !== null
        ? allPhotos.filter((photo) => categoryPhotoIds.has(photo.id))
        : allPhotos;

  const title =
    view === "selected"
      ? "선택 사진"
      : view === "unclassified"
        ? "미분류 사진"
        : activeDetailFolder?.name ?? "모든 사진";

  const currentIndex = photos.findIndex((p) => p.id === currentPhotoId);
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : undefined;
  // 필름스트립 접기 (C안: 헤더 칩으로 흡수)
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

  // 마지막으로 머문 그리드 종류를 기억 (ESC 복귀용)
  useEffect(() => {
    if (mode === "grid-large" || mode === "grid-small") {
      lastGridModeRef.current = mode;
    }
  }, [mode]);

  // 단일·비교 보기: ←/→ 사진 이동, ESC로 그리드 복귀, F로 필름스트립 접기,
  // 싱글 뷰 한정 1~5 = 현재 사진 별점 · 0 = 지우기 (모달·입력 중이면 양보)
  useEffect(() => {
    if (mode !== "single" && mode !== "compare") return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;
      if (e.key === "ArrowLeft") movePhoto(-1);
      if (e.key === "ArrowRight") movePhoto(1);
      if (e.key === "Escape") setMode(lastGridModeRef.current);
      if (e.key === "f" || e.key === "F") toggleFilmstrip();
      if (
        mode === "single" &&
        !editLocked &&
        currentPhoto &&
        e.key >= "0" &&
        e.key <= "5"
      )
        void rate(currentPhoto.id, Number(e.key));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // 비교 모드: 현재 위치부터 compareCount장
  const compareStart = Math.max(
    0,
    Math.min(
      currentIndex >= 0 ? currentIndex : 0,
      photos.length - compareCount,
    ),
  );
  const comparePhotos = photos.slice(compareStart, compareStart + compareCount);
  // 비교 카드 폭 = "세로로 꽉 차는 폭(높이-별점 36px, 4:5)"과 "가로 N등분 폭" 중 작은 쪽
  // → 어떤 화면에서든 사진+별점이 스크롤 없이 한 화면에 들어간다 (cq 단위 = 비교 스테이지 기준)
  const compareImageWidth = `min(calc((100cqh - 36px) * 0.8), calc((100cqw - ${
    (compareCount - 1) * 24
  }px) / ${compareCount}))`;

  // 뷰 전환 토글 — 그리드에선 헤더 우측, 싱글·비교에선 필름스트립 우측 (작가 워크스페이스와 동일)
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

  // 콘텐츠 헤더 — 모든 뷰 공통. 현재 보고 있는 위치(제목)와 도구가 항상 같은 자리에 있다.
  // 뷰 4버튼은 오른쪽에 고정하고 줌은 그 왼쪽에 둔다.
  const contentHeader = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-fg-neutral">
        <PhotoIcon size={20} />
        <h1 className="type-body-medium text-fg-neutral">{title}</h1>
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
          {photos.length}/{totalCount} 장의 사진
        </p>
      </div>
    </div>
  );

  // 필름스트립 (단일·비교 공용 — 피그마 App/Filmstrip)
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

  // 패널이 보여줄 사진 (단일 보기의 현재 사진, 그리드에선 목록 첫 사진)
  const panelPhoto = currentPhoto ?? photos[0];
  const panelFileInfo = panelPhoto
    ? [
        { label: "파일 이름", value: panelPhoto.name },
        // 촬영 일시·크기는 사진 메타 API 확장 전까지 표기 보류
        { label: "형식", value: panelPhoto.format || "-" },
        { label: "카테고리", value: activeDetailFolder?.name ?? "-" },
      ]
    : [];

  // 갤러리 컨텍스트 상태별 화면 — 로딩 / 초대 없음 / 실패
  if (!gallery) {
    const state =
      invited === null
        ? {
            title: "갤러리를 불러오는 중이에요",
            desc: "잠시만 기다려 주세요.",
            retry: false,
          }
        : invited.kind === "none"
          ? {
              title: "아직 초대받은 갤러리가 없어요",
              desc: "작가님이 보낸 초대 링크로 들어오면 갤러리가 여기에 열려요.",
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
          {state.retry && <Button onClick={reloadInvited}>다시 시도</Button>}
        </div>
      </div>
    );
  }

  // 하단 알림 토스트 — 저장·이름 변경·이동의 성공/실패 공용
  function notice(message: string) {
    window.clearTimeout(savedToastTimer.current);
    setSavedToast(message);
    savedToastTimer.current = window.setTimeout(() => setSavedToast(null), 2400);
  }

  /** 셀렉 제출 — 성공 응답(SUBMITTED)이 훅에 반영되며 담기/빼기가 잠긴다 */
  async function handleSubmitSelection() {
    if (!gallery) return;
    try {
      const res = await submitSelection(gallery.id);
      replaceSelection(res);
      setSubmitOpen(false);
      notice("작가에게 전달했어요");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // 이미 제출돼 있음 — 다른 한 명이 먼저 누른 것. 조용히 최신으로
        refreshSelection();
        setSubmitOpen(false);
        notice(
          "이미 작가에게 전달했어요 — 변경이 필요하면 작가에게 요청해 주세요",
        );
        return;
      }
      // 실패 — 모달을 열어 둔 채 이유만 알린다 (0장 400 포함, 서버 문구 그대로)
      notice(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-layer-default">
      {/* 풀와이드 탑바 — 작가 워크스페이스와 동일 문법 (사용자 결정) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-stroke-neutral-muted bg-bg-layer-default px-3">
        <div className="flex items-center gap-1">
          <IconButton
            icon={<MenuIcon size={20} />}
            onClick={toggle}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          />
          {/* 로고 클릭 = 모든 사진 그리드로 복귀 (게스트 화면과 같은 동작) */}
          <button
            type="button"
            onClick={() => {
              setView("all");
              setMode(lastGridModeRef.current);
            }}
            className="mx-2 flex cursor-pointer items-center gap-2 text-fg-neutral"
            aria-label="갤러리 홈"
          >
            <BrandLogo size={28} />
            <b className="type-brand-wordmark">Easy Select</b>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <IconButton
            icon={<SettingIcon size={20} />}
            onClick={showComingSoon}
            aria-label="설정"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {!collapsed && (
          <aside className="hidden w-70 shrink-0 flex-col border-r border-stroke-neutral-muted bg-bg-layer-default md:flex">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {/* 갤러리 컨텍스트 헤더 — 어떤 촬영을, 언제까지, 몇 장 고르는지 */}
        <div className="flex w-full flex-col gap-1">
          <h1 className="truncate type-heading-card text-fg-neutral">
            {gallery.title}
          </h1>
          <p className="type-body-small text-fg-neutral-muted">
            {dueLabel && (
              <>
                <span className={dueTone}>
                  {closed ? dueLabel : `마감 ${dueLabel}`}
                </span>
                {" · "}
              </>
            )}
            <span className="text-fg-accent">
              {selectedCount}
              {selectTarget !== null ? `/${selectTarget}` : ""}장
            </span>{" "}
            선택
          </p>
        </div>

        <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />

        <div className="flex w-full flex-col gap-1">
          <MenuItem
            icon={<PhotoIcon size={20} />}
            label="모든 사진"
            count={allPhotos.length}
            selected={view === "all"}
            onClick={() => setView("all")}
          />
          <MenuItem
            icon={<PhotoIcon size={20} />}
            label="선택 사진"
            count={
              selectTarget !== null
                ? `${selectedCount}/${selectTarget}`
                : selectedCount
            }
            accentCount
            selected={view === "selected"}
            onClick={() => setView("selected")}
          />
          {/* 셀렉 제출 — 워크플로 종결 액션. 마감되면 숨김(시안 v3 잠김 문법),
              제출 여부는 서버(photo-selection.status)가 진실 */}
          {!closed &&
            selection &&
            (selection.status === "SUBMITTED" ? (
              <p className="flex items-center gap-1.5 px-3 py-2 type-body-small text-fg-neutral-muted">
                <span className="text-fg-positive">✓</span> 작가에게 전달됨
              </p>
            ) : (
              <Button
                kind="accent"
                onClick={() => setSubmitOpen(true)}
                className="mt-1 w-full"
              >
                작가에게 전달하기
              </Button>
            ))}
        </div>

        <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />

        <CategoryTreeSection
          result={categories.result}
          activeDetailFolderId={activeDetailFolderId}
          onSelectDetailFolder={(detailFolderId) => {
            setView(`category:${detailFolderId}`);
          }}
          onSelectUnclassified={() => {
            setView("unclassified");
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

            {/* 뷰어 (피그마 App/Viewer — bg.stage 무대 배경) — 사진이 잔여 공간 전부 사용 */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-bg-stage p-3">
              {/* 이전/다음 — 다크 스테이지 위 반투명 원형 버튼 */}
              <button
                type="button"
                onClick={() => movePhoto(-1)}
                aria-label="이전 사진"
                className="absolute left-5 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-bg-accent-solid text-fg-neutral-inverted transition-colors duration-fast hover:bg-bg-accent-solid-hover"
              >
                <BackIcon size={20} />
              </button>
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
              <button
                type="button"
                onClick={() => movePhoto(1)}
                aria-label="다음 사진"
                className="absolute right-5 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-bg-accent-solid text-fg-neutral-inverted transition-colors duration-fast hover:bg-bg-accent-solid-hover"
              >
                <BackIcon size={20} className="rotate-180" />
              </button>
            </div>
          </main>
        ) : mode === "compare" ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="px-4 pt-4 pb-3">{contentHeader}</div>
            {filmstripOpen && filmstrip}

            {/* 비교 바 (피그마 compare-bar — N장 보기 전환) */}
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

            {/* 비교 스테이지 — 카드 클릭 = 셀렉 토글. 컨테이너 쿼리로 카드 크기를 역산 */}
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
                    label={`${photo.name} 선택 토글`}
                    selected={selectedSet.has(photo.id)}
                    onToggleSelected={() => toggleSelected(photo.id)}
                    rating={scoreOf(photo)}
                    onRate={
                      editLocked
                        ? undefined
                        : (value) => void rate(photo.id, value)
                    }
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
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 scrollbar-gutter-stable">
            {photosResult === null ? (
              // 사진 목록 조회 중 — 정적 스켈레톤 셀 (shimmer는 '분석 준비 중' 전용)
              <div
                className="grid w-full justify-center gap-2"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, ${Math.round(
                    (mode === "grid-small" ? 160 : 200) * zoom,
                  )}px)`,
                }}
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-4/5 w-full rounded-(--radius-4) bg-bg-disabled"
                  />
                ))}
              </div>
            ) : photosResult.kind === "error" ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="type-body-medium text-fg-neutral-muted">
                  사진을 불러오지 못했어요. 네트워크를 확인한 뒤 다시 시도해
                  주세요.
                </p>
                <Button size="sm" onClick={reloadPhotos}>
                  다시 불러오기
                </Button>
              </div>
            ) : photos.length === 0 ? (
              <p className="type-body-medium text-fg-neutral-muted py-16 text-center">
                {view === "selected"
                  ? "아직 선택한 사진이 없어요."
                  : "아직 사진이 없어요 — 작가님이 올리면 여기에 보여요."}
              </p>
            ) : (
              /* 셀 폭 = 기준(라지 200 · 스몰 160, 사용자 확정값) × 줌 배율 —
                 크기는 사용자가 정하고 열 수는 화면이 정한다. 자투리 공간은 중앙 정렬로 분배. */
              <div
                className="grid w-full justify-center gap-2"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, ${Math.round(
                    (mode === "grid-small" ? 160 : 200) * zoom,
                  )}px)`,
                }}
              >
                {photos.map((photo) => (
                  /* 클릭 = 선택 토글, 더블클릭 = 크게 보기 (라이트룸류 셀렉 툴 문법) */
                  <PhotoCell
                    key={photo.id}
                    onClick={() => toggleSelected(photo.id)}
                    onDoubleClick={() => openPhoto(photo.id)}
                    variant={mode === "grid-small" ? "small" : "large"}
                    selectable
                    selected={selectedSet.has(photo.id)}
                    name={photo.name}
                    format={photo.format}
                    label={
                      selectedSet.has(photo.id)
                        ? `${photo.name} 선택 해제`
                        : `${photo.name} 선택`
                    }
                    imageUrl={photo.url}
                    preparing={photo.preparing}
                    onImageError={refreshOnImageError}
                  />
                ))}
              </div>
            )}
            {/* 무한 스크롤 — 다음 페이지 로드 중엔 스켈레톤 한 줄, 실패 시 그 자리 한 줄
                (폴더 미리보기 중엔 묶음 단위라 무한 스크롤이 쉬어 간다) */}
            {view === "all" && loadingMore && (
              <div
                aria-hidden
                className="mt-2 grid w-full justify-center gap-2"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, ${Math.round(
                    (mode === "grid-small" ? 160 : 200) * zoom,
                  )}px)`,
                }}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-4/5 w-full rounded-(--radius-4) bg-bg-disabled"
                  />
                ))}
              </div>
            )}
            {view === "all" && loadMoreFailed && (
              <p className="mt-3 rounded-(--radius-8) bg-bg-layer-default-hover py-2 text-center type-body-small text-fg-neutral-muted">
                더 불러오지 못했어요 ·{" "}
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="cursor-pointer font-bold text-fg-neutral hover:underline"
                >
                  다시 시도
                </button>
              </p>
            )}
            {view === "all" && hasMore && !loadMoreFailed && (
              <div ref={sentinelRef} aria-hidden className="h-px" />
            )}
            </div>
          </main>
        )}

        {rightPanel === "info" && panelPhoto && (
          <InfoPanel
            analysis={MOCK_ANALYSIS}
            fileInfo={panelFileInfo}
          />
        )}
        </div>

        <AppToolbar
          left={
            <span className="type-body-small text-fg-neutral-muted">
              {currentPhoto
                ? `${currentIndex + 1} / ${photos.length}`
                : `${selectedCount} / ${allPhotos.length}`}
            </span>
          }
          center={
            currentPhoto ? (
              <StarRating
                value={scoreOf(currentPhoto)}
                onChange={
                  editLocked
                    ? undefined
                    : (v) => void rate(currentPhoto.id, v)
                }
              />
            ) : (
              <StarRating value={0} />
            )
          }
        />
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

      {/* 열 때마다 마운트해 디자인 탭 편집본이 저장값에서 새로 시작하게 한다 */}

      {/* 셀렉 제출 확인 — 확정하면 POST /submit, 이후 담기/빼기는 서버가 잠근다 */}
      {submitOpen && (
        <GalleryModalShell
          title="작가에게 전달할까요?"
          desc="전달하면 작가가 선택 결과를 확인하고 다음 작업을 시작해요."
          onClose={() => setSubmitOpen(false)}
        >
          <div className="mb-6 flex flex-col gap-2 rounded-(--radius-8) border border-stroke-neutral-muted px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <span className="type-body-small text-fg-neutral-muted">
                선택한 사진
              </span>
              <strong className="type-label-button text-fg-neutral">
                {selectedCount}
                {selectTarget !== null ? ` / ${selectTarget}` : ""}장
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="type-body-small text-fg-neutral-muted">
                보정 요청
              </span>
              <strong className="type-label-button text-fg-neutral">
                {retouchCount}건
              </strong>
            </div>
            {selectTarget !== null && selectedCount < selectTarget && (
              <p className="mt-1 border-t border-stroke-neutral-muted pt-2 type-body-small text-fg-warning">
                목표 장수({selectTarget}장)보다 적게 선택했어요. 전달 후에는
                선택을 바꿀 수 없어요.
              </p>
            )}
          </div>
          <GalleryModalButtons
            onClose={() => setSubmitOpen(false)}
            onConfirm={() => void handleSubmitSelection()}
            confirmLabel="전달하기"
            confirmVariant="accent"
          />
        </GalleryModalShell>
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
