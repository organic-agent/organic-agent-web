import Link from "next/link";
import { photoUrl } from "@/lib/couple";
import type { PhotoGridItem } from "./PhotoGrid";

type Props<T extends PhotoGridItem> = {
  photos: T[];
  currentPhotoId: number;
  hrefForPhoto: (photo: T) => string;
};

export function PhotoDetailStage<T extends PhotoGridItem>({
  photos,
  currentPhotoId,
  hrefForPhoto,
}: Props<T>) {
  const currentIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === currentPhotoId),
  );
  const photo = photos[currentIndex];
  const previous = currentIndex > 0 ? photos[currentIndex - 1] : null;
  const next = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;

  if (!photo) return null;

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-paper">
      <div className="h-17 shrink-0 border-b border-line bg-white flex items-center gap-2 overflow-x-auto px-5 py-2">
        {photos.map((item) => (
          <Link
            key={item.id}
            href={hrefForPhoto(item)}
            aria-label={`사진 ${item.id} 보기`}
            className={`h-12 aspect-[4/3] rounded-md overflow-hidden border-2 shrink-0 transition-all ${
              item.id === photo.id
                ? "border-ink opacity-100"
                : "border-transparent opacity-55 hover:opacity-90"
            }`}
          >
            <img
              src={photoUrl(item.photoId, 220)}
              alt=""
              className="w-full h-full object-cover"
            />
          </Link>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center gap-4 px-4 md:px-7 py-6">
        {previous ? (
          <Link
            href={hrefForPhoto(previous)}
            aria-label="이전 사진"
            className="w-10 h-10 rounded-full border border-line bg-white grid place-items-center text-ink-2 hover:bg-paper-deep shrink-0"
          >
            <span aria-hidden="true">‹</span>
          </Link>
        ) : (
          <span className="w-10 shrink-0" />
        )}

        <div className="relative flex-1 min-w-0 h-full">
          <img
            src={photoUrl(photo.photoId, 1400)}
            alt={`사진 ${photo.id}`}
            className="absolute inset-0 w-full h-full object-contain"
          />
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[11px] text-white/95 bg-black/40 px-2.5 py-1 rounded-pill backdrop-blur-sm">
            #{String(photo.id).padStart(3, "0")} · {currentIndex + 1} / {photos.length}
          </span>
        </div>

        {next ? (
          <Link
            href={hrefForPhoto(next)}
            aria-label="다음 사진"
            className="w-10 h-10 rounded-full border border-line bg-white grid place-items-center text-ink-2 hover:bg-paper-deep shrink-0"
          >
            <span aria-hidden="true">›</span>
          </Link>
        ) : (
          <span className="w-10 shrink-0" />
        )}
      </div>
    </div>
  );
}
