"use client";

/**
 * 사진 그리드 — 행 높이 고정 justified(디자이너 시안): 사진은 제 비율대로, 한 줄이 폭에 꽉 차게
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid.tsx
 *
 * 줌은 기준 행 높이(80~220px)로 바뀐다. 한 줄에 사진을 비율대로 이어 붙이다가 폭을 넘기면 그 줄을
 * 폭에 맞춰 살짝 키우거나 줄인다. 마지막 줄은 기준 높이 그대로 왼쪽 정렬(빈 자리는 남긴다 — 2026-09-11 답).
 * 가로세로 크기 값이 서버 사진 응답에 없어(백엔드 요청) 비율은 이미지가 로드될 때 재서 모듈 캐시에 둔다 —
 * 모르는 동안은 3:2로 두고 알게 되면 줄이 다시 흐른다. 서버가 width · height를 주면 그 값으로 캐시를 채우면 된다.
 *
 * 선택 사진은 안쪽 2px 선 + 2px 흰 틈, 체크는 반투명 검정 사각(디자이너 규격). PENDING(올리는 중)은 회색 자리,
 * HEIC · HEIF는 미리보기 전(previewReady=false)엔 원본 URL이라 못 그리므로 "미리보기 준비 중" 자리.
 * markedIds(클라이언트가 고른 사진)는 같은 선택 구조로 표시만 한다(2단계, 2026-09-11 결정).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";

/** 줌 0~100 → 기준 행 높이(px) */
export const rowHeightOf = (zoom: number) => Math.round(80 + (zoom / 100) * 140);
/** 옛 호출부 호환 — 기준 타일 폭(3:2 기준) */
export const tileWidthOf = (zoom: number) => Math.round(rowHeightOf(zoom) * 1.5);

const GAP = 8;
const DEFAULT_RATIO = 1.5;
/** 한 줄에 한 장만 남아 폭에 맞추면 너무 커지는 것을 막는 상한 */
const MAX_ROW_SCALE = 1.35;

/** 사진 비율 캐시(가로/세로) — 폴더를 오가도, 다시 그려도 잊지 않는다 */
const ratioCache = new Map<number, number>();

type Row = { photos: PhotoResponse[]; height: number; widths: number[] };

function layoutRows(photos: PhotoResponse[], width: number, rowHeight: number): Row[] {
  if (width <= 0 || photos.length === 0) return [];
  const rows: Row[] = [];
  let current: PhotoResponse[] = [];
  let ratios: number[] = [];
  let sum = 0;

  function flush(last: boolean) {
    if (current.length === 0) return;
    const gaps = GAP * (current.length - 1);
    const natural = sum * rowHeight;
    let scale = (width - gaps) / natural;
    if (last) scale = Math.min(scale, 1);
    scale = Math.min(scale, MAX_ROW_SCALE);
    const height = Math.round(rowHeight * scale);
    rows.push({
      photos: current,
      height,
      widths: ratios.map((r) => Math.floor(r * height)),
    });
    current = [];
    ratios = [];
    sum = 0;
  }

  for (const photo of photos) {
    const ratio = ratioCache.get(photo.photoId) ?? DEFAULT_RATIO;
    current.push(photo);
    ratios.push(ratio);
    sum += ratio;
    if (sum * rowHeight + GAP * (current.length - 1) >= width) flush(false);
  }
  flush(true);
  return rows;
}

function Check({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute top-2.5 left-2.5 grid size-5.5 place-items-center rounded-(--radius-4) border border-white/90 text-white transition-opacity duration-fast ${
        selected ? "bg-black/60 opacity-100" : "bg-black/30 opacity-0 group-hover:opacity-100"
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5 6.5 11.5 12.5 5" />
      </svg>
    </span>
  );
}

export function PhotoGrid({
  photos,
  zoom,
  selectedIds,
  onToggle,
  markedIds,
  selectable = true,
}: {
  photos: PhotoResponse[];
  /** 0~100 — 기준 행 높이로 바뀐다 */
  zoom: number;
  selectedIds: Set<number>;
  onToggle: (photoId: number) => void;
  /** 표시만 하는 선택(클라이언트가 고른 사진) */
  markedIds?: Set<number>;
  /** false면 클릭해도 선택되지 않는다 */
  selectable?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // 비율을 새로 알게 되면 한 프레임에 한 번만 다시 흐른다
  const [ratioNonce, setRatioNonce] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function learnRatio(photoId: number, img: HTMLImageElement) {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    const known = ratioCache.get(photoId);
    if (known !== undefined && Math.abs(known - ratio) < 0.01) return;
    ratioCache.set(photoId, ratio);
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setRatioNonce((n) => n + 1);
      });
    }
  }

  const rowHeight = rowHeightOf(zoom);
  const rows = useMemo(
    () => layoutRows(photos, width, rowHeight),
    // ratioNonce는 캐시가 바뀌었다는 신호 — 값 자체는 쓰지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, width, rowHeight, ratioNonce],
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-2 px-5 pb-6">
      {rows.map((row, rowIndex) => (
        <div key={row.photos[0]?.photoId ?? rowIndex} className="flex gap-2" style={{ height: row.height }}>
          {row.photos.map((photo, i) => {
            const selected = selectedIds.has(photo.photoId) || (markedIds?.has(photo.photoId) ?? false);
            const pending = photo.viewUrl === null;
            // 임베더가 파생 JPEG를 만들기 전의 HEIC · HEIF 원본은 <img>가 못 그린다
            const preparing = !pending && !photo.previewReady && /hei[cf]/i.test(photo.contentType);
            return (
              <button
                key={photo.photoId}
                type="button"
                aria-pressed={selectable ? selected : undefined}
                aria-label={`${photo.originalFileName}${selected ? " 선택됨" : ""}`}
                onClick={selectable ? () => onToggle(photo.photoId) : undefined}
                style={{ width: row.widths[i], height: row.height }}
                className={`group relative shrink-0 overflow-hidden rounded-(--radius-8) bg-surface-default-light text-left ${
                  selectable ? "cursor-pointer" : "cursor-default"
                } ${
                  selected
                    ? "shadow-[inset_0_0_0_2px_var(--contents-light-bgd-default),inset_0_0_0_4px_var(--background-default-main)]"
                    : ""
                }`}
              >
                {pending || preparing ? (
                  <span className="absolute inset-0 grid place-items-center text-contents-light-bgd-weakness">
                    <span className="flex flex-col items-center gap-1">
                      <PhotoIcon size={22} />
                      {preparing && row.height >= 110 && (
                        <span className="type-label-semibold-xs">미리보기 준비 중</span>
                      )}
                    </span>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.viewUrl ?? undefined}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onLoad={(e) => learnRatio(photo.photoId, e.currentTarget)}
                    className="size-full object-cover"
                  />
                )}
                {(selectable || selected) && <Check selected={selected} />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
