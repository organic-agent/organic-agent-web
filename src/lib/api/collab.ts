/**
 * 공유폴더(협업 세션) API — 스웨거 [Collab Session] 계약의 타입화 (게스트 초대 · 공유 탭)
 * 위치: src/lib/api/collab.ts
 *
 * 공유폴더 하나 = 게스트 링크 하나(collabUrl, 7일 유효). 공유폴더는 컨셉 · 세부 폴더와 따로 산다 — 컨셉으로 만들어도
 * 그 순간의 사진을 복사해 담고, 이후 폴더를 정리해도 바뀌지 않는다. includeAllAlbums=true면 게스트 첫 화면에 이 갤러리의
 * 공유폴더 전부가 앨범으로 보인다(부분 집합은 불가 — 고른 공유폴더 몇 개를 링크 하나로 주려면 사진을 합친 새 공유폴더를 만든다).
 * 게스트 쪽(collab/{token})은 C6.
 */

import { api } from "@/lib/api/client";
import type { CollabCommentPageResponse, CollabCommentResponse } from "@/lib/api/collabGuest";
import type { PhotoResponse } from "@/lib/api/photos";

export type CollabSessionResponse = {
  sessionId: number;
  galleryId: number;
  name: string;
  /** 게스트 링크 */
  collabUrl: string;
  revoked: boolean;
  revokedAt: string | null;
  photoCount: number;
  /** 닉네임을 적고 들어온 하객 + 반응을 남긴 부부 계정 수. 보기만 한 사람은 세지 않는다 */
  participantCount: number;
  createdAt: string | null;
  expiresAt: string | null;
  coverTitle: string | null;
  coverAuthor: string | null;
  includeAllAlbums: boolean;
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

/** 한 번에 담을 수 있는 사진 수(서버 CollabPhotoIdsRequest.MAX_BATCH_SIZE = 프로 요금제 최대 사진 수) */
export const COLLAB_PHOTO_BATCH = 10_000;

/**
 * 사진 id 대신 범위로 담기 — 서버가 만드는 순간의 사진을 골라 한 트랜잭션에 담는다(실패하면 공유폴더도 안 생김).
 * 이후 원본 폴더가 바뀌어도 따라가지 않는다. 휴지통 · 업로드 미완료 사진은 빠진다.
 */
export type CollabPhotoScope =
  | { type: "ALL" }
  | { type: "CONCEPT_FOLDERS"; conceptFolderIds: number[] }
  | { type: "DETAIL_FOLDERS"; detailFolderIds: number[] }
  | { type: "SESSIONS"; sessionIds: number[] };

/**
 * 공유폴더 만들기 — 이름만으로 빈 폴더, photoIds(10,000장까지) 또는 scope로 처음 사진을 담는다. 부를 때마다 새 공유폴더.
 * 새 링크는 7일. 보관된 갤러리는 못 만든다. 201 + 세션 본문.
 */
export function createCollabSession(
  galleryId: number,
  body: {
    name: string;
    photoIds?: number[];
    scope?: CollabPhotoScope;
    coverTitle?: string | null;
    coverAuthor?: string | null;
    includeAllAlbums?: boolean | null;
  },
): Promise<CollabSessionResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions`, { method: "POST", body });
}

/** 사진을 직접 담는 공유폴더 — 갤러리 최대 사진 수까지 요청 한 번에 담는다 */
export function openManualCollabSession(
  galleryId: number,
  body: { name: string; coverTitle?: string | null; coverAuthor?: string | null },
  photoIds: number[],
): Promise<CollabSessionResponse> {
  return createCollabSession(galleryId, { ...body, photoIds: [...new Set(photoIds)] });
}

export type CollabParticipantResponse = {
  participantId: number;
  nickname: string;
  /** GUEST: 닉네임을 적고 들어온 하객, USER: 반응을 남긴 부부 계정 */
  participantType: "GUEST" | "USER";
  /** 하객은 들어온 시각, 부부 계정은 처음 반응한 시각 */
  enteredAt: string | null;
};

/** 공유폴더에 들어온 사람(들어온 순). 토큰을 잃고 다시 들어온 하객은 한 번 더 나온다 */
export function listCollabParticipants(galleryId: number, sessionId: number): Promise<CollabParticipantResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}/participants`);
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

/** 부부가 읽는 사진별 하객 댓글(최신순으로 옴) */
export function listSessionPhotoComments(galleryId: number, sessionId: number, photoId: number, page = 0, size = 50): Promise<CollabCommentPageResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}/photos/${photoId}/comments?page=${page}&size=${size}`);
}
export async function listAllSessionPhotoComments(galleryId: number, sessionId: number, photoId: number): Promise<CollabCommentResponse[]> {
  const out: CollabCommentResponse[] = [];
  for (let page = 0; page < 20; page++) {
    const res = await listSessionPhotoComments(galleryId, sessionId, photoId, page, 50);
    out.push(...res.contents);
    if (!res.hasNext) break;
  }
  return out;
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
