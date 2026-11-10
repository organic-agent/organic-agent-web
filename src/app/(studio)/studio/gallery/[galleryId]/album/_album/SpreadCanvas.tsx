"use client";

/**
 * 펼침면 한 장(이슈 168) — 흰 종이 두 쪽 · 가운데 접힘 그늘 · 배경 글귀 · 프레임
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/SpreadCanvas.tsx
 *
 * 종이는 화면 테마와 상관없이 흰색(실제 앨범). 프레임 상태: 사진 있음 · 빈 칸(보라 옅은 바탕) ·
 * 선택에서 빠짐(회색 빗금 + 칩) · 다음 배치 위치(보라 점선 + 말풍선) · 고른 프레임(보라 점선 + 어두운 말풍선 · ✕).
 * 펼침면 비율은 앨범 사이즈(한 쪽 가로 × 세로 mm)를 따른다.
 */

import type { MouseEvent } from "react";
import { CloseIcon } from "@/components/icons";
import { pad2, spreadRatio, type Album, type Frame, type FrameIndex } from "@/lib/album/model";
import type { AlbumPhoto } from "./useAlbumSource";

const GONE_BG = "repeating-linear-gradient(135deg, rgba(26,26,26,.05) 0 8px, rgba(26,26,26,.10) 8px 16px)";

function FrameBox({
  frame,
  photo,
  gone,
  cursor,
  manual,
  spreadH,
  onClick,
  onClear,
}: {
  frame: Frame;
  photo: AlbumPhoto | null;
  gone: boolean;
  cursor: boolean;
  manual: boolean;
  /** 펼침면 높이(px) — 번호 글자 크기 */
  spreadH: number;
  onClick: (e: MouseEvent) => void;
  onClear: () => void;
}) {
  const h = frame.h * spreadH;
  const empty = !photo;
  const tip = cursor ? (manual ? (empty ? "넣을 사진을 고르세요" : "바꿀 사진을 고르세요") : "다음 배치 위치") : null;
  return (
    <div
      className="absolute"
      style={{ left: `${(frame.p * 0.5 + frame.x * 0.5) * 100}%`, top: `${frame.y * 100}%`, width: `${frame.w * 50}%`, height: `${frame.h * 100}%` }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`${pad2(frame.no)} 프레임${photo ? ` · ${photo.fileName}` : gone ? " · 선택에서 빠짐" : " · 비어 있음"}`}
        aria-pressed={cursor && manual}
        className={`relative block size-full cursor-pointer overflow-hidden ${empty && !gone ? "bg-brand-accent-surface" : ""} ${
          cursor ? "outline-2 -outline-offset-2 outline-dashed outline-brand-accent-default" : "hover:outline-2 hover:-outline-offset-2 hover:outline-brand-accent-default/50"
        }`}
        style={empty && gone ? { background: GONE_BG } : undefined}
      >
        {photo?.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} alt="" draggable={false} className="size-full object-cover" />
        )}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-center font-semibold ${photo ? "text-white/70" : gone ? "text-black/25" : "text-brand-accent-default/45"}`}
          style={{ fontSize: Math.max(12, Math.round(h / 5)) }}
        >
          {pad2(frame.no)}
        </span>
        {empty && gone && (
          <span className="absolute bottom-3 left-1/2 inline-flex h-6 -translate-x-1/2 items-center whitespace-nowrap rounded-(--pill) bg-surface-default-dark px-2.5 type-label-semibold-xs text-white">
            선택에서 빠짐
          </span>
        )}
      </button>
      {tip && (
        <span
          className={`absolute bottom-full left-1/2 z-[3] mb-2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-(--radius-8) py-1.5 type-label-semibold-xs text-white ${
            manual ? "bg-surface-default-darkness pr-1.5 pl-3" : "bg-brand-accent-default px-3"
          }`}
        >
          {tip}
          {manual && (
            <button type="button" aria-label="고르기 풀기" onClick={onClear} className="flex cursor-pointer rounded-(--radius-4) p-0.5 hover:bg-white/15">
              <CloseIcon size={14} />
            </button>
          )}
          <i aria-hidden className={`absolute top-full left-1/2 size-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 ${manual ? "bg-surface-default-darkness" : "bg-brand-accent-default"}`} />
        </span>
      )}
    </div>
  );
}

export function SpreadCanvas({
  album,
  F,
  width,
  photoOf,
  onFrame,
  onBackground,
  onClear,
}: {
  album: Album;
  F: FrameIndex;
  /** 펼침면 폭(px) — 높이는 앨범 사이즈 비율로 */
  width: number;
  photoOf: (photoId: number) => AlbumPhoto | null;
  onFrame: (frameId: string) => void;
  /** 종이 빈 곳을 눌렀을 때 — 고른 프레임 풀기 */
  onBackground: () => void;
  onClear: () => void;
}) {
  const spread = album.spreads[album.spread];
  const frames = F.of(album.spread);
  const height = Math.round(width / spreadRatio(album.page));
  return (
    <div
      className="relative shrink-0 bg-white shadow-[0_10px_30px_rgba(0,0,0,.14),0_1px_3px_rgba(0,0,0,.08)]"
      style={{ width, height }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackground();
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-[linear-gradient(90deg,rgba(0,0,0,.02),rgba(0,0,0,.09),rgba(0,0,0,.02))]" />
      {spread?.deco && (
        <div
          aria-hidden
          className="pointer-events-none absolute text-[#2b2b2b] italic"
          style={{
            left: `${(spread.deco.p * 0.5 + spread.deco.x * 0.5) * 100}%`,
            top: `${spread.deco.y * 100}%`,
            fontSize: Math.max(10, width / 34),
            lineHeight: 1.1,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {spread.deco.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
      {frames.map((f) => {
        const pid = album.assign[f.id];
        return (
          <FrameBox
            key={f.id}
            frame={f}
            photo={pid === undefined ? null : photoOf(pid)}
            gone={album.gone[f.id] !== undefined}
            cursor={album.cursor === f.id}
            manual={album.cursorMode === "manual"}
            spreadH={height}
            onClick={(e) => {
              e.stopPropagation();
              onFrame(f.id);
            }}
            onClear={onClear}
          />
        );
      })}
    </div>
  );
}
