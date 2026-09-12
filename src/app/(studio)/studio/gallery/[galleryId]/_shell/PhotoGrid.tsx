"use client";

/**
 * 사진 그리드 — 행 높이 고정 justified(디자이너 시안): 사진은 제 비율대로, 한 줄이 폭에 꽉 차게
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid.tsx
 *
 * 줌은 기준 행 높이(80~220px)로 바뀐다. 한 줄에 사진을 비율대로 이어 붙이다가 폭을 넘기면 그 줄을
 * 폭에 맞춰 살짝 줄인다(넘긴 뒤 맞추므로 늘리는 일은 없다). 마지막 줄은 기준 높이 그대로 왼쪽 정렬
 * (빈 자리는 남긴다 — 2026-09-11 답).
 * 가로세로 크기 값이 서버 사진 응답에 없어(백엔드 요청) 비율은 이미지가 로드될 때 재서 모듈 캐시에 둔다 —
 * 모르는 동안은 3:2로 두고 알게 되면 줄이 다시 흐른다. 서버가 width · height를 주면 그 값으로 캐시를 채우면 된다.
 *
 * 선택 표시 두 가지(markStyle): "line" = 안쪽 2px 선 + 2px 흰 틈 + 체크(작가 화면 · 1단계) /
 * "check" = 왼쪽 위 체크만(클라이언트 2단계, 2026-09-12). currentId(싱글뷰로 열릴 사진)는 같은 구조의
 * 올리브 선. showScore면 왼쫽 아래 별점 배지(줌이 작으면 숨김). onOpen이 있으면 호버 돋보기 · 더블클릭 · 호버 캡션.
 * PENDING(올리는 중)은 회색 자리, HEIC · HEIF는 미리보기 전(previewReady=false)엔 "미리보기 준비 중" 자리.
 * markedIds(표시만 하는 선택)는 작가가 클라이언트의 선택을 볼 때 쓴다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoIcon, StarFillIcon, ZoomInIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";

/** 줌 0~100 → 기준 행 높이(px) */
export const rowHeightOf = (zoom: number) => Math.round(80 + (zoom / 100) * 140);
const GAP = 8;
const DEFAULT_RATIO = 1.5;
/** 이보다 낮은 줄에서는 배지 · 캡션을 숨긴다(줌 약 30% 미만) */
const DETAIL_MIN_HEIGHT = 110;

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
    const scale = Math.min(1, (width - gaps) / natural);
    const exact = rowHeight * scale;
    const height = Math.floor(exact);
    // 폭은 반올림 전 높이로 재고, 마지막 장이 남은 폭을 가져가 줄이 넘치지 않게 한다
    const widths = ratios.map((r) => Math.floor(r * exact));
    if (!last && widths.length > 0) {
      const others = widths.slice(0, -1).reduce((n, w) => n + w, 0);
      widths[widths.length - 1] = Math.max(1, width - gaps - others);
    }
    rows.push({ photos: current, height, widths });
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

function Check({ selected, filled }: { selected: boolean; filled: boolean }) {
  const on = selected ? (filled ? "bg-contents-light-bgd-default border-contents-light-bgd-default opacity-100" : "bg-black/60 opacity-100") : "bg-black/30 opacity-0 group-hover:opacity-100";
  return (
    <span
      aria-hidden
      className={`absolute top-2.5 left-2.5 grid size-5.5 place-items-center rounded-(--radius-4) border border-white/90 text-white transition-opacity duration-fast ${on}`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5 6.5 11.5 12.5 5" />
      </svg>
    </span>
  );
}

const LINE_SELECTED = "shadow-[inset_0_0_0_2px_var(--contents-light-bgd-default),inset_0_0_0_4px_var(--background-default-main)]";
const LINE_CURRENT = "shadow-[inset_0_0_0_2px_var(--brand-secondary-default),inset_0_0_0_4px_var(--background-default-main)]";

export function PhotoGrid({
  photos,
  zoom,
  selectedIds,
  onToggle,
  markedIds,
  selectable = true,
  markStyle = "line",
  currentId = null,
  showScore = false,
  onOpen,
  captionOf,
  scrollToId = null,
}: {
  photos: PhotoResponse[];
  /** 0~100 — 기준 행 높이로 바뀐다 */
  zoom: number;
  selectedIds: ReadonlySet<number>;
  onToggle: (photoId: number) => void;
  /** 표시만 하는 선택(작가가 보는 클라이언트의 선택) */
  markedIds?: ReadonlySet<number>;
  /** false면 클릭해도 선택되지 않는다 */
  selectable?: boolean;
  /** 선택 표시 — line(안쪽 선 + 체크) · check(체크만) */
  markStyle?: "line" | "check";
  /** 싱글뷰로 열릴(마지막으로 본) 사진 — 올리브 안쪽 선 */
  currentId?: number | null;
  /** 왼쪽 아래 별점 배지 */
  showScore?: boolean;
  /** 있으면 호버 돋보기 · 더블클릭으로 연다(싱글뷰) */
  onOpen?: (photoId: number) => void;
  /** 호버 캡션의 둘째 줄(폴더 이름 등) */
  captionOf?: (photo: PhotoResponse) => string | null;
  /** 이 사진이 보이도록 스크롤(싱글뷰에서 돌아왔을 때) — 값이 바뀔 때 한 번 */
  scrollToId?: number | null;
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

  useEffect(() => {
    if (scrollToId === null) return;
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-photo-id="${scrollToId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [scrollToId]);

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
            const current = currentId === photo.photoId;
            const pending = photo.viewUrl === null;
            // 임베더가 파생 JPEG를 만들기 전의 HEIC · HEIF 원본은 <img>가 못 그린다
            const preparing = !pending && !photo.previewReady && /hei[cf]/i.test(photo.contentType);
            const detailed = row.height >= DETAIL_MIN_HEIGHT;
            const line = markStyle === "line" && selected ? LINE_SELECTED : current ? LINE_CURRENT : "";
            const caption = captionOf?.(photo) ?? null;
            return (
              <button
                key={photo.photoId}
                type="button"
                data-photo-id={photo.photoId}
                aria-pressed={selectable ? selected : undefined}
                aria-current={current || undefined}
                aria-label={`${photo.originalFileName}${selected ? " 선택됨" : ""}${photo.score ? ` 별점 ${photo.score}` : ""}`}
                onClick={selectable ? () => onToggle(photo.photoId) : undefined}
                onDoubleClick={onOpen ? () => onOpen(photo.photoId) : undefined}
                style={{ width: row.widths[i], height: row.height }}
                className={`group relative shrink-0 overflow-hidden rounded-(--radius-8) bg-surface-default-light text-left ${
                  selectable ? "cursor-pointer" : onOpen ? "cursor-zoom-in" : "cursor-default"
                } ${line}`}
              >
                {pending || preparing ? (
                  <span className="absolute inset-0 grid place-items-center text-contents-light-bgd-weakness">
                    <span className="flex flex-col items-center gap-1">
                      <PhotoIcon size={22} />
                      {preparing && detailed && <span className="type-label-semibold-xs">미리보기 준비 중</span>}
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
                {onOpen && detailed && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/60 to-transparent px-2.5 pt-6 pb-2 text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                  >
                    <span className="truncate type-label-semibold-xs">{photo.originalFileName}</span>
                    {caption && <span className="truncate type-content-xs text-white/75">{caption}</span>}
                  </span>
                )}
                {(selectable || selected) && <Check selected={selected} filled={markStyle === "check"} />}
                {showScore && photo.score !== null && detailed && (
                  <span
                    aria-hidden
                    className="absolute bottom-2 left-2 inline-flex h-4.5 items-center gap-0.5 rounded-(--pill) bg-black/50 pr-1.5 pl-1 type-label-semibold-xs text-white"
                  >
                    <StarFillIcon size={11} />
                    {photo.score}
                  </span>
                )}
                {onOpen && (
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label="한 장 보기"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(photo.photoId);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="absolute right-2 bottom-2 grid size-6 cursor-zoom-in place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100 hover:bg-black/65"
                  >
                    <ZoomInIcon size={15} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
