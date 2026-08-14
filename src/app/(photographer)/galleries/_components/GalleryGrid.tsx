/**
 * 작가 — 갤러리 그리드
 * 위치: src/app/(photographer)/galleries/_components/GalleryGrid.tsx
 *
 * 갤러리 목록 영역의 빈 상태, 필터 결과 없음 상태, 카드 그리드를 렌더링한다.
 * 갤러리가 있을 때는 마지막에 새 갤러리 추가 타일(피그마의 대시 타일)을 유지한다.
 */

import { PlusIcon } from "@/components/icons";
import type { Gallery } from "@/lib/galleries";
import { GalleryCard } from "./GalleryCard";
import { GalleryEmptyState } from "./GalleryEmptyState";

type Props = {
  galleries: Gallery[];
  filteredGalleries: Gallery[];
  onCreateClick: () => void;
  onEditGallery: (gallery: Gallery) => void;
  onDeleteGallery: (gallery: Gallery) => void;
  onShowAll: () => void;
};

export function GalleryGrid({
  galleries,
  filteredGalleries,
  onCreateClick,
  onEditGallery,
  onDeleteGallery,
  onShowAll,
}: Props) {
  if (galleries.length === 0) {
    return <GalleryEmptyState type="empty" onCreateClick={onCreateClick} />;
  }

  if (filteredGalleries.length === 0) {
    return <GalleryEmptyState type="filtered" onShowAll={onShowAll} />;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
      {filteredGalleries.map((gallery) => (
        <GalleryCard
          key={gallery.id}
          gallery={gallery}
          onEdit={onEditGallery}
          onDelete={onDeleteGallery}
        />
      ))}

      <button
        type="button"
        onClick={onCreateClick}
        className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-(--radius-16) border border-dashed border-stroke-neutral-muted text-fg-neutral-muted transition-colors duration-fast hover:bg-bg-layer-default-hover hover:text-fg-neutral"
      >
        <span className="grid size-14 place-items-center rounded-full border border-current">
          <PlusIcon size={24} />
        </span>
        <span className="type-body-large">새 갤러리 만들기</span>
      </button>
    </div>
  );
}
