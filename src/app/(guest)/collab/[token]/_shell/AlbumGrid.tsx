"use client";

/**
 * 앨범 안 — ← 앨범 · n장 · 내 하트 칩 · 정렬 · 그리드(내 하트만 표시) · 싱글뷰. 앨범 이름 ▾ 드롭다운(다른 앨범 · 모든 사진)은
 * 상단바 가운데(AlbumSwitch, 이슈 125 — 폰 폭에서 머리에 두면 이름이 잘렸다)
 * 위치: src/app/(guest)/collab/[token]/_shell/AlbumGrid.tsx
 *
 * 그리드는 작가 · 부부 셸의 PhotoGrid 그대로(선택 없음). 타일 클릭 = 싱글뷰 열기(게스트는 선택이 없다). 타일에는 내가 누른
 * 하트만 올리브로 — 다른 사람 좋아요 수는 보이지 않는다(2026-09-13). 공유폴더가 1개면 ← 와 드롭다운이 없다.
 * "모든 사진"은 앨범을 합치되 겹치는 사진은 한 번(내 하트가 붙은 쪽 우선). 좋아요는 낙관적으로 바꾸고 실패하면 되돌린다.
 * writable=false면 위에 배너 한 줄, 싱글뷰의 댓글 자리는 잠금. 좋아요는 likable로 따로 — 선택 마감이 지나도 누를 수 있다.
 * 헤더 · 배너 · 그리드는 다른 화면처럼 max-w-wrap(1080) + px-6 컨테이너에 가운데 — 넓은 화면에서 사진이 끝까지 붙지 않게
 * (2026-09-15, 이슈 67).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { DEFAULT_ZOOM } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import { Snackbar, type SnackbarKind } from "@/components/app/Snackbar";
import { BackIcon, DropdownIcon, FolderIcon, HeartFillIcon, LockIcon, PhotoIcon, SwapVertIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import type { CollabPhotoResponse } from "@/lib/api/collab";
import { isGuestNotIdentified, likeGuestPhoto, unlikeGuestPhoto, type CollabLandingAlbum } from "@/lib/api/collabGuest";
import type { PhotoResponse } from "@/lib/api/photos";
import { GuestLightbox } from "./GuestLightbox";
import { sortGuestPhotos } from "./guestView";

export const ALL_ALBUMS = "all";
const NO_SELECTION: ReadonlySet<number> = new Set();

export function AlbumGrid({
  albums,
  current,
  photosByToken,
  loading,
  error,
  writable,
  likable,
  mineOnly,
  onMineOnlyChange,
  onBack,
  guestTokenOf,
  onPatchPhoto,
  onNeedName,
}: {
  albums: CollabLandingAlbum[];
  /** 앨범 토큰 또는 ALL_ALBUMS */
  current: string;
  photosByToken: ReadonlyMap<string, CollabPhotoResponse[]>;
  loading: boolean;
  error: boolean;
  /** false면 선택 마감이 지난 것 — 댓글 잠금 */
  writable: boolean;
  /** false면 갤러리가 마무리된 것 — 좋아요도 잠금 */
  likable: boolean;
  mineOnly: boolean;
  onMineOnlyChange: (v: boolean) => void;
  /** 앨범 여러 개일 때만 — 홈으로 */
  onBack?: () => void;
  guestTokenOf: (token: string) => string | null;
  /** 좋아요 · 댓글 수를 사진 목록에 반영 */
  onPatchPhoto: (token: string, photoId: number, patch: (p: CollabPhotoResponse) => CollabPhotoResponse) => void;
  /** 토큰이 없거나 죽었을 때 — 이름을 다시 받는다 */
  onNeedName: () => void;
}) {
  const multi = albums.length > 1;
  const [newestFirst, setNewestFirst] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [lastViewedId, setLastViewedId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; kind: SnackbarKind } | null>(null);
  const noticeTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const album = albums.find((a) => a.collabToken === current) ?? null;
  /** 보고 있는 사진과 각 사진이 속한 앨범 토큰(모든 사진에서는 내 하트가 붙은 쪽 우선) */
  const { all, tokenById } = useMemo(() => {
    const tokenById = new Map<number, string>();
    if (current !== ALL_ALBUMS) {
      const list = photosByToken.get(current) ?? [];
      for (const p of list) tokenById.set(p.photoId, current);
      return { all: list, tokenById };
    }
    const byId = new Map<number, CollabPhotoResponse>();
    for (const a of albums)
      for (const p of photosByToken.get(a.collabToken) ?? []) {
        const prev = byId.get(p.photoId);
        if (!prev || (p.liked && !prev.liked)) {
          byId.set(p.photoId, p);
          tokenById.set(p.photoId, a.collabToken);
        }
      }
    return { all: [...byId.values()], tokenById };
  }, [current, albums, photosByToken]);
  const likedIds = useMemo(() => new Set(all.filter((p) => p.liked).map((p) => p.photoId)), [all]);
  const shown = useMemo(() => sortGuestPhotos(mineOnly ? all.filter((p) => p.liked) : all, newestFirst), [all, mineOnly, newestFirst]);
  const gridPhotos = useMemo<PhotoResponse[]>(() => shown.map((p) => p.photo), [shown]);
  const total = current === ALL_ALBUMS ? all.length : (album?.photoCount ?? all.length);
  const tokenOf = (photoId: number) => tokenById.get(photoId) ?? (current === ALL_ALBUMS ? albums[0]?.collabToken ?? "" : current);
  const lightboxIndex = openIndex === null ? null : shown.length === 0 ? null : Math.min(openIndex, shown.length - 1);

  function showNotice(text: string, kind: SnackbarKind = "error") {
    setNotice({ text, kind });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2400);
  }
  function open(photoId: number) {
    const i = shown.findIndex((p) => p.photoId === photoId);
    if (i >= 0) setOpenIndex(i);
  }
  function close() {
    if (lightboxIndex !== null) setLastViewedId(shown[lightboxIndex]?.photoId ?? null);
    setOpenIndex(null);
  }
  /** 좋아요 토글 — 화면 먼저, 실패하면 되돌림 */
  async function toggleLike(p: CollabPhotoResponse) {
    const token = tokenOf(p.photoId);
    const guestToken = guestTokenOf(token);
    if (!guestToken) {
      onNeedName();
      return;
    }
    const next = !p.liked;
    const apply = (liked: boolean) => (x: CollabPhotoResponse) => ({ ...x, liked, likeCount: Math.max(0, x.likeCount + (liked === x.liked ? 0 : liked ? 1 : -1)) });
    onPatchPhoto(token, p.photoId, apply(next));
    try {
      if (next) await likeGuestPhoto(token, guestToken, p.photoId);
      else await unlikeGuestPhoto(token, guestToken, p.photoId);
    } catch (err) {
      onPatchPhoto(token, p.photoId, apply(!next));
      if (isGuestNotIdentified(err)) onNeedName();
      else showNotice(err instanceof ApiError ? err.message : "좋아요를 남기지 못했어요 · 잠시 뒤 다시 시도해 주세요");
    }
  }

  const overlayOf = (photo: PhotoResponse): ReactNode =>
    likedIds.has(photo.photoId) ? (
      <span className="absolute right-2 bottom-2 grid size-6.5 place-items-center rounded-full bg-brand-secondary-default text-contents-dark-bgd-default shadow-[0_1px_4px_rgba(0,0,0,.25)]">
        <HeartFillIcon size={14} />
      </span>
    ) : null;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mx-auto flex h-14 w-full max-w-wrap shrink-0 items-center justify-between gap-3 px-6">
        <h2 className="flex min-w-0 items-center gap-1.5 whitespace-nowrap type-title-s text-contents-light-bgd-default">
          {multi && onBack && (
            <button type="button" onClick={onBack} className="mr-1 inline-flex shrink-0 cursor-pointer items-center gap-0.5 type-content-s text-contents-light-bgd-sub hover:text-contents-light-bgd-default">
              <BackIcon size={18} />
              앨범
            </button>
          )}
          <small className="ml-1 shrink-0 type-content-s font-normal text-contents-light-bgd-weakness tabular-nums">{total}장</small>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-pressed={mineOnly}
            onClick={() => onMineOnlyChange(!mineOnly)}
            className={`inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-(--pill) px-3 whitespace-nowrap type-label-medium-s transition-colors duration-fast ${mineOnly ? "bg-brand-secondary-default text-contents-dark-bgd-default" : "bg-surface-default-medium text-contents-light-bgd-default hover:bg-surface-default-light"}`}
          >
            <HeartFillIcon size={16} className={mineOnly ? "" : "text-brand-secondary-default"} />
            좋아요한 사진
            <b className={`font-medium tabular-nums ${mineOnly ? "text-contents-dark-bgd-default/80" : "text-contents-light-bgd-sub"}`}>{likedIds.size}</b>
          </button>
          <button
            type="button"
            aria-label={newestFirst ? "최신순" : "오래된순"}
            title={newestFirst ? "최신순" : "오래된순"}
            onClick={() => setNewestFirst((v) => !v)}
            className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-(--radius-8) bg-surface-default-medium px-3 whitespace-nowrap type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-light max-[480px]:px-2"
          >
            <SwapVertIcon size={18} className="text-contents-light-bgd-sub" />
            <span className="max-[480px]:hidden">{newestFirst ? "최신순" : "오래된순"}</span>
          </button>
        </div>
      </div>
      {!writable && (
        <div className="mx-auto mb-2 w-full max-w-wrap px-6">
          <div className="flex items-center gap-2.5 rounded-(--radius-8) bg-surface-default-medium px-3 py-2.5 type-content-s text-contents-light-bgd-default">
            <LockIcon size={18} className="text-contents-light-bgd-sub" />
            {likable ? (
              <>
                <b className="font-semibold">사진 선택이 끝났어요</b>
                <span className="text-contents-light-bgd-sub">댓글은 더 남길 수 없어요 · 좋아요는 계속 누를 수 있어요</span>
              </>
            ) : (
              <b className="font-semibold">갤러리가 마무리되어 좋아요와 댓글을 더 남길 수 없어요</b>
            )}
          </div>
        </div>
      )}
      <div className="scrollbar-slim scrollbar-stable min-h-0 flex-1 overflow-y-auto" aria-busy={loading || undefined}>
        {error && all.length === 0 ? (
          <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">사진을 불러오지 못했어요 · 페이지를 새로 고쳐 주세요</p>
        ) : !loading && gridPhotos.length === 0 ? (
          <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">{mineOnly ? "좋아요한 사진이 없어요" : "사진이 없어요"}</p>
        ) : (
          <div className="mx-auto w-full max-w-wrap px-6">
            <PhotoGrid
              photos={gridPhotos}
              zoom={DEFAULT_ZOOM}
              selectedIds={NO_SELECTION}
              onToggle={() => {}}
              selectable={false}
              markStyle="check"
              currentId={lightboxIndex !== null ? shown[lightboxIndex]?.photoId ?? null : lastViewedId}
              onTileClick={open}
              overlayOf={overlayOf}
              scrollToId={lastViewedId}
              gutter={false}
            />
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <GuestLightbox
          photos={shown}
          index={lightboxIndex}
          writable={writable}
          likable={likable}
          tokenOf={tokenOf}
          guestTokenOf={guestTokenOf}
          onClose={close}
          onNavigate={setOpenIndex}
          onToggleLike={(p) => void toggleLike(p)}
          onLockedLike={() => showNotice("갤러리가 마무리되어 좋아요를 누를 수 없어요", "info")}
          onCommentDelta={(p, d) => onPatchPhoto(tokenOf(p.photoId), p.photoId, (x) => ({ ...x, commentCount: Math.max(0, x.commentCount + d) }))}
          onNeedName={onNeedName}
        />
      )}
      {notice && (
        <Snackbar kind={notice.kind} className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          {notice.text}
        </Snackbar>
      )}
    </main>
  );
}

/** 앨범 이름 ▾ — 다른 앨범 · 모든 사진으로 바꾸는 드롭다운. 상단바 가운데에 둔다(이슈 125) */
export function AlbumSwitch({ albums, current, onSwitch }: { albums: CollabLandingAlbum[]; current: string; onSwitch: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const title = current === ALL_ALBUMS ? "모든 사진" : (albums.find((a) => a.collabToken === current)?.name ?? "");
  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex max-w-full cursor-pointer items-center gap-0.5 rounded-(--radius-8) py-1 pr-1 pl-1.5 type-title-s text-contents-light-bgd-default hover:bg-surface-default-lightness">
        <span className="min-w-0 truncate">{title}</span>
        <DropdownIcon size={20} className={`shrink-0 text-contents-light-bgd-sub transition-transform duration-fast ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-1/2 z-20 mt-1 w-66 -translate-x-1/2 rounded-(--radius-12) border border-border-default bg-background-default-main p-1.5 shadow-(--shadow-modal)">
          {albums.map((a) => (
            <button
              key={a.sessionId}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSwitch(a.collabToken);
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) px-2.5 py-2 text-left type-content-m hover:bg-surface-default-lightness ${a.collabToken === current ? "bg-surface-default-lightness font-semibold text-contents-light-bgd-default" : "text-contents-light-bgd-default"}`}
            >
              <FolderIcon size={18} className="text-contents-light-bgd-sub" />
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              <span className="type-content-xs text-contents-light-bgd-weakness tabular-nums">{a.photoCount}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-divider-default" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSwitch(ALL_ALBUMS);
            }}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) px-2.5 py-2 text-left type-content-m hover:bg-surface-default-lightness ${current === ALL_ALBUMS ? "bg-surface-default-lightness font-semibold" : ""} text-contents-light-bgd-default`}
          >
            <PhotoIcon size={18} className="text-contents-light-bgd-sub" />
            <span className="flex-1">모든 사진</span>
          </button>
        </div>
      )}
    </div>
  );
}
