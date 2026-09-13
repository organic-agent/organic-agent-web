"use client";

/**
 * 앨범 안 — ← 앨범 · 제목 ▾ 드롭다운(다른 앨범 · 모든 사진) · n장 · 내 하트 칩 · 정렬 · 그리드(내 하트만 표시)
 * 위치: src/app/(guest)/collab/[token]/_shell/AlbumGrid.tsx
 *
 * 그리드는 작가 · 부부 셸의 PhotoGrid 그대로(선택 없음). 타일에는 내가 누른 하트만 올리브로 — 다른 사람 좋아요 수는
 * 타일에 보이지 않는다(2026-09-13). 공유폴더가 1개면 ← 와 드롭다운이 없다. "모든 사진"은 앨범을 합치되 겹치는 사진은 한 번.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { DEFAULT_ZOOM } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import { BackIcon, DropdownIcon, FolderIcon, HeartFillIcon, PhotoIcon, SwapVertIcon } from "@/components/icons";
import type { CollabPhotoResponse } from "@/lib/api/collab";
import type { CollabLandingAlbum } from "@/lib/api/collabGuest";
import type { PhotoResponse } from "@/lib/api/photos";
import { sortGuestPhotos } from "./guestView";

export const ALL_ALBUMS = "all";
const NO_SELECTION: ReadonlySet<number> = new Set();

export function AlbumGrid({
  albums,
  current,
  photosByToken,
  loading,
  error,
  mineOnly,
  onMineOnlyChange,
  onBack,
  onSwitch,
}: {
  albums: CollabLandingAlbum[];
  /** 앨범 토큰 또는 ALL_ALBUMS */
  current: string;
  photosByToken: ReadonlyMap<string, CollabPhotoResponse[]>;
  loading: boolean;
  error: boolean;
  mineOnly: boolean;
  onMineOnlyChange: (v: boolean) => void;
  /** 앨범 여러 개일 때만 — 홈으로 */
  onBack?: () => void;
  onSwitch: (token: string) => void;
}) {
  const multi = albums.length > 1;
  const [newestFirst, setNewestFirst] = useState(true);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ddOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!ddRef.current?.contains(e.target as Node)) setDdOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDdOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ddOpen]);

  const album = albums.find((a) => a.collabToken === current) ?? null;
  const all = useMemo(() => {
    if (current !== ALL_ALBUMS) return photosByToken.get(current) ?? [];
    const byId = new Map<number, CollabPhotoResponse>();
    for (const a of albums) for (const p of photosByToken.get(a.collabToken) ?? []) {
      const prev = byId.get(p.photoId);
      if (!prev || (p.liked && !prev.liked)) byId.set(p.photoId, p);
    }
    return [...byId.values()];
  }, [current, albums, photosByToken]);
  const likedIds = useMemo(() => new Set(all.filter((p) => p.liked).map((p) => p.photoId)), [all]);
  const shown = useMemo(() => sortGuestPhotos(mineOnly ? all.filter((p) => p.liked) : all, newestFirst), [all, mineOnly, newestFirst]);
  const gridPhotos = useMemo<PhotoResponse[]>(() => shown.map((p) => p.photo), [shown]);
  const total = current === ALL_ALBUMS ? all.length : (album?.photoCount ?? all.length);
  const title = current === ALL_ALBUMS ? "모든 사진" : (album?.name ?? "");

  const overlayOf = (photo: PhotoResponse): ReactNode =>
    likedIds.has(photo.photoId) ? (
      <span className="absolute right-2 bottom-2 grid size-6.5 place-items-center rounded-full bg-brand-secondary-default text-contents-dark-bgd-default shadow-[0_1px_4px_rgba(0,0,0,.25)]">
        <HeartFillIcon size={14} />
      </span>
    ) : null;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
        <h2 className="flex min-w-0 items-center gap-1.5 type-title-s text-contents-light-bgd-default">
          {multi && onBack && (
            <button type="button" onClick={onBack} className="mr-1 inline-flex cursor-pointer items-center gap-0.5 type-content-s text-contents-light-bgd-sub hover:text-contents-light-bgd-default">
              <BackIcon size={18} />
              앨범
            </button>
          )}
          {multi ? (
            <div ref={ddRef} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={ddOpen} onClick={() => setDdOpen((v) => !v)} className="inline-flex cursor-pointer items-center gap-0.5 rounded-(--radius-8) py-1 pr-1 pl-1.5 type-title-s text-contents-light-bgd-default hover:bg-surface-default-lightness">
                <span className="truncate">{title}</span>
                <DropdownIcon size={20} className={`text-contents-light-bgd-sub transition-transform duration-fast ${ddOpen ? "rotate-180" : ""}`} />
              </button>
              {ddOpen && (
                <div role="menu" className="absolute top-full left-0 z-20 mt-1 w-66 rounded-(--radius-12) border border-border-default bg-background-default-main p-1.5 shadow-(--shadow-modal)">
                  {albums.map((a) => (
                    <button
                      key={a.sessionId}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setDdOpen(false);
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
                      setDdOpen(false);
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
          ) : (
            <span className="truncate">{title}</span>
          )}
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness tabular-nums">{total}장</small>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-pressed={mineOnly}
            onClick={() => onMineOnlyChange(!mineOnly)}
            className={`inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-(--pill) px-3 type-label-medium-s transition-colors duration-fast ${mineOnly ? "bg-brand-secondary-default text-contents-dark-bgd-default" : "bg-surface-default-medium text-contents-light-bgd-default hover:bg-surface-default-light"}`}
          >
            <HeartFillIcon size={16} className={mineOnly ? "" : "text-brand-secondary-default"} />
            내 하트
            <b className={`font-medium tabular-nums ${mineOnly ? "text-contents-dark-bgd-default/80" : "text-contents-light-bgd-sub"}`}>{likedIds.size}</b>
          </button>
          <button type="button" onClick={() => setNewestFirst((v) => !v)} className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-(--radius-8) bg-surface-default-medium px-3 type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-light">
            <SwapVertIcon size={18} className="text-contents-light-bgd-sub" />
            {newestFirst ? "최신순" : "오래된순"}
          </button>
        </div>
      </div>
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto" aria-busy={loading || undefined}>
        {error && all.length === 0 ? (
          <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">사진을 불러오지 못했어요</p>
        ) : !loading && gridPhotos.length === 0 ? (
          <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">{mineOnly ? "좋아요한 사진이 없어요" : "사진이 없어요"}</p>
        ) : (
          <PhotoGrid photos={gridPhotos} zoom={DEFAULT_ZOOM} selectedIds={NO_SELECTION} onToggle={() => {}} selectable={false} markStyle="check" overlayOf={overlayOf} />
        )}
      </div>
    </main>
  );
}
