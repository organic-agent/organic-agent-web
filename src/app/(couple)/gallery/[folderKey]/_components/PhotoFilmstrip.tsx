/**
 * 부부 — 사진 썸네일 필름스트립
 * 위치: src/app/(couple)/gallery/[folderKey]/_components/PhotoFilmstrip.tsx
 *
 * 현재 필터에 해당하는 사진들을 상단 썸네일로 보여준다.
 */

import { photoUrl, type Photo } from "@/lib/couple";

type Props = {
  photos: Photo[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

function thumbnailClassName(active: boolean) {
  const base =
    "relative w-12 h-16 rounded overflow-hidden shrink-0 transition-all";
  return active
    ? `${base} ring-2 ring-ink ring-offset-1 ring-offset-white opacity-100`
    : `${base} opacity-60 hover:opacity-100`;
}

export function PhotoFilmstrip({ photos, currentIndex, onSelect }: Props) {
  return (
    <div className="shrink-0 border-b border-line px-6 py-3 overflow-x-auto">
      <div className="flex items-center gap-2">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => onSelect(index)}
            aria-label={`사진 ${index + 1}`}
            className={thumbnailClassName(index === currentIndex)}
          >
            <img
              src={photoUrl(photo.photoId, 200)}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
