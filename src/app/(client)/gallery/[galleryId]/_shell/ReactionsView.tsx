"use client";

/**
 * 하객 반응 보기 — 공유폴더 하나의 사진을 좋아요순으로 · 타일 배지(♥ n · 💬 n) · 사진을 열면 댓글 읽기만 (2026-09-13 확정)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ReactionsView.tsx
 *
 * 사이드바 공유 탭 카드를 눌러 들어오고, 다른 폴더도 카드로 바꾼다(← · 제목 드롭다운 없음). 순위 표시는 두지 않는다.
 * 헤더는 셸 메인 헤더 그대로 — 정렬(좋아요순 · 댓글순 · 최신순) · 필터("반응 있는 사진만"). 싱글뷰는 공용 Lightbox +
 * 게스트 판 댓글 항목 재사용, 부부는 읽기만(하트 · 입력 · 삭제 없음).
 */

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { CommentItem } from "@/app/(guest)/collab/[token]/_shell/GuestComments";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { type CustomMenu, ShellMainHeader } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import { Lightbox, type LightboxTabDef } from "@/components/app/Lightbox";
import { CommentIcon, GroupIcon, HeartFillIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { listAllSessionPhotoComments, type CollabPhotoResponse, type CollabSessionResponse } from "@/lib/api/collab";
import type { CollabCommentResponse } from "@/lib/api/collabGuest";
import type { PhotoResponse } from "@/lib/api/photos";

type ReactionSort = "likes" | "comments" | "newest";
const NO_SELECTION: ReadonlySet<number> = new Set();
const timeOf = (p: CollabPhotoResponse) => (p.photo.createdAt ? new Date(p.photo.createdAt).getTime() : 0);

export function ReactionsView({ galleryId, session, photos }: { galleryId: number; session: CollabSessionResponse; photos: CollabPhotoResponse[] | null }) {
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));
  const [sort, setSort] = useState<ReactionSort>("likes");
  const [reactedOnly, setReactedOnly] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [lastViewedId, setLastViewedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"cmt" | "none">("cmt");

  const list = useMemo(() => photos ?? [], [photos]);
  const likes = list.reduce((n, p) => n + p.likeCount, 0);
  const comments = list.reduce((n, p) => n + p.commentCount, 0);
  const shown = useMemo(() => {
    const base = reactedOnly ? list.filter((p) => p.likeCount > 0 || p.commentCount > 0) : list;
    return [...base].sort((a, b) =>
      sort === "likes"
        ? b.likeCount - a.likeCount || b.commentCount - a.commentCount || a.photo.displayOrder - b.photo.displayOrder
        : sort === "comments"
          ? b.commentCount - a.commentCount || b.likeCount - a.likeCount || a.photo.displayOrder - b.photo.displayOrder
          : timeOf(b) - timeOf(a) || b.photo.displayOrder - a.photo.displayOrder,
    );
  }, [list, reactedOnly, sort]);
  const gridPhotos = useMemo<PhotoResponse[]>(() => shown.map((p) => p.photo), [shown]);
  const byId = useMemo(() => new Map(shown.map((p) => [p.photoId, p])), [shown]);
  const lightboxIndex = openIndex === null || shown.length === 0 ? null : Math.min(openIndex, shown.length - 1);
  const current = lightboxIndex !== null ? shown[lightboxIndex] : null;

  const sortMenu: CustomMenu = {
    value: sort,
    options: [
      { key: "likes", label: "좋아요순" },
      { key: "comments", label: "댓글순" },
      { key: "newest", label: "최신순" },
    ],
    onChange: (key) => setSort(key as ReactionSort),
  };
  const filterMenu: CustomMenu = {
    value: reactedOnly ? "reacted" : "none",
    options: [{ key: "reacted", label: "반응 있는 사진만" }],
    onChange: (key) => setReactedOnly(key === "reacted" ? !reactedOnly : false),
  };
  const overlayOf = (photo: PhotoResponse): ReactNode => {
    const p = byId.get(photo.photoId);
    if (!p || (p.likeCount === 0 && p.commentCount === 0)) return null;
    return (
      <span className="absolute right-2 bottom-2 flex gap-1">
        {p.likeCount > 0 && (
          <span className="inline-flex h-6 items-center gap-1 rounded-(--pill) bg-black/60 px-2 type-label-semibold-xs text-white tabular-nums">
            <HeartFillIcon size={13} />
            {p.likeCount}
          </span>
        )}
        {p.commentCount > 0 && (
          <span className="inline-flex h-6 items-center gap-1 rounded-(--pill) bg-black/60 px-2 type-label-semibold-xs text-white tabular-nums">
            <CommentIcon size={13} />
            {p.commentCount}
          </span>
        )}
      </span>
    );
  };
  function open(photoId: number) {
    const i = shown.findIndex((p) => p.photoId === photoId);
    if (i >= 0) {
      setOpenIndex(i);
      setTab("cmt");
    }
  }
  function close() {
    setLastViewedId(current?.photoId ?? null);
    setOpenIndex(null);
  }

  const tabs: LightboxTabDef[] = current ? [{ key: "cmt", label: `댓글 ${current.commentCount}`, icon: <CommentIcon size={20} /> }] : [];

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <ShellMainHeader
        title={
          <>
            <span className="flex text-contents-light-bgd-weakness">
              <GroupIcon size={18} />
            </span>
            <span className="truncate">{session.name}</span>
            <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{list.length}장</small>
            <span className="ml-3 flex items-center gap-3 type-content-s font-normal text-contents-light-bgd-sub tabular-nums">
              <span className="inline-flex items-center gap-1">
                <HeartFillIcon size={16} className="text-brand-secondary-default" />
                <b className="font-semibold text-contents-light-bgd-default">{likes}</b>
              </span>
              <span className="inline-flex items-center gap-1">
                <CommentIcon size={16} />
                <b className="font-semibold text-contents-light-bgd-default">{comments}</b>
              </span>
            </span>
          </>
        }
        zoom={zoom}
        onZoomChange={writeZoom}
        sort="uploaded"
        onSortChange={() => {}}
        filter="none"
        onFilterChange={() => {}}
        customSort={sortMenu}
        customFilter={filterMenu}
        onSingleView={() => {
          if (shown.length > 0) open(shown[0].photoId);
        }}
      />
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto" aria-busy={photos === null || undefined}>
        {photos === null ? (
          <div className="flex-1" />
        ) : shown.length === 0 ? (
          <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">{reactedOnly ? "아직 반응이 없어요" : "사진이 없어요"}</p>
        ) : (
          <PhotoGrid
            photos={gridPhotos}
            zoom={zoom}
            selectedIds={NO_SELECTION}
            onToggle={() => {}}
            selectable={false}
            markStyle="check"
            currentId={current?.photoId ?? lastViewedId}
            onTileClick={open}
            overlayOf={overlayOf}
            scrollToId={lastViewedId}
          />
        )}
      </div>

      {current && lightboxIndex !== null && (
        <Lightbox
          photo={current.photo}
          index={lightboxIndex}
          total={shown.length}
          caption={null}
          tab={tab}
          tabs={tabs}
          middle={
            <span className="inline-flex h-7 items-center gap-1 rounded-(--pill) bg-white/15 px-2.5 type-label-semibold-s text-white tabular-nums">
              <HeartFillIcon size={16} />
              {current.likeCount}
            </span>
          }
          panelTitle={`댓글 ${current.commentCount}`}
          panel={<ReactionComments key={current.photoId} galleryId={galleryId} sessionId={session.sessionId} photoId={current.photoId} />}
          onClose={close}
          onPrev={() => setOpenIndex((lightboxIndex - 1 + shown.length) % shown.length)}
          onNext={() => setOpenIndex((lightboxIndex + 1) % shown.length)}
          onTabChange={(next) => setTab(next === "cmt" ? "cmt" : "none")}
        />
      )}
    </main>
  );
}

/** 부부가 읽는 사진 댓글 — 오래된순, 읽기만 */
function ReactionComments({ galleryId, sessionId, photoId }: { galleryId: number; sessionId: number; photoId: number }) {
  const [list, setList] = useState<CollabCommentResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = await listAllSessionPhotoComments(galleryId, sessionId, photoId);
        if (!cancelled) setList(out.reverse());
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "댓글을 불러오지 못했어요");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, sessionId, photoId]);

  if (error) return <p role="alert" className="type-content-xs text-function-error-default">{error}</p>;
  if (list === null) return <div className="h-16 animate-pulse rounded-(--radius-8) bg-surface-default-light" aria-busy="true" />;
  if (list.length === 0) return <p className="py-8 text-center type-content-s text-contents-light-bgd-weakness">댓글이 없어요</p>;
  return (
    <div className="flex flex-col gap-3.5">
      {list.map((c) => (
        <CommentItem key={c.commentId} comment={{ ...c, mine: false }} />
      ))}
    </div>
  );
}
