/**
 * 폴더 미리보기 접힘 셀 — 피그마 Image/Cell state=stack 대응 (이슈 #31)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/ClusterStackCell.tsx
 *
 * 맨 앞 사진 = 묶음의 첫 장(서버가 정한 대표), 우하단 뱃지 = 장수.
 * 누르면 그리드가 이 묶음 안의 사진들로 바뀐다. 클러스터에는 임베딩이
 * 끝난 사진만 오므로 준비 중(물결) 상태가 없다.
 */

import type { GalleryPhoto } from "../_lib/useGalleryPhotos";

type ClusterStackCellProps = {
  photos: GalleryPhoto[];
  onOpen: () => void;
  /** 서명 URL 만료 폴백 — 그리드와 동일 */
  onImageError?: () => void;
};

export function ClusterStackCell({
  photos,
  onOpen,
  onImageError,
}: ClusterStackCellProps) {
  const representative = photos[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`묶음 ${photos.length}장 — 안의 사진 보기`}
      className="group relative block aspect-4/5 w-full cursor-pointer"
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-1 translate-y-0.5 -rotate-2 rounded-(--radius-4) bg-bg-disabled"
      />
      {photos.length > 3 && (
        <span
          aria-hidden
          className="absolute inset-0 translate-x-1 translate-y-0.5 rotate-2 rounded-(--radius-4) bg-bg-disabled"
        />
      )}
      <span className="absolute inset-0 overflow-hidden rounded-(--radius-4) bg-bg-disabled transition-opacity duration-fast group-hover:opacity-90">
        {representative?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={representative.url}
            alt=""
            loading="lazy"
            onError={onImageError}
            className="size-full object-cover"
          />
        )}
      </span>
      <span className="absolute right-1 bottom-1 rounded-(--radius-4) bg-bg-neutral-inverted px-1 py-0.5 type-body-small leading-none text-fg-neutral-inverted">
        {photos.length}장
      </span>
    </button>
  );
}
