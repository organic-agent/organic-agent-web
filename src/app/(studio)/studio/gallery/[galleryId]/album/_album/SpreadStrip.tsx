"use client";

/**
 * 펼침면 띠(이슈 168) — 아래쪽 가로 목록. 프레임 모양과 넣은 사진을 작게 그리고, 누르면 그 펼침면으로
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/SpreadStrip.tsx
 *
 * 선택에서 빠진 프레임이 있는 펼침면은 오른쪽 위에 회색 점.
 */

import { useEffect, useRef } from "react";
import { getCrop, spreadRatio, type Album, type FrameIndex } from "@/lib/album/model";
import { cropStyle } from "./photoCrop";
import type { AlbumPhoto } from "./useAlbumSource";

export function SpreadStrip({
  album,
  F,
  photoOf,
  grayDots,
  onGo,
}: {
  album: Album;
  F: FrameIndex;
  photoOf: (photoId: number) => AlbumPhoto | null;
  grayDots: ReadonlySet<number>;
  onGo: (spread: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [album.spread]);

  const tileW = Math.round(56 * spreadRatio(album.page));
  return (
    <div ref={ref} className="scrollbar-slim flex h-28 shrink-0 items-center gap-1 overflow-x-auto border-t border-divider-default px-3.5" aria-label="펼침면">
      {album.spreads.map((_, s) => {
        const current = s === album.spread;
        return (
          <button
            key={s}
            type="button"
            aria-current={current}
            onClick={() => onGo(s)}
            className={`flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-(--radius-8) px-3.5 py-2.5 transition-colors duration-fast ${
              current ? "bg-surface-default-lightness" : "hover:bg-surface-default-lightness"
            }`}
          >
            <span className={`relative block h-14 bg-white ${current ? "ring-2 ring-brand-accent-default" : "ring-1 ring-divider-default"}`} style={{ width: tileW }}>
              {F.of(s).map((f) => {
                const pid = album.assign[f.id];
                const photo = pid === undefined ? null : photoOf(pid);
                return (
                  <span
                    key={f.id}
                    className="absolute overflow-hidden bg-brand-accent-surface"
                    style={{ left: `${(f.p * 0.5 + f.x * 0.5) * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 50}%`, height: `${f.h * 100}%` }}
                  >
                    {photo?.src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.src} alt="" loading="lazy" draggable={false} className="size-full object-cover" style={cropStyle(getCrop(album, f.id))} />
                    )}
                  </span>
                );
              })}
              {grayDots.has(s) && <span aria-label="선택에서 빠진 프레임 있음" className="absolute -top-1.5 -right-1.5 size-3 rounded-full border-2 border-background-default-main bg-surface-default-medium" />}
            </span>
            <span className={`type-content-xs whitespace-nowrap ${current ? "font-semibold text-brand-accent-text" : "text-contents-light-bgd-sub"}`}>펼침면 {s + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
