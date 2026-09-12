/**
 * 공유폴더(협업 세션) API — 스웨거 [Collab Session] 계약의 타입화 (게스트 초대 · 공유 탭)
 * 위치: src/lib/api/collab.ts
 *
 * 공유폴더 하나 = 게스트 링크 하나(collabUrl, 7일 유효). 사진은 직접 담거나(MANUAL, photoIds) 컨셉 폴더를 따라간다
 * (CONCEPT_FOLDER, conceptFolderId — 폴더가 바뀌면 같이 바뀜). includeAllAlbums=true면 게스트 첫 화면에 이 갤러리의
 * 공유폴더 전부가 앨범으로 보인다(부분 집합은 불가 — 고른 공유폴더 몇 개를 링크 하나로 주려면 사진을 합친 새 공유폴더를 만든다).
 * 게스트 쪽(collab/{token})은 C6.
 */

import { api } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";

export type CollabSessionResponse = {
  sessionId: number;
  galleryId: number;
  /** 컨셉 폴더를 따라가는 공유폴더면 그 id, 직접 담은 폴더면 null */
  conceptFolderId: number | null;
  name: string;
  /** 게스트 링크 */
  collabUrl: string;
  revoked: boolean;
  revokedAt: string | null;
  photoCount: number;
  createdAt: string | null;
  expiresAt: string | null;
  coverTitle: string | null;
  coverAuthor: string | null;
  includeAllAlbums: boolean;
  selectionMode: "MANUAL" | "CONCEPT_FOLDER";
};

export type CollabPhotoResponse = {
  photoId: number;
  photo: PhotoResponse;
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

export type CollabPhotoPageResponse = {
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
  contents: CollabPhotoResponse[];
  viewUrlTtlSeconds: number;
};

export function listCollabSessions(galleryId: number): Promise<CollabSessionResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions`);
}

/** 한 번에 담을 수 있는 사진 수(서버 CollabPhotoIdsRequest.MAX_BATCH_SIZE) */
export const COLLAB_PHOTO_BATCH = 200;

/**
 * 공유폴더 만들기 — 이름만으로 빈 폴더, photoIds(200장까지)로 처음 사진, conceptFolderId면 그 컨셉을 따라가는 폴더
 * (같은 컨셉은 기존 세션 재사용 · 이름 갱신). 새 링크는 7일. 보관된 갤러리는 못 만든다. 201 + 세션 본문.
 */
export function createCollabSession(
  galleryId: number,
  body: { name: string; photoIds?: number[]; conceptFolderId?: number | null; coverTitle?: string | null; coverAuthor?: string | null; includeAllAlbums?: boolean | null },
): Promise<CollabSessionResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions`, { method: "POST", body });
}

/** 사진을 직접 담는 공유폴더 — 200장 넘으면 만든 뒤 나머지를 200장씩 더 담는다 */
export async function openManualCollabSession(
  galleryId: number,
  body: { name: string; coverTitle?: string | null; coverAuthor?: string | null },
  photoIds: number[],
): Promise<CollabSessionResponse> {
  const ids = [...new Set(photoIds)];
  let session = await createCollabSession(galleryId, { ...body, photoIds: ids.slice(0, COLLAB_PHOTO_BATCH) });
  for (let i = COLLAB_PHOTO_BATCH; i < ids.length; i += COLLAB_PHOTO_BATCH) {
    session = await addCollabPhotos(galleryId, session.sessionId, ids.slice(i, i + COLLAB_PHOTO_BATCH));
  }
  return session;
}

export function renameCollabSession(
  galleryId: number,
  sessionId: number,
  body: { name?: string | null; coverTitle?: string | null; coverAuthor?: string | null; includeAllAlbums?: boolean | null },
): Promise<CollabSessionResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}`, { method: "PATCH", body });
}

/** 링크 폐기 — 게스트는 더 못 들어온다. 다시 발행하면 새 토큰 */
export function revokeCollabSession(galleryId: number, sessionId: number): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}`, { method: "DELETE" });
}

/** 재발행 — 기존 반응은 그대로, 토큰을 바꾸고 7일 연장 */
export function republishCollabSession(galleryId: number, sessionId: number): Promise<CollabSessionResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}/republish`, { method: "POST" });
}

export function addCollabPhotos(galleryId: number, sessionId: number, photoIds: number[]): Promise<CollabSessionResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}/photos`, { method: "POST", body: { photoIds } });
}

/** 공유폴더의 사진 전부(200장씩 끝까지) — 반응 수 포함. 묶음 링크를 만들 때 사진 id를 모은다 */
export async function listAllCollabPhotos(galleryId: number, sessionId: number): Promise<CollabPhotoResponse[]> {
  const out: CollabPhotoResponse[] = [];
  for (let page = 0; page < 50; page++) {
    const res: CollabPhotoPageResponse = await api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}/photos?page=${page}&size=200`);
    out.push(...res.contents);
    if (!res.hasNext) break;
  }
  return out;
}
