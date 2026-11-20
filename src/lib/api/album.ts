/**
 * 앨범 API — 스웨거 [Album] 계약의 타입화(이슈 168 · 서버 이슈 397)
 * 위치: src/lib/api/album.ts
 *
 * 갤러리당 앨범 하나를 통째로 읽고 쓴다. 저장 · 보내기는 마지막으로 받은 버전(revision)을 같이 보내고,
 * 그 사이 다른 곳(다른 탭 · 다른 멤버)에서 저장했으면 409(ALBUM_409_1)로 거절된다. 처음 만들 때는 버전 0.
 * 보기만(view)으로 보내면 서버가 그 자리에서 확정하고 갤러리를 완료로 넘긴다 — 웹은 지금 이 방식만 쓴다(클라이언트 수정은 잠금).
 * 클라이언트는 보낸 뒤에만 읽을 수 있고, 그 전에는 404(ALBUM_404_1)다.
 */

import { api } from "@/lib/api/client";
import type { AlbumLayout } from "@/lib/album/model";

/** 없음 · 구성 중 · 보냄(수정 가능) · 돌려받음 · 확정 */
export type AlbumStatus = "NONE" | "DRAFT" | "SENT_EDIT" | "RETURNED" | "CONFIRMED";

export type AlbumResponse = {
  status: AlbumStatus;
  /** 다음 저장 · 보내기에 그대로 보내는 버전 */
  revision: number;
  updatedAt: string | null;
  album: AlbumLayout;
  sentAt: string | null;
  /** view = 보내는 순간 확정됨 */
  shareMode: "view" | "edit" | null;
};

export type AlbumPhotosResponse = {
  /** 보정본 서명 주소의 수명(초) */
  viewUrlTtlSeconds: number;
  /** 선택 앨범 순서. 보낸 보정본이 없으면 resultUrl null */
  photos: { photoId: number; resultUrl: string | null }[];
};

/** 다른 곳에서 먼저 저장해 거절됨 */
export const ALBUM_REVISION_MISMATCH = "ALBUM_409_1";
/** 프레임이 선택 장수보다 많음 — 클라이언트가 선택에서 사진을 뺐을 때 */
export const ALBUM_TOO_MANY_FRAMES = "ALBUM_400_3";
/** 앨범이 없음 · 클라이언트에게 아직 안 보냄 */
export const ALBUM_NOT_FOUND = "ALBUM_404_1";

const base = (galleryId: number) => `/api/v1/galleries/${galleryId}/album`;

export function getAlbum(galleryId: number): Promise<AlbumResponse> {
  return api(base(galleryId));
}

/** 스튜디오 앨범 저장(없으면 만든다 — 버전 0). keepalive는 탭을 닫을 때의 마지막 저장 */
export function saveAlbum(galleryId: number, expectedRevision: number, album: AlbumLayout, opts: { keepalive?: boolean } = {}): Promise<AlbumResponse> {
  return api(base(galleryId), { method: "PUT", body: { expectedRevision, album }, keepalive: opts.keepalive });
}

/** 클라이언트에게 보내고 확정 — 사진을 모두 넣었고 갤러리가 앨범 단계(클라이언트가 보정을 확정한 뒤)일 때만 */
export function sendAlbum(galleryId: number, expectedRevision: number): Promise<AlbumResponse> {
  return api(`${base(galleryId)}/send`, { method: "POST", body: { expectedRevision, mode: "view" } });
}

/** 선택 사진별 최신 보정본 주소(보낸 회차 중 마지막) */
export function getAlbumPhotos(galleryId: number): Promise<AlbumPhotosResponse> {
  return api(`${base(galleryId)}/photos`);
}
