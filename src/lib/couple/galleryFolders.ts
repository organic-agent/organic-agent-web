/**
 * 부부 — 카테고리 갤러리 폴더
 * 위치: src/lib/couple/galleryFolders.ts
 *
 * 사진을 장면 × 인물 조합의 폴더로 묶어 부부 갤러리에서 사용한다.
 */

import { useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";
import { PERSONS, PHOTOS, SCENES, type Photo } from "./photos";

export type GalleryFolder = {
  key: string;
  scene: string;
  person: string;
  label: string;
  photos: Photo[];
};

type PhotoFolderOverride = {
  scene: string;
  person: string;
};

const folderOverridesStore = createLocalStore<Record<number, PhotoFolderOverride>>(
  "wes.photoFolderOverrides",
  {},
);

const folderLabelsStore = createLocalStore<Record<string, string>>(
  "wes.galleryFolderLabels",
  {},
);

function buildGalleryFolders(
  overrides: Record<number, PhotoFolderOverride>,
  labels: Record<string, string>,
): GalleryFolder[] {
  const effectivePhotos = PHOTOS.map((photo) => ({
    ...photo,
    ...(overrides[photo.id] ?? {}),
  }));
  const folders: GalleryFolder[] = [];
  for (const scene of SCENES) {
    for (const person of PERSONS) {
      const photos = effectivePhotos.filter(
        (photo) => photo.scene === scene && photo.person === person,
      );
      if (photos.length === 0) continue;
      const key = `${scene}-${person}`;
      folders.push({
        key,
        scene,
        person,
        label: labels[key] ?? `${scene} - ${person}`,
        photos,
      });
    }
  }
  return folders;
}

export function getGalleryFolders(): GalleryFolder[] {
  return buildGalleryFolders(folderOverridesStore.get(), folderLabelsStore.get());
}

export function getGalleryFolderOptions(): Pick<
  GalleryFolder,
  "key" | "scene" | "person" | "label"
>[] {
  const labels = folderLabelsStore.get();
  return SCENES.flatMap((scene) =>
    PERSONS.map((person) => {
      const key = `${scene}-${person}`;
      return {
        key,
        scene,
        person,
        label: labels[key] ?? `${scene} - ${person}`,
      };
    }),
  );
}

export function useGalleryFolders(): GalleryFolder[] {
  const overrides = useSyncExternalStore(
    folderOverridesStore.subscribe,
    folderOverridesStore.get,
    folderOverridesStore.getServerSnapshot,
  );
  const labels = useSyncExternalStore(
    folderLabelsStore.subscribe,
    folderLabelsStore.get,
    folderLabelsStore.getServerSnapshot,
  );
  return useMemo(() => buildGalleryFolders(overrides, labels), [overrides, labels]);
}

export function renameGalleryFolder(folderKey: string, name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return folderLabelsStore.get();
  const next = { ...folderLabelsStore.get(), [folderKey]: trimmedName };
  folderLabelsStore.set(next);
  return next;
}

export function movePhotosToFolder(
  photoIds: number[],
  target: Pick<GalleryFolder, "scene" | "person">,
) {
  const current = folderOverridesStore.get();
  const next = { ...current };
  for (const photoId of photoIds) {
    next[photoId] = { scene: target.scene, person: target.person };
  }
  folderOverridesStore.set(next);
  return next;
}

export function getFolderByKey(key: string): GalleryFolder | undefined {
  return getGalleryFolders().find((folder) => folder.key === key);
}
