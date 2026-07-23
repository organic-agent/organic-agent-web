import Link from "next/link";
import { photoUrl } from "@/lib/couple";

export type PhotoGridItem = {
  id: number;
  photoId: string;
};

type Props<T extends PhotoGridItem> = {
  photos: T[];
  hrefForPhoto: (photo: T) => string;
  badgesForPhoto?: (photo: T) => string[];
  footerForPhoto?: (photo: T) => React.ReactNode;
  emptyMessage?: string;
  selectionMode?: boolean;
  selectedIds?: Set<number>;
  onTogglePhoto?: (photo: T) => void;
  /** 사진 위 좌하단 #번호 뱃지 표시 여부 (푸터에 번호가 따로 있으면 false) */
  showIdBadge?: boolean;
};

export function PhotoGrid<T extends PhotoGridItem>({
  photos,
  hrefForPhoto,
  badgesForPhoto,
  footerForPhoto,
  emptyMessage = "표시할 사진이 없어요.",
  selectionMode = false,
  selectedIds,
  onTogglePhoto,
  showIdBadge = true,
}: Props<T>) {
  if (photos.length === 0) {
    return (
      <div className="min-h-[320px] rounded-xl border border-dashed border-line grid place-items-center px-6 text-center">
        <p className="text-[13px] text-ink-3">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
      {photos.map((photo) => {
        const badges = badgesForPhoto?.(photo) ?? [];
        const selected = selectedIds?.has(photo.id) ?? false;
        const cardClassName = `group relative w-full text-left rounded-xl border bg-white overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
          selected
            ? "border-ink ring-2 ring-ink shadow-md"
            : "border-line hover:-translate-y-0.5 hover:shadow-md"
        }`;
        const content = (
          <>
            <div className="relative aspect-[4/3] bg-paper-deep overflow-hidden">
              <img
                src={photoUrl(photo.photoId, 800)}
                alt={`사진 ${photo.id}`}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              {showIdBadge && (
                <span className="absolute bottom-2.5 left-2.5 font-mono text-[10px] text-white/95 bg-black/35 px-2 py-1 rounded-pill backdrop-blur-sm">
                  #{String(photo.id).padStart(3, "0")}
                </span>
              )}
              {badges.length > 0 && (
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="px-2 py-1 rounded-pill bg-white/90 text-[10px] font-medium text-ink shadow-sm backdrop-blur-sm"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              {selectionMode && (
                <span
                  className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full border-2 grid place-items-center text-[13px] font-semibold shadow-sm transition-colors ${
                    selected
                      ? "bg-ink border-ink text-on-ink"
                      : "bg-white/90 border-white text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </div>
            {footerForPhoto && <div className="p-4">{footerForPhoto(photo)}</div>}
          </>
        );

        if (selectionMode) {
          return (
            <button
              key={photo.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onTogglePhoto?.(photo)}
              className={cardClassName}
            >
              {content}
            </button>
          );
        }

        return (
          <Link key={photo.id} href={hrefForPhoto(photo)} className={cardClassName}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
