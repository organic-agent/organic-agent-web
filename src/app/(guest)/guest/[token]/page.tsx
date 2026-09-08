"use client";

/**
 * 게스트 공유 갤러리 — 피그마 Guest/Home·Home-Sidebar·Home-Profile·Photo·Info 대응
 * 위치: src/app/(guest)/guest/[token]/page.tsx
 *
 * 부부가 공유한 링크(/guest/토큰)로 들어온 게스트의 단일 페이지.
 * - 홈: 앨범 제목 + 썸네일 그리드 (사이드바로 홈/앨범 전환)
 * - 사진 보기: 큰 사진 + 이전/다음, 우측 레일로 활동(댓글)/정보 패널 전환, 좋아요
 * - 게스트가 남긴 좋아요·댓글은 photoReactions 스토어에 저장되어
 *   부부 워크스페이스의 Reaction 패널에서 보인다 (백엔드 연동 전 로컬 데모)
 * - 게스트 신원은 OAuth·초대 연동 전까지 mock (나연)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { AppRightRail } from "@/components/app/AppRightRail";
import { BrandLogo } from "@/components/BrandLogo";
import { IconButton } from "@/components/ui/IconButton";
import { GuestSidebar } from "@/components/guest/GuestSidebar";
import { ProfileMenu } from "@/components/guest/ProfileMenu";
import { ActivityPanel } from "@/components/guest/ActivityPanel";
import { GuestInfoPanel } from "@/components/guest/GuestInfoPanel";
import { Avatar } from "@/components/ui/Avatar";
import {
  BackIcon,
  HeartFillIcon,
  HeartIcon,
  InfoIcon,
  MenuIcon,
  ReactionIcon,
  SlideshowIcon,
} from "@/components/icons";
import {
  EMPTY_REACTION,
  addPhotoComment,
  togglePhotoLike,
  useGalleryFolders,
  usePhotoReactions,
  useShareDesign,
} from "@/lib/couple";

// OAuth·초대 연동 전 게스트 신원 mock
const GUEST = { name: "나연", initial: "나", email: "nayeon@gmail.com" };

type GuestView = "home" | "photo";

export default function GuestSharedGalleryPage() {
  const [view, setView] = useState<GuestView>("home");
  const [activeAlbumKey, setActiveAlbumKey] = useState<string | null>(null);
  const [currentPhotoId, setCurrentPhotoId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  // null = 패널 닫힘 — 부부 화면과 같은 토글 문법 (같은 아이콘 재클릭으로 닫기)
  const [panel, setPanel] = useState<"activity" | "info" | null>("activity");
  const folders = useGalleryFolders();
  const reactions = usePhotoReactions();
  // 부부가 Share 모달 디자인 탭에서 저장한 표지 제목·작성자
  const design = useShareDesign();
  // 슬라이드쇼는 후순위 미구현 — 준비 중 토스트로 안내
  const { showComingSoon, comingSoonToast } = useComingSoonToast();

  const allPhotos = useMemo(() => folders.flatMap((f) => f.photos), [folders]);
  const activeAlbum = activeAlbumKey
    ? folders.find((f) => f.key === activeAlbumKey)
    : undefined;
  const photos = activeAlbum ? activeAlbum.photos : allPhotos;

  const currentIndex = photos.findIndex((p) => p.id === currentPhotoId);
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : undefined;
  const currentReaction = currentPhoto
    ? (reactions[currentPhoto.id] ?? EMPTY_REACTION)
    : EMPTY_REACTION;
  const liked = currentReaction.likes.includes(GUEST.name);

  function openPhoto(photoId: number) {
    setCurrentPhotoId(photoId);
    setView("photo");
  }

  function movePhoto(delta: number) {
    if (photos.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : 0;
    const next = Math.min(Math.max(base + delta, 0), photos.length - 1);
    setCurrentPhotoId(photos[next].id);
  }

  // 프로필 메뉴 바깥 클릭 시 닫기 (다른 팝업들과 같은 패턴)
  useEffect(() => {
    if (!profileOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen]);

  // 사진 보기에서 ←/→ 키로 이동, ESC로 홈 복귀 (부부 화면과 동일 문법)
  useEffect(() => {
    if (view !== "photo") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") movePhoto(-1);
      if (e.key === "ArrowRight") movePhoto(1);
      if (e.key === "Escape") setView("home");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const infoRows = currentPhoto
    ? [
        { label: "형식", value: "JPG" },
        {
          label: "파일 이름",
          value: `#${String(currentPhoto.id).padStart(3, "0")}.JPG`,
        },
        { label: "해상도", value: "4608×3072" },
        { label: "용량", value: "7.1MB" },
        { label: "촬영 일시", value: "2025.10.13 19:48" },
      ]
    : [];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      {/* 게스트 탑바 (피그마 Guest/Topbar) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-divider-default bg-background-default-main px-4">
        <div className="flex items-center gap-2">
          <IconButton
            icon={<MenuIcon size={20} />}
            selected={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="사이드바 열기"
          />
          <button
            type="button"
            onClick={() => setView("home")}
            className="flex cursor-pointer items-center gap-2"
            aria-label="홈으로"
          >
            <BrandLogo size={32} className="shrink-0 text-contents-light-bgd-default" />
            <b className="type-brand-wordmark text-contents-light-bgd-default">Easy Select</b>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            icon={<SlideshowIcon size={20} />}
            onClick={showComingSoon}
            aria-label="슬라이드쇼"
          />
          <div ref={profileRef} className="relative flex">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="프로필 메뉴"
              aria-expanded={profileOpen}
              className="cursor-pointer"
            >
              <Avatar initial={GUEST.initial} />
            </button>
            {profileOpen && (
              <ProfileMenu
                name={GUEST.name}
                email={GUEST.email}
                initial={GUEST.initial}
              />
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <GuestSidebar
            // 앨범은 부부의 AI 자동 분류 연동 전까지 빈 상태 (부부·작가 화면과 동일)
            albums={[]}
            activeAlbumKey={activeAlbumKey}
            onSelectHome={() => {
              setActiveAlbumKey(null);
              setView("home");
            }}
            onSelectAlbum={(key) => {
              setActiveAlbumKey(key);
              setView("home");
            }}
          />
        )}

        {view === "home" ? (
          <main className="min-w-0 flex-1 overflow-y-auto scrollbar-gutter-stable">
            <div className="mx-auto flex w-full max-w-wrap flex-col items-center">
              {/* 앨범 표지 (피그마 album-header) — 제목·작성자는 부부의 디자인 설정을 따른다 */}
              <div className="flex flex-col items-center gap-3 pb-8 pt-16 text-center">
                {(activeAlbum || design.showTitle) && (
                  <h1 className="type-maintext-s text-contents-light-bgd-default">
                    {activeAlbum ? activeAlbum.label : design.title}
                  </h1>
                )}
                {design.showAuthor && design.author && (
                  <p className="type-content-m text-contents-light-bgd-default">
                    작성자 : {design.author}
                  </p>
                )}
              </div>

              {/* 썸네일 그리드 (셀 240×300, gap 24) */}
              <div className="grid w-full grid-cols-[repeat(auto-fill,240px)] justify-center gap-6 px-6 pb-16">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => openPhoto(photo.id)}
                    aria-label={`사진 ${photo.id} 크게 보기`}
                    className="aspect-4/5 w-full cursor-pointer rounded-(--radius-4) bg-surface-default-light transition-opacity duration-fast hover:opacity-90"
                  />
                ))}
              </div>
            </div>
          </main>
        ) : (
          <main className="flex min-h-0 min-w-0 flex-1">
            {/* 사진 영역 — 이전/다음 (피그마 Guest/Photo). 사진이 잔여 공간 전부 사용 */}
            <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center p-3">
              <IconButton
                icon={<BackIcon size={20} />}
                onClick={() => movePhoto(-1)}
                aria-label="이전 사진"
                className="absolute left-5 top-1/2 -translate-y-1/2"
              />
              {currentPhoto ? (
                /* TODO: 실제 이미지로 교체 — 그 전까지 회색 플레이스홀더.
                   aspect만 주면 높이가 0으로 붕괴하므로 부부·작가 뷰어와 같은 h-full 패턴 */
                <div
                  aria-label={`사진 ${currentPhoto.id}`}
                  className="aspect-4/5 h-full bg-surface-default-light"
                />
              ) : (
                <p className="type-content-m text-contents-light-bgd-sub">
                  표시할 사진이 없어요.
                </p>
              )}
              <IconButton
                icon={<BackIcon size={20} className="rotate-180" />}
                onClick={() => movePhoto(1)}
                aria-label="다음 사진"
                className="absolute right-5 top-1/2 -translate-y-1/2"
              />
            </div>

            {panel === "activity" && (
              <ActivityPanel
                comments={currentReaction.comments}
                onSubmit={(text) => {
                  if (!currentPhoto) return;
                  addPhotoComment(currentPhoto.id, {
                    author: GUEST.name,
                    initial: GUEST.initial,
                    timeLabel: "방금",
                    text,
                  });
                }}
              />
            )}
            {panel === "info" && <GuestInfoPanel rows={infoRows} />}

            {/* 우측 레일 (피그마 App/RightRail role=guest, 40px) — 패널 토글 + 좋아요 */}
            <AppRightRail
              footer={
                <IconButton
                  icon={
                    liked ? (
                      <HeartFillIcon size={20} className="text-brand-secondary-default" />
                    ) : (
                      <HeartIcon size={20} />
                    )
                  }
                  selected={liked}
                  onClick={() =>
                    currentPhoto && togglePhotoLike(currentPhoto.id, GUEST.name)
                  }
                  aria-label={liked ? "좋아요 취소" : "좋아요"}
                />
              }
            >
              <IconButton
                icon={<ReactionIcon size={20} />}
                selected={panel === "activity"}
                onClick={() =>
                  setPanel(panel === "activity" ? null : "activity")
                }
                aria-label="활동 패널"
              />
              <IconButton
                icon={<InfoIcon size={20} />}
                selected={panel === "info"}
                onClick={() => setPanel(panel === "info" ? null : "info")}
                aria-label="정보 패널"
              />
            </AppRightRail>
          </main>
        )}
      </div>
      {comingSoonToast}
    </div>
  );
}
