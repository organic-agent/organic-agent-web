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
  comparisonPhotoId?: number;
};

function thumbnailClassName(active: boolean) {
  const base =
    "relative w-11 h-14 rounded overflow-hidden shrink-0 transition-all";
  return active
    ? `${base} ring-2 ring-ink ring-offset-1 ring-offset-white opacity-100`
    : `${base} opacity-60 hover:opacity-100`;
}

export function PhotoFilmstrip({
  photos,
  currentIndex,
  onSelect,
  comparisonPhotoId,
}: Props) {
  return (
    <div className="shrink-0 h-17 border-b border-line px-6 overflow-x-auto">
      <div className="flex items-center gap-2 h-full">
        {photos.map((photo, index) => {
          const comparisonFirst = comparisonPhotoId === photo.id;
          return (
            <button
              key={photo.id}
              onClick={() => onSelect(index)}
              aria-label={
                comparisonFirst
                  ? `비교 사진 A, 사진 ${index + 1}`
                  : `사진 ${index + 1}`
              }
              className={thumbnailClassName(
                comparisonPhotoId !== undefined
                  ? comparisonFirst
                  : index === currentIndex,
              )}
            >
              <img
                src={photoUrl(photo.photoId, 200)}
                alt=""
                className="w-full h-full object-cover"
              />
              {comparisonFirst && (
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-ink text-on-ink text-[10px] font-semibold grid place-items-center shadow-sm">
                  A
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
