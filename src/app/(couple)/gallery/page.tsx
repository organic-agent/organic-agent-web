"use client";

/**
 * 부부 — 갤러리 워크스페이스 (피그마 Client/Grid-Large·Grid-Small·Single-View 대응)
 * 위치: src/app/(couple)/gallery/page.tsx
 *
 * 시안의 단일 페이지: 모든 사진(전체)이 기본 뷰(Grid-Large)이고,
 * 선택 사진·앨범은 사이드바 필터, 그리드/단일 보기 전환은 탑바에서 이뤄진다.
 * - Single-View: 필름스트립(64×80 썸네일) + 무대(bg.stage) 뷰어 + 툴바 별점(사진별 저장)
 * - 비교 보기도 페이지 내 모드(mode === "compare")로 동작 — 2장/4장 토글 + 별점
 * - 자동 분류 패널은 데모 상태만 동작(실제 분류는 AI 연동 시 합류)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AppToolbar } from "@/components/app/AppToolbar";
import {
  FilmstripChip,
  useFilmstripOpen,
} from "@/components/app/FilmstripChip";
import { AppRightRail } from "@/components/app/AppRightRail";
import { AssistPanel } from "@/components/app/AssistPanel";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { NotificationBell } from "@/components/app/NotificationBell";
import { BrandLogo } from "@/components/BrandLogo";
import { useSidebar } from "@/components/SidebarProvider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem } from "@/components/ui/MenuItem";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { StarRating } from "@/components/ui/StarRating";
import { InfoPanel } from "@/components/app/InfoPanel";
import { ReactionPanel } from "@/components/app/ReactionPanel";
import { ShareModal } from "@/components/app/ShareModal";
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
  ShareIcon,
  InfoIcon,
  SettingIcon,
  ReactionIcon,
  PhotoIcon,
  DropdownIcon,
} from "@/components/icons";
import {
  EMPTY_REACTION,
  SELECT_TARGET,
  addToSelected,
  removeFromSelected,
  setPhotoMemo,
  setPhotoRating,
  setRetouchRequest,
  useGalleryFolders,
  usePhotoMemos,
  usePhotoRatings,
  usePhotoReactions,
  useRetouchRequests,
  useSelectedIds,
} from "@/lib/couple";
import { getOverdueLabel, updateGallery, useGalleries } from "@/lib/galleries";
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

/** 사이드바 필터: 모든 사진 / 선택 사진 / 특정 앨범 */
type GalleryView = "all" | "selected" | `album:${string}`;
type ViewMode = "grid-large" | "grid-small" | "single" | "compare";

export default function CoupleGalleryWorkspacePage() {
  const [view, setView] = useState<GalleryView>("all");
  const [mode, setMode] = useState<ViewMode>("grid-large");
  const [currentPhotoId, setCurrentPhotoId] = useState<number | null>(null);
  const [rightPanel, setRightPanel] = useState<"reaction" | "info" | null>(
    null,
  );
  const [compareCount, setCompareCount] = useState<2 | 4>(2);
  const [shareOpen, setShareOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  // 자동 분류 데모 상태 (실제 분류는 AI 연동 시 합류)
  // 자동 분류 데모 상태 — 부부 화면의 실연동(클러스터 조회·앨범 저장)은 06에서
  const [assistOn, setAssistOn] = useState(true);
  const [assistLevelIndex, setAssistLevelIndex] = useState(2);
  // 정렬(별점 순)·설정은 기획만 있고 미구현 — 준비 중 토스트로 안내
  const { showComingSoon, comingSoonToast } = useComingSoonToast();
  const { collapsed, toggle } = useSidebar();
  const selectedIds = useSelectedIds();
  const folders = useGalleryFolders();
  // 부부 계정에 연결된 갤러리 — 초대 연동 전까지 작가 목업 1번을 내 갤러리로 간주
  const myGallery = useGalleries().find((g) => g.id === "1");
  // 사이드바 헤더용 컨텍스트: 갤러리명 · 마감 D-day · 목표 장수
  const dueLabel = myGallery ? getOverdueLabel(myGallery) : undefined;
  const dueTone =
    !dueLabel || dueLabel.startsWith("D-")
      ? "text-fg-neutral-muted"
      : dueLabel === "오늘 마감"
        ? "text-fg-warning"
        : "text-fg-critical";
  const selectTarget = myGallery?.target ?? SELECT_TARGET;
  // ESC로 싱글·비교 뷰에서 빠져나갈 때 돌아갈 그리드 종류를 기억한다
  const lastGridModeRef = useRef<"grid-large" | "grid-small">("grid-large");
  const ratings = usePhotoRatings();
  const memos = usePhotoMemos();
  const retouchRequests = useRetouchRequests();
  const reactions = usePhotoReactions();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allPhotos = useMemo(() => folders.flatMap((f) => f.photos), [folders]);
  // 셀렉 제출 모달에 보여줄 보정 요청 수
  const retouchCount = allPhotos.filter((photo) =>
    (retouchRequests[photo.id] ?? "").trim(),
  ).length;
  // 앨범은 AI 자동 분류가 만들 예정 — 연동 전까지 첫 화면은 빈 상태
  const albums = useMemo<typeof folders>(() => [], []);
  // 앨범 첫 사진 배지(앨범 사진 수) + 사진→앨범 라벨 (Info 패널용)
  const albumBadgeByPhotoId = useMemo(() => {
    const map = new Map<number, number>();
    for (const f of albums) {
      const first = f.photos[0];
      if (first) map.set(first.id, f.photos.length);
    }
    return map;
  }, [albums]);
  const albumLabelByPhotoId = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of albums) for (const p of f.photos) map.set(p.id, f.label);
    return map;
  }, [albums]);

  const activeAlbum = view.startsWith("album:")
    ? albums.find((f) => f.key === view.slice("album:".length))
    : undefined;

  const photos =
    view === "selected"
      ? allPhotos.filter((photo) => selectedSet.has(photo.id))
      : activeAlbum
        ? activeAlbum.photos
        : allPhotos;

  const title =
    view === "selected"
      ? "선택 사진"
      : activeAlbum
        ? activeAlbum.label
        : "모든 사진";

  const currentIndex = photos.findIndex((p) => p.id === currentPhotoId);
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : undefined;
  // 필름스트립 접기 (C안: 헤더 칩으로 흡수 — localStorage에 기억)
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

  function toggleSelected(photoId: number) {
    if (selectedSet.has(photoId)) removeFromSelected(photoId);
    else addToSelected([photoId]);
  }

  // 마지막으로 머문 그리드 종류를 기억 (ESC 복귀용)
  useEffect(() => {
    if (mode === "grid-large" || mode === "grid-small") {
      lastGridModeRef.current = mode;
    }
  }, [mode]);

  // 단일·비교 보기: ←/→ 사진 이동, ESC로 그리드 복귀, F로 필름스트립 접기
  // (모달이 열려 있으면 모달이 우선)
  useEffect(() => {
    if (mode !== "single" && mode !== "compare") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") movePhoto(-1);
      if (e.key === "ArrowRight") movePhoto(1);
      if (e.key === "Escape" && !shareOpen) setMode(lastGridModeRef.current);
      if (e.key === "f" || e.key === "F") toggleFilmstrip();
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
  // 뷰 4버튼은 클러스터 맨 오른쪽 고정, 뷰에 따라 생기는 줌은 그 왼쪽에 끼어 토글이 안 움직인다.
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
          {photos.length}/{allPhotos.length} 장의 사진
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
          label={`사진 ${photo.id}`}
          selected={photo.id === currentPhoto?.id}
          badge={view === "all" ? albumBadgeByPhotoId.get(photo.id) : undefined}
        />
      ))}
    </div>
  );

  // 패널이 보여줄 사진 (단일 보기의 현재 사진, 그리드에선 목록 첫 사진)
  const panelPhoto = currentPhoto ?? photos[0];
  const panelFileInfo = panelPhoto
    ? [
        {
          label: "파일 이름",
          value: `#${String(panelPhoto.id).padStart(3, "0")}.JPG`,
        },
        { label: "촬영 일시", value: "2025.10.13 19:47" },
        { label: "크기", value: "3072×4608 · 7.1MB" },
        { label: "형식", value: "JPG" },
        { label: "앨범", value: albumLabelByPhotoId.get(panelPhoto.id) ?? "-" },
        { label: "묶음", value: "4장 중 2번째" },
      ]
    : [];
  // 게스트가 남긴 반응 (photoReactions 스토어 — /guest/[token] 게스트 화면과 공유)
  const panelReaction = panelPhoto
    ? (reactions[panelPhoto.id] ?? EMPTY_REACTION)
    : EMPTY_REACTION;
  const reactionLikesLabel = panelReaction.likes.length
    ? `${panelReaction.likes.length}명이 좋아해요`
    : "아직 좋아요가 없어요";
  const reactionComments = panelReaction.comments.map((comment) => ({
    initial: comment.initial,
    meta: `${comment.author} · ${comment.timeLabel}`,
    text: comment.text,
  }));

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
            icon={<ShareIcon size={20} />}
            selected={shareOpen}
            onClick={() => setShareOpen(true)}
            aria-label="공유 및 초대"
          />
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
        {/* 갤러리 컨텍스트 헤더 — 어떤 촬영을, 언제까지, 몇 장 고르는지 (MYBOX 앨범 헤더 문법) */}
        <div className="flex w-full flex-col gap-1">
          <h1 className="truncate type-heading-card text-fg-neutral">
            {myGallery?.couple ?? "우리의 갤러리"}
          </h1>
          <p className="type-body-small text-fg-neutral-muted">
            {dueLabel && (
              <>
                <span className={dueTone}>마감 {dueLabel}</span>
                {" · "}
              </>
            )}
            <span className="text-fg-accent">
              {selectedIds.length}/{selectTarget}장
            </span>{" "}
            선택
          </p>
        </div>

        <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />

        <AssistPanel
          checked={assistOn}
          onCheckedChange={setAssistOn}
          levelIndex={assistLevelIndex}
          onLevelChange={setAssistLevelIndex}
          summary="폴더 4개 · 나머지 사진 2장"
          onSave={() => {}}
        />

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
            count={`${selectedIds.length}/${selectTarget}`}
            accentCount
            selected={view === "selected"}
            onClick={() => setView("selected")}
          />
          {/* 셀렉 제출 — 워크플로 종결 액션 (제출되면 작가 쪽 상태가 '셀렉 완료'로 바뀐다) */}
          {myGallery &&
            (myGallery.selectionSubmittedAt ? (
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

        <PanelHeader>앨범</PanelHeader>
        {albums.length === 0 ? (
          <p className="px-3 type-body-small text-fg-neutral-muted">
            자동 분류를 실행하면 앨범이 만들어져요
          </p>
        ) : (
          <nav className="flex w-full flex-col gap-1">
            {albums.map((item) => (
              <MenuItem
                key={item.key}
                label={item.label}
                count={item.photos.length}
                selected={view === `album:${item.key}`}
                onClick={() => setView(`album:${item.key}`)}
              />
            ))}
          </nav>
        )}
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
              {/* 이전/다음 — 다크 스테이지 위 반투명 원형 버튼 (카카오톡 앨범·구글 포토 문법) */}
              <button
                type="button"
                onClick={() => movePhoto(-1)}
                aria-label="이전 사진"
                className="absolute left-5 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-bg-accent-solid text-fg-neutral-inverted transition-colors duration-fast hover:bg-bg-accent-solid-hover"
              >
                <BackIcon size={20} />
              </button>
              {currentPhoto ? (
                /* TODO: 실제 이미지로 교체 — 그 전까지 시안의 회색 플레이스홀더 */
                <div
                  aria-label={`사진 ${currentPhoto.id} 크게 보기`}
                  className="aspect-4/5 h-full bg-bg-disabled"
                />
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

            {/* 비교 스테이지 — 카드 클릭 = 선택 앨범 토글. 컨테이너 쿼리로 카드 크기를 역산 */}
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
                    label={`사진 ${photo.id} 선택 토글`}
                    selected={selectedSet.has(photo.id)}
                    onToggleSelected={() => toggleSelected(photo.id)}
                    rating={ratings[photo.id] ?? 0}
                    onRate={(value) => setPhotoRating(photo.id, value)}
                  />
                ))
              )}
            </div>
          </main>
        ) : (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* 헤더는 스크롤 영역 밖 — 뷰 전환·스크롤에도 도구 위치 고정 */}
            <div className="px-4 pt-4 pb-3">{contentHeader}</div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 scrollbar-gutter-stable">
            {photos.length === 0 ? (
              <p className="type-body-medium text-fg-neutral-muted py-16 text-center">
                아직 담긴 사진이 없어요.
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
                    name={`#${String(photo.id).padStart(3, "0")}`}
                    format="JPG"
                    label={
                      selectedSet.has(photo.id)
                        ? `사진 ${photo.id} 선택 해제`
                        : `사진 ${photo.id} 선택`
                    }
                  />
                ))}
              </div>
            )}
            </div>
          </main>
        )}

        {rightPanel === "reaction" && (
          <ReactionPanel
            likesLabel={reactionLikesLabel}
            comments={reactionComments}
          />
        )}
        {rightPanel === "info" && panelPhoto && (
          <InfoPanel
            analysis={MOCK_ANALYSIS}
            fileInfo={panelFileInfo}
            memo={memos[panelPhoto.id] ?? ""}
            onMemoChange={(value) => setPhotoMemo(panelPhoto.id, value)}
            retouchRequest={retouchRequests[panelPhoto.id] ?? ""}
            onRetouchRequestChange={(value) =>
              setRetouchRequest(panelPhoto.id, value)
            }
          />
        )}
        </div>

        <AppToolbar
          left={
            <span className="type-body-small text-fg-neutral-muted">
              {currentPhoto
                ? `${currentIndex + 1} / ${photos.length}`
                : `${selectedIds.length} / ${allPhotos.length}`}
            </span>
          }
          center={
            currentPhoto ? (
              <StarRating
                value={ratings[currentPhoto.id] ?? 0}
                onChange={(v) => setPhotoRating(currentPhoto.id, v)}
              />
            ) : (
              <StarRating value={0} />
            )
          }
        />
        </div>

        <AppRightRail>
          <IconButton
            icon={<ReactionIcon size={20} />}
            selected={rightPanel === "reaction"}
            onClick={() =>
              setRightPanel(rightPanel === "reaction" ? null : "reaction")
            }
            aria-label="반응 패널"
          />
          <IconButton
            icon={<InfoIcon size={20} />}
            selected={rightPanel === "info"}
            onClick={() => setRightPanel(rightPanel === "info" ? null : "info")}
            aria-label="정보 패널"
          />
        </AppRightRail>
      </div>

      {/* 열 때마다 마운트해 디자인 탭 편집본이 저장값에서 새로 시작하게 한다 */}
      {shareOpen && <ShareModal open onClose={() => setShareOpen(false)} />}

      {/* 셀렉 제출 확인 — 제출하면 작가 갤러리 상태가 '셀렉 완료'로 바뀐다 */}
      {submitOpen && myGallery && (
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
                {selectedIds.length} / {selectTarget}장
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
            {selectedIds.length < selectTarget && (
              <p className="mt-1 border-t border-stroke-neutral-muted pt-2 type-body-small text-fg-warning">
                목표 장수({selectTarget}장)보다 적게 선택했어요. 전달 후에는
                선택을 바꿀 수 없어요.
              </p>
            )}
          </div>
          <GalleryModalButtons
            onClose={() => setSubmitOpen(false)}
            onConfirm={() => {
              updateGallery(myGallery.id, {
                selectionSubmittedAt: new Date().toISOString(),
              });
              setSubmitOpen(false);
            }}
            confirmLabel="전달하기"
            confirmVariant="accent"
          />
        </GalleryModalShell>
      )}
      {comingSoonToast}
    </div>
  );
}
