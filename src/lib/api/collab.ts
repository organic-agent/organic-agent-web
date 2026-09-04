import { api } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";

const GUEST_TOKEN_HEADER = "X-Guest-Token";

export type CollabLandingResponse = {
  galleryTitle: string;
  photoCount: number;
  writable: boolean;
};

export type CollabSessionResponse = {
  sessionId: number;
  galleryId: number;
  conceptFolderId: number;
  name: string;
  collabUrl: string;
  revoked: boolean;
  revokedAt: string | null;
  photoCount: number;
  createdAt: string | null;
};

export function listCollabSessions(galleryId: number): Promise<CollabSessionResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions`);
}

export function openCollabSession(
  galleryId: number,
  conceptFolderId: number,
  name: string,
): Promise<CollabSessionResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions`, {
    method: "POST",
    body: { conceptFolderId, name },
  });
}

export function revokeCollabSession(galleryId: number, sessionId: number): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export function republishCollabSession(
  galleryId: number,
  sessionId: number,
): Promise<CollabSessionResponse> {
  return api(`/api/v1/galleries/${galleryId}/collab-sessions/${sessionId}/republish`, {
    method: "POST",
  });
}

export type CollabParticipantResponse = {
  guestToken: string;
  nickname: string;
  participantId: number;
  participantType: "USER" | "GUEST";
  userId: number | null;
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

export type CollabCommentResponse = {
  commentId: number;
  nickname: string;
  content: string;
  createdAt: string | null;
  mine: boolean;
};

export type PageResponse<T> = {
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
  contents: T[];
};

function guestHeaders(guestToken?: string | null): Record<string, string> | undefined {
  return guestToken ? { [GUEST_TOKEN_HEADER]: guestToken } : undefined;
}

export function getCollabLanding(token: string): Promise<CollabLandingResponse> {
  return api(`/api/v1/collab/${encodeURIComponent(token)}`, { auth: false });
}

export function enterCollab(token: string, nickname: string): Promise<CollabParticipantResponse> {
  return api(`/api/v1/collab/${encodeURIComponent(token)}/guests`, {
    method: "POST",
    body: { nickname },
    auth: false,
  });
}

export function listCollabPhotos(
  token: string,
  guestToken?: string | null,
  page = 0,
  size = 100,
): Promise<CollabPhotoPageResponse> {
  return api(`/api/v1/collab/${encodeURIComponent(token)}/photos?page=${page}&size=${size}`, {
    headers: guestHeaders(guestToken),
  });
}

export function listCollabComments(
  token: string,
  photoId: number,
  guestToken?: string | null,
): Promise<PageResponse<CollabCommentResponse>> {
  return api(`/api/v1/collab/${encodeURIComponent(token)}/photos/${photoId}/comments`, {
    headers: guestHeaders(guestToken),
  });
}

export function writeCollabComment(
  token: string,
  photoId: number,
  content: string,
  guestToken?: string | null,
): Promise<CollabCommentResponse> {
  return api(`/api/v1/collab/${encodeURIComponent(token)}/photos/${photoId}/comments`, {
    method: "POST",
    body: { content },
    headers: guestHeaders(guestToken),
  });
}

export function deleteCollabComment(
  token: string,
  commentId: number,
  guestToken?: string | null,
): Promise<void> {
  return api(`/api/v1/collab/${encodeURIComponent(token)}/comments/${commentId}`, {
    method: "DELETE",
    headers: guestHeaders(guestToken),
  });
}

export function setCollabLike(
  token: string,
  photoId: number,
  liked: boolean,
  guestToken?: string | null,
): Promise<void> {
  return api(`/api/v1/collab/${encodeURIComponent(token)}/photos/${photoId}/like`, {
    method: liked ? "PUT" : "DELETE",
    headers: guestHeaders(guestToken),
  });
}
