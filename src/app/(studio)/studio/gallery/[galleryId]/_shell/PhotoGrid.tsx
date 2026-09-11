"use client";

/**
 * 사진 그리드 + 타일 — 선택 사진은 안쪽 2px 선 + 2px 흰 틈, 체크는 반투명 검정 사각 (디자이너 규격)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid.tsx
 *
 * 줌은 타일 최소 폭(120~320px)으로 바뀐다. 가로세로 크기 값이 서버 사진 응답에 없어 지금은
 * 3:2 고정 비율로 자르고(object-cover), 높이 맞춤 정렬(justified)은 크기 값이 오면 바꾼다.
 * PENDING(올리는 중) 사진은 회색 자리. selectable이면 클릭 = 작가 선택 토글.
 * markedIds(클라이언트가 고른 사진)는 같은 선택 구조로 표시만 한다(2단계, 2026-09-11 결정).
 */

import { PhotoIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";

export const tileWidthOf = (zoom: number) => Math.round(120 + (zoom / 100) * 200);

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
  zoom: number;
  selectedIds: Set<number>;
  onToggle: (photoId: number) => void;
  /** 표시만 하는 선택(클라이언트가 고른 사진) */
  markedIds?: Set<number>;
  /** false면 클릭해도 선택되지 않는다 */
  selectable?: boolean;
}) {
  return (
    <div
      className="grid gap-2 px-5 pb-6"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tileWidthOf(zoom)}px, 1fr))` }}
    >
      {photos.map((photo) => {
        const selected = selectedIds.has(photo.photoId) || (markedIds?.has(photo.photoId) ?? false);
        const pending = photo.viewUrl === null;
        return (
          <button
            key={photo.photoId}
            type="button"
            aria-pressed={selectable ? selected : undefined}
            aria-label={`${photo.originalFileName}${selected ? " 선택됨" : ""}`}
            onClick={selectable ? () => onToggle(photo.photoId) : undefined}
            className={`group relative aspect-3/2 overflow-hidden rounded-(--radius-8) bg-surface-default-light text-left ${
              selectable ? "cursor-pointer" : "cursor-default"
            } ${
              selected
                ? "shadow-[inset_0_0_0_2px_var(--contents-light-bgd-default),inset_0_0_0_4px_var(--background-default-main)]"
                : ""
            }`}
          >
            {pending ? (
              <span className="absolute inset-0 grid place-items-center text-contents-light-bgd-weakness">
                <PhotoIcon size={22} />
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.viewUrl ?? undefined}
                alt=""
                loading="lazy"
                draggable={false}
                className="size-full object-cover"
              />
            )}
            {(selectable || selected) && <Check selected={selected} />}
          </button>
        );
      })}
    </div>
  );
}
