import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import type { CollabPhoto } from "@/lib/couple";

type Props = {
  folderId: string;
  photos: CollabPhoto[];
};

export function CollaborationPhotoGrid({ folderId, photos }: Props) {
  return (
    <PhotoGrid
      photos={photos}
      hrefForPhoto={(photo) =>
        `/collaboration/${folderId}/photos/${photo.id}`
      }
      emptyMessage="아직 담긴 사진이 없어요. 카테고리 갤러리의 사진 상세에서 이 폴더에 사진을 추가해보세요."
    />
  );
}
