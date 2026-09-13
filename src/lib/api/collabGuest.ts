/**
 * 게스트 링크 API — 스웨거 [Collab Guest] 계약의 타입화 (로그인 없이 링크 하나로)
 * 위치: src/lib/api/collabGuest.ts
 *
 * 경로는 /api/v1/collab/{collabToken}. 첫 화면(랜딩)은 누구나, 반응(좋아요 · 댓글)은 입장해 받은 guestToken을
 * X-Guest-Token 헤더에 실어 "같은 사람"임을 밝힌다. 로그인한 부부 · 작가가 링크를 열면 Authorization으로 식별되므로
 * 토큰이 있으면 같이 싣고, 그 토큰이 죽어 401이 나면 게스트로 다시 한 번 부른다(링크 화면이 로그인 상태에 막히지 않게).
 * 게스트 토큰은 세션(앨범)마다 따로다 — 앨범 여러 개(includeAllAlbums)면 앨범마다 입장해야 반응이 붙는다.
 */

import { api, ApiError } from "@/lib/api/client";
import type { CollabPhotoPageResponse, CollabPhotoResponse } from "@/lib/api/collab";

export const GUEST_TOKEN_HEADER = "X-Guest-Token";

export type CollabLandingAlbum = {
  conceptFolderId: number | null;
  name: string;
  photoCount: number;
  /** 이 앨범(세션)으로 들어가는 토큰 — 사진 · 반응 요청은 이 토큰으로 */
  collabToken: string;
  sessionId: number;
};

/** 링크를 열었을 때 처음 받는 것 — 갤러리 id 같은 안쪽 사정은 오지 않는다 */
export type CollabLandingResponse = {
  galleryTitle: string;
  /** 이 링크(세션)의 사진 수 */
  photoCount: number;
  /** false면 부부가 고르기를 마친 것 — 하트 · 댓글 입력을 감춘다 */
  writable: boolean;
  /** 부부가 정한 표지 제목. 안 정했으면 서버가 세션 이름을 넣어 준다 */
  coverTitle: string | null;
  coverAuthor: string | null;
  expiresAt: string | null;
  /** includeAllAlbums면 이 갤러리의 살아 있는 공유폴더 전부, 아니면 이 세션 하나 */
  albums: CollabLandingAlbum[];
};

export type CollabGuestResponse = {
  /** 이후 요청의 X-Guest-Token — 브라우저에 보관해야 같은 사람으로 이어진다 */
  guestToken: string;
  nickname: string;
  participantId: number;
  participantType: "USER" | "GUEST";
  userId: number | null;
};

export type CollabCommentResponse = {
  commentId: number;
  nickname: string;
  content: string;
  createdAt: string | null;
  /** 지금 이 토큰(또는 로그인 사용자)이 쓴 댓글인지 */
  mine: boolean;
};

export type CollabCommentPageResponse = {
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
  contents: CollabCommentResponse[];
};

/** 만료 · 폐기 · 없음 — 화면 분기용 */
export type GuestLinkProblem = "expired" | "revoked" | "notFound" | "notReady";
export function guestLinkProblemOf(err: unknown): GuestLinkProblem | null {
  if (!(err instanceof ApiError)) return null;
  if (err.code === "COLLAB_410_2") return "expired";
  if (err.code === "COLLAB_410_1") return "revoked";
  if (err.status === 404) return "notFound";
  if (err.status === 410) return "revoked";
  if (err.status === 409 || err.status === 423) return "notReady";
  return null;
}

type GuestOptions = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; guestToken?: string | null };

/** 로그인 토큰이 있으면 같이(부부 · 작가 식별), 그 토큰 때문에 401이면 게스트로만 다시 */
async function guestApi<T>(path: string, options: GuestOptions = {}): Promise<T> {
  const headers = options.guestToken ? { [GUEST_TOKEN_HEADER]: options.guestToken } : undefined;
  try {
    return await api<T>(path, { method: options.method, body: options.body, headers });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return api<T>(path, { method: options.method, body: options.body, headers, auth: false });
    }
    throw err;
  }
}

const base = (token: string) => `/api/v1/collab/${encodeURIComponent(token)}`;

export function getGuestLanding(token: string): Promise<CollabLandingResponse> {
  return guestApi(base(token));
}

/** 이름 등록 — 1~50자, 중복 허용. 받은 guestToken을 보관한다 */
export function enterGuest(token: string, nickname: string): Promise<CollabGuestResponse> {
  return guestApi(`${base(token)}/guests`, { method: "POST", body: { nickname } });
}

/** 이름 바꾸기 — 지난 좋아요 · 댓글의 이름표도 같이 바뀐다 */
export function renameGuest(token: string, guestToken: string, nickname: string): Promise<CollabGuestResponse> {
  return guestApi(`${base(token)}/guests/me`, { method: "PATCH", body: { nickname }, guestToken });
}

export function listGuestPhotos(token: string, guestToken: string | null, page = 0, size = 50): Promise<CollabPhotoPageResponse> {
  return guestApi(`${base(token)}/photos?page=${page}&size=${size}`, { guestToken });
}

/** 이 앨범의 사진 전부(50장씩 끝까지) — liked(내 하트) · likeCount · commentCount 포함 */
export async function listAllGuestPhotos(token: string, guestToken: string | null): Promise<CollabPhotoResponse[]> {
  const out: CollabPhotoResponse[] = [];
  for (let page = 0; page < 100; page++) {
    const res = await listGuestPhotos(token, guestToken, page, 50);
    out.push(...res.contents);
    if (!res.hasNext) break;
  }
  return out;
}

export function likeGuestPhoto(token: string, guestToken: string | null, photoId: number): Promise<void> {
  return guestApi(`${base(token)}/photos/${photoId}/like`, { method: "PUT", guestToken });
}
export function unlikeGuestPhoto(token: string, guestToken: string | null, photoId: number): Promise<void> {
  return guestApi(`${base(token)}/photos/${photoId}/like`, { method: "DELETE", guestToken });
}

export function listGuestComments(token: string, guestToken: string | null, photoId: number, page = 0, size = 50): Promise<CollabCommentPageResponse> {
  return guestApi(`${base(token)}/photos/${photoId}/comments?page=${page}&size=${size}`, { guestToken });
}
/** 1~500자, 수정은 없다 — 지우고 다시 쓴다 */
export function writeGuestComment(token: string, guestToken: string | null, photoId: number, content: string): Promise<CollabCommentResponse> {
  return guestApi(`${base(token)}/photos/${photoId}/comments`, { method: "POST", body: { content }, guestToken });
}
export function deleteGuestComment(token: string, guestToken: string | null, commentId: number): Promise<void> {
  return guestApi(`${base(token)}/comments/${commentId}`, { method: "DELETE", guestToken });
}
