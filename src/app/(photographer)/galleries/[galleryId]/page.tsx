"use client";

/**
 * 작가 — 갤러리 워크스페이스 (피그마 Photographer/Gallery-Sidebar 대응)
 * 위치: src/app/(photographer)/galleries/[galleryId]/page.tsx
 *
 * 부부 워크스페이스와 같은 뷰 4종(그리드 라지/스몰·비교·싱글)을 공유하되 껍데기가 다르다:
 * - 풀와이드 탑바: 사이드바 토글 + 로고(홈 복귀) + 뷰 전환 + 줌 | 전달 완료 버튼(조건부) + 알림 + 초대 + 프로필
 * - 사이드바: 갤러리명·상태 칩 + 상태 전환(열기/마감/재오픈) + 사진 업로드 + 자동 분류 + 필터 + 앨범
 * - 별점·선택은 부부의 것이라 전부 읽기 전용, 하단 툴바는 비교·싱글 뷰에서만
 * - 우측 레일: 댓글(부부 보정 요청 포함) · 정보(파일 정보만)
 *
 * 갤러리 메타(제목·상태·마감일·계약 장수)는 서버(GET /galleries/{id})가 진실이고,
 * 사진·별점·전달 플래그는 아직 목업(04 업로드·05 분류·07 보정에서 서버 전환)이다.
 */

import { useEffect, useMemo, useState } from "react";
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
import { PanelHeader } from "@/components/ui/PanelHeader";
import { StarRating } from "@/components/ui/StarRating";
import { GalleryStatusChip } from "@/components/photographer/GalleryStatusChip";
import {
  EMPTY_REACTION,
  useGalleryFolders,
  usePhotoRatings,
  usePhotoReactions,
  useRetouchRequests,
  useSelectedIds,
} from "@/lib/couple";
import { updateGallery, useGalleries } from "@/lib/galleries";
import { useStudioInfo } from "@/lib/studio";
import { GalleryDeliveryConfirmModal } from "./_components/GalleryDeliveryConfirmModal";
import { GalleryInviteModal } from "./_components/GalleryInviteModal";
import {
  CloseGalleryConfirmModal,
  OpenGalleryConfirmModal,
  ReopenGalleryModal,
} from "./_components/GalleryStatusModals";
import { GalleryUploadModal } from "./_components/GalleryUploadModal";
import { useGalleryDetail } from "./_lib/useGalleryDetail";

// AI 연동 전 mock (시안 문구 — 부부 워크스페이스와 동일)
const MOCK_ANALYSIS = [
  { label: "피사체 선명도", value: "88점" },
  { label: "눈 선명도", value: "100점" },
  { label: "눈 뜨기", value: "좋음" },
];

/** 사이드바 필터: 모든 사진 / 부부 선택 사진 / 특정 앨범 */
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
  // 자동 분류 데모 상태 (실제 분류는 AI 연동 시 합류)
  const [assistTime, setAssistTime] = useState(true);
  const [assistTimeSeconds, setAssistTimeSeconds] = useState(60);
  const [assistSimilarity, setAssistSimilarity] = useState(false);
  const [assistSimilarityValue, setAssistSimilarityValue] = useState(50);

  const selectedIds = useSelectedIds();
  const folders = useGalleryFolders();
  const ratings = usePhotoRatings();
  const retouchRequests = useRetouchRequests();
  const reactions = usePhotoReactions();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allPhotos = useMemo(() => folders.flatMap((f) => f.photos), [folders]);
  // 앨범은 부부의 AI 자동 분류가 만들 예정 — 연동 전까지 빈 상태 (부부 화면과 동일, 사용자 결정)
  const albums = useMemo<typeof folders>(() => [], []);
  const albumLabelByPhotoId = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of albums) for (const p of f.photos) map.set(p.id, f.label);
    return map;
  }, [albums]);
  const albumBadgeByPhotoId = useMemo(() => {
    const map = new Map<number, number>();
    for (const f of albums) {
      const first = f.photos[0];
      if (first) map.set(first.id, f.photos.length);
    }
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

  const title =
    view === "selected"
      ? "선택 사진"
      : activeAlbum
        ? activeAlbum.label
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
          label={`사진 ${photo.id}`}
          selected={photo.id === currentPhoto?.id}
          badge={view === "all" ? albumBadgeByPhotoId.get(photo.id) : undefined}
        />
      ))}
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
          {photos.length}/{allPhotos.length} 장의 사진
        </p>
      </div>
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
        {
          label: "부부 별점",
          value: `${ratings[panelPhoto.id] ?? 0} / 5`,
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
                timeChecked={assistTime}
                onTimeChange={setAssistTime}
                timeValue={assistTimeSeconds}
                onTimeValueChange={setAssistTimeSeconds}
                similarityChecked={assistSimilarity}
                onSimilarityChange={setAssistSimilarity}
                similarityValue={assistSimilarityValue}
                onSimilarityValueChange={setAssistSimilarityValue}
                summary="묶음 4개 · 묶이지 않은 사진 2개"
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
                  count={
                    gallery.maxSelectablePhotoCount !== null
                      ? `${selectedIds.length}/${gallery.maxSelectablePhotoCount}`
                      : selectedIds.length
                  }
                  selected={view === "selected"}
                  onClick={() => setView("selected")}
                />
              </div>

              <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />

              <PanelHeader>앨범</PanelHeader>
              {albums.length === 0 ? (
                <p className="px-3 type-body-small text-fg-neutral-muted">
                  부부가 자동 분류로 앨범을 만들면 여기에 보여요
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
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-bg-stage p-3">
                  {currentPhoto ? (
                    <div
                      aria-label={`사진 ${currentPhoto.id} 크게 보기`}
                      className="aspect-4/5 h-full bg-bg-disabled"
                    />
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
                        label={`사진 ${photo.id}`}
                        selected={selectedSet.has(photo.id)}
                        rating={ratings[photo.id] ?? 0}
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
                  <p className="py-16 text-center type-body-medium text-fg-neutral-muted">
                    아직 담긴 사진이 없어요.
                  </p>
                ) : (
                  <div
                    className="grid w-full justify-center gap-2"
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, ${Math.round(
                        (mode === "grid-small" ? 160 : 200) * zoom,
                      )}px)`,
                    }}
                  >
                    {photos.map((photo) => (
                      <PhotoCell
                        key={photo.id}
                        onClick={() => setCurrentPhotoId(photo.id)}
                        variant={mode === "grid-small" ? "small" : "large"}
                        focused={photo.id === currentPhoto?.id}
                        name={`#${String(photo.id).padStart(3, "0")}`}
                        format="JPG"
                        label={`사진 ${photo.id}`}
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
                <StarRating
                  value={currentPhoto ? (ratings[currentPhoto.id] ?? 0) : 0}
                />
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
          onClose={() => setUploadOpen(false)}
          onConfirm={() => {
            if (legacy) {
              updateGallery(legacy.id, {
                uploaded: true,
                total: allPhotos.length,
              });
            }
            setUploadOpen(false);
          }}
        />
      )}
      {inviteOpen && (
        <GalleryInviteModal
          onClose={() => setInviteOpen(false)}
          onConfirm={() => {
            if (legacy) updateGallery(legacy.id, { invited: true });
            setInviteOpen(false);
          }}
        />
      )}
      {deliveryOpen && (
        <GalleryDeliveryConfirmModal
          selectedCount={selectedIds.length}
          target={gallery.maxSelectablePhotoCount ?? 0}
          retouchCount={retouchCount}
          selectionSubmitted={legacy?.selectionSubmittedAt != null}
          onClose={() => setDeliveryOpen(false)}
          onConfirm={() => {
            if (legacy) updateGallery(legacy.id, { delivered: true });
            setDeliveryOpen(false);
          }}
        />
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
      {comingSoonToast}
    </div>
  );
}
