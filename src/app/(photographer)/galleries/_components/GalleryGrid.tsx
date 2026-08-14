/**
 * 작가 — 갤러리 그리드
 * 위치: src/app/(photographer)/galleries/_components/GalleryGrid.tsx
 *
 * 갤러리 목록 영역의 빈 상태, 필터 결과 없음 상태, 카드 그리드를 렌더링한다.
 * 갤러리가 있을 때는 마지막에 새 갤러리 추가 카드를 유지한다.
 *
 * 주요 책임:
 * - 빈 상태 분기
 * - 갤러리 카드 목록 렌더링
 * - 새 갤러리 추가 카드 렌더링
 */

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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {filteredGalleries.map((gallery) => (
        <GalleryCard
          key={gallery.id}
          gallery={gallery}
          onEdit={onEditGallery}
          onDelete={onDeleteGallery}
        />
      ))}

      <button
        onClick={onCreateClick}
        className="border border-dashed border-line-strong rounded-lg min-h-[280px] flex flex-col items-center justify-center gap-3 text-ink-3 hover:text-ink hover:border-ink hover:bg-paper-deep/40 transition-colors"
        type="button"
      >
        <div className="w-12 h-12 rounded-full border border-current grid place-items-center">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <span className="text-[13px]">새 갤러리 만들기</span>
      </button>
    </div>
  );
}
