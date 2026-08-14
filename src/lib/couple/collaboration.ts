/**
 * 부부 — 협업 셀렉 폴더 저장소
 * 위치: src/lib/couple/collaboration.ts
 *
 * 가족·지인에게 의견을 받을 협업 폴더, 사진, 댓글을 관리한다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";
import type { Photo } from "./photos";

export type CollabPhoto = {
  id: number;
  photoId: string;
  sad: number;
  soso: number;
  good: number;
};

export type CollabComment = {
  id: number;
  author: string;
  avatar: string;
  text: string;
  photoId?: number;
};

export type CollabFolder = {
  id: string;
  name: string;
  memo: string;
  photos: CollabPhoto[];
  comments: CollabComment[];
  createdAt: number;
};

const FOLDERS_KEY = "wes.collabFolders";

const SEED_FOLDERS: CollabFolder[] = [
  {
    id: "1",
    name: "본식 어떤 게 나을까?",
    memo: "둘 중에 고민돼요, 봐주세요",
    photos: [
      { id: 1, photoId: "1519741497674-611481863552", sad: 0, soso: 1, good: 4 },
      { id: 2, photoId: "1583939003579-730e3918a45a", sad: 2, soso: 2, good: 1 },
    ],
    comments: [
      {
        id: 1,
        author: "어머니",
        avatar: "母",
        text: "다들 예쁘게 나왔네~ 3번이 제일 좋다",
      },
      {
        id: 2,
        author: "언니",
        avatar: "姉",
        text: "1번 표정이 자연스러워서 좋아",
        photoId: 1,
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "2",
    name: "야외 스냅 베스트",
    memo: "",
    photos: [
      { id: 11, photoId: "1511285560929-80b456fea0bc", sad: 0, soso: 0, good: 0 },
      { id: 12, photoId: "1519225421980-715cb0215aed", sad: 0, soso: 0, good: 0 },
      { id: 13, photoId: "1465495976277-4387d4b0b4c6", sad: 0, soso: 0, good: 0 },
    ],
    comments: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "3",
    name: "가족사진 고르기",
    memo: "부모님도 봐주셨으면",
    photos: [
      { id: 21, photoId: "1537633552985-df8429e8048b", sad: 0, soso: 0, good: 0 },
      { id: 22, photoId: "1460978812857-470ed1c77af0", sad: 0, soso: 0, good: 0 },
    ],
    comments: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
];

const foldersStore = createLocalStore<CollabFolder[]>(FOLDERS_KEY, SEED_FOLDERS);

export function useFolders(): CollabFolder[] {
  return useSyncExternalStore(
    foldersStore.subscribe,
    foldersStore.get,
    foldersStore.getServerSnapshot,
  );
}

export function getFolder(id: string): CollabFolder | undefined {
  return foldersStore.get().find((folder) => folder.id === id);
}

export function createFolder(input: {
  name: string;
  memo: string;
  photos: Photo[];
}): CollabFolder {
  const folder: CollabFolder = {
    id: String(Date.now()),
    name: input.name,
    memo: input.memo,
    photos: input.photos.map((photo) => ({
      id: photo.id,
      photoId: photo.photoId,
      sad: 0,
      soso: 0,
      good: 0,
    })),
    comments: [],
    createdAt: Date.now(),
  };
  foldersStore.set([folder, ...foldersStore.get()]);
  return folder;
}

export function updateFolder(
  folderId: string,
  patch: Partial<Pick<CollabFolder, "name" | "memo">>,
): CollabFolder[] {
  const next = foldersStore.get().map((folder) =>
    folder.id === folderId ? { ...folder, ...patch } : folder,
  );
  foldersStore.set(next);
  return next;
}

export function deleteFolder(folderId: string): CollabFolder[] {
  const next = foldersStore.get().filter((folder) => folder.id !== folderId);
  foldersStore.set(next);
  return next;
}

export function addPhotoToFolder(folderId: string, photo: Photo): CollabFolder[] {
  const next = foldersStore.get().map((folder) => {
    if (folder.id !== folderId) return folder;
    if (folder.photos.some((item) => item.id === photo.id)) return folder;

    return {
      ...folder,
      photos: [
        ...folder.photos,
        {
          id: photo.id,
          photoId: photo.photoId,
          sad: 0,
          soso: 0,
          good: 0,
        },
      ],
    };
  });
  foldersStore.set(next);
  return next;
}

export function addComment(
  folderId: string,
  comment: { author: string; avatar: string; text: string; photoId?: number },
): CollabFolder[] {
  const next = foldersStore.get().map((folder) =>
    folder.id === folderId
      ? { ...folder, comments: [...folder.comments, { ...comment, id: Date.now() }] }
      : folder,
  );
  foldersStore.set(next);
  return next;
}
