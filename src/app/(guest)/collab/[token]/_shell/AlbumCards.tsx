"use client";

/**
 * 앨범 홈 — 표지 헤더(제목 크게 · 작가 · 앨범 n개 · n장 · 남은 기간 · 좋아요한 사진 칩) + 앨범 카드(개수에 맞춘 열)
 * 위치: src/app/(guest)/collab/[token]/_shell/AlbumCards.tsx
 *
 * 앨범이 여러 개(includeAllAlbums)일 때만 그린다 — 1개면 page가 바로 그리드(AlbumGrid)로. 카드 = 대표 1장 + 아래 띠 4장 ·
 * 이름 · n장 · 내 하트 n. 상단바 가운데는 비운다(헤더가 이름을 크게 보여 준다). 내 댓글 수는 API가 없어 두지 않는다.
 */

import { HeartFillIcon } from "@/components/icons";
import type { CollabPhotoResponse } from "@/lib/api/collab";
import type { CollabLandingAlbum, CollabLandingResponse } from "@/lib/api/collabGuest";
import { daysLeftLabel } from "./guestView";

function Cover({ photos }: { photos: CollabPhotoResponse[] }) {
  const [main, ...rest] = photos;
  const strip = [0, 1, 2, 3].map((i) => rest[i] ?? null);
  return (
    <div className="grid h-62.5 grid-rows-[1fr_56px] gap-0.75 bg-surface-default-light">
      {main?.photo.viewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={main.photo.viewUrl} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <span className="bg-surface-default-light" />
      )}
      <div className="grid grid-cols-4 gap-0.75">
        {strip.map((p, i) =>
          p?.photo.viewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.photoId} src={p.photo.viewUrl} alt="" draggable={false} className="size-full object-cover" />
          ) : (
            <span key={i} className="bg-surface-default-lightness" />
          ),
        )}
      </div>
    </div>
  );
}

export function AlbumCards({
  landing,
  title,
  photosByToken,
  onOpenAlbum,
  onOpenMine,
}: {
  landing: CollabLandingResponse;
  title: string;
  photosByToken: ReadonlyMap<string, CollabPhotoResponse[]>;
  onOpenAlbum: (album: CollabLandingAlbum) => void;
  /** "좋아요한 사진" 칩 — 모든 사진에서 내 하트만 */
  onOpenMine: () => void;
}) {
  const albums = landing.albums;
  const total = albums.reduce((n, a) => n + a.photoCount, 0);
  const seen = new Set<number>();
  let mine = 0;
  for (const list of photosByToken.values()) for (const p of list) if (p.liked && !seen.has(p.photoId)) { seen.add(p.photoId); mine++; }
  const days = daysLeftLabel(landing.expiresAt);
  const meta = [landing.coverAuthor, `앨범 ${albums.length}개 · ${total}장`, days].filter((s): s is string => !!s);

  return (
    <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-245 px-6 pb-8">
        <div className="mb-5 flex items-end justify-between gap-5 border-b border-divider-default pt-7 pb-5">
          <div className="min-w-0">
            <h1 className="type-title-xl leading-tight text-contents-light-bgd-default text-balance">{title}</h1>
            <p className="mt-1.5 flex flex-wrap gap-x-2 type-content-s text-contents-light-bgd-weakness">
              {meta.map((s, i) => (
                <span key={s} className={i === 0 && landing.coverAuthor ? "font-medium text-contents-light-bgd-sub" : ""}>
                  {i > 0 && <span aria-hidden className="mr-2">·</span>}
                  {s}
                </span>
              ))}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMine}
            className="inline-flex h-8.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-(--pill) bg-surface-default-medium px-3 type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-light"
          >
            <HeartFillIcon size={16} className="text-brand-secondary-default" />
            좋아요한 사진
            <b className="font-medium text-contents-light-bgd-sub tabular-nums">{mine}</b>
          </button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-4.5">
          {albums.map((a) => {
            const photos = photosByToken.get(a.collabToken) ?? [];
            const my = photos.filter((p) => p.liked).length;
            return (
              <button
                key={a.sessionId}
                type="button"
                onClick={() => onOpenAlbum(a)}
                className="flex cursor-pointer flex-col overflow-hidden rounded-(--radius-12) border border-border-default bg-background-default-main text-left transition-shadow duration-fast hover:shadow-(--shadow-hover)"
              >
                <Cover photos={photos} />
                <span className="px-3.5 pt-3 pb-3.5">
                  <b className="block truncate type-label-semibold-l text-contents-light-bgd-default">{a.name}</b>
                  <span className="mt-0.5 flex gap-2.5 type-content-xs text-contents-light-bgd-weakness">
                    <span>{a.photoCount}장</span>
                    <span className="inline-flex items-center gap-1 text-brand-secondary-dark">
                      <HeartFillIcon size={13} />
                      내 하트 {my}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
