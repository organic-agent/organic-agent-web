/**
 * 부부 — 카테고리 갤러리 폴더
 * 위치: src/lib/couple/galleryFolders.ts
 *
 * 사진을 장면 × 인물 조합의 폴더로 묶어 부부 갤러리에서 사용한다.
 */

import { PERSONS, PHOTOS, SCENES, type Photo } from "./photos";

export type GalleryFolder = {
  key: string;
  scene: string;
  person: string;
  label: string;
  photos: Photo[];
};

export function getGalleryFolders(): GalleryFolder[] {
  const folders: GalleryFolder[] = [];
  for (const scene of SCENES) {
    for (const person of PERSONS) {
      const photos = PHOTOS.filter(
        (photo) => photo.scene === scene && photo.person === person,
      );
      if (photos.length === 0) continue;
      folders.push({
        key: `${scene}-${person}`,
        scene,
        person,
        label: `${scene} - ${person}`,
        photos,
      });
    }
  }
  return folders;
}

export function getFolderByKey(key: string): GalleryFolder | undefined {
  return getGalleryFolders().find((folder) => folder.key === key);
}
