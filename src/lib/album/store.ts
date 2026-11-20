/**
 * 앨범 저장소(이슈 168) — 앨범은 서버, 닫은 배너는 이 브라우저
 * 위치: src/lib/album/store.ts
 *
 * 화면은 AlbumDoc(앨범 + 버전 + 상태)으로 열고 AlbumRepository로 저장한다. 서버 문서에는 화면 상태(고른 프레임 · 보는 펼침면)가
 * 없어서, 열 때마다 첫 펼침면 · 첫 빈 프레임부터다. 저장은 마지막으로 받은 버전을 같이 보내고, 다른 곳에서 먼저 저장했으면 거절된다.
 * 닫은 배너(보정 상태 · 선택에서 빠진 사진)는 사람마다 다른 화면 설정이라 이 브라우저에 둔다(`sel.album.{galleryId}.ui`).
 * 사이드바 "앨범" 행 · 하단 버튼은 갤러리 응답(hasAlbum · albumStatus)으로 있는지를 알고, 넣은 장수 · 펼침면 수만 useAlbumInfo로 읽는다.
 */

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { ALBUM_NOT_FOUND, getAlbum, saveAlbum, type AlbumResponse, type AlbumStatus } from "@/lib/api/album";
import { fromLayout, toLayout, type Album } from "./model";

/** 머리줄 저장 표시 — 자동 · 임시 저장, 열었을 때는 서버가 마지막으로 저장한 시각 */
export type SavedKind = "auto" | "manual" | "server";

/** 화면이 여는 앨범 */
export type AlbumDoc = {
  album: Album;
  /** 다음 저장 · 보내기에 보낼 버전 */
  revision: number;
  status: AlbumStatus;
  /** 서버가 마지막으로 저장한 시각 */
  savedAt: string | null;
};

export const docOf = (res: AlbumResponse): AlbumDoc => ({ album: fromLayout(res.album), revision: res.revision, status: res.status, savedAt: res.updatedAt });

/** 앨범 읽기 — 없으면(클라이언트는 아직 안 보냈으면) null */
export async function loadAlbumDoc(galleryId: number): Promise<AlbumDoc | null> {
  try {
    return docOf(await getAlbum(galleryId));
  } catch (err) {
    if (err instanceof ApiError && err.code === ALBUM_NOT_FOUND) return null;
    throw err;
  }
}

export interface AlbumRepository {
  /** 저장 — 새 버전을 돌려준다. 실패하면 던진다(다른 곳에서 먼저 저장했으면 ALBUM_409_1) */
  save(galleryId: number, album: Album, expectedRevision: number, opts?: { keepalive?: boolean }): Promise<{ revision: number; savedAt: string | null }>;
}

/** 스튜디오 앨범 — 처음 만들 때는 버전 0 */
export const serverAlbumRepository: AlbumRepository = {
  async save(galleryId, album, expectedRevision, opts) {
    const res = await saveAlbum(galleryId, expectedRevision, toLayout(album), opts);
    return { revision: res.revision, savedAt: res.updatedAt };
  },
};

/** 닫은 배너의 상태 키 — 상태가 바뀌면(키가 다르면) 다시 뜬다 */
export type BannerState = { retouch: string | null; gone: string | null };

const uiKeyOf = (galleryId: number) => `sel.album.${galleryId}.ui`;

export function loadBanner(galleryId: number): BannerState {
  try {
    const raw = JSON.parse(window.localStorage.getItem(uiKeyOf(galleryId)) ?? "null") as { banner?: Partial<BannerState> } | null;
    return { retouch: raw?.banner?.retouch ?? null, gone: raw?.banner?.gone ?? null };
  } catch {
    return { retouch: null, gone: null };
  }
}

export function saveBanner(galleryId: number, banner: BannerState) {
  try {
    window.localStorage.setItem(uiKeyOf(galleryId), JSON.stringify({ banner }));
  } catch {
    // 막힌 브라우저 — 다음에 열면 배너가 다시 뜰 뿐
  }
}

export type AlbumInfo = { placed: number; spreads: number };

/** 사이드바 행용 — 넣은 장수 · 펼침면 수. enabled일 때(앨범이 있을 때)만 읽고, 못 읽으면 null */
export function useAlbumInfo(galleryId: number, enabled: boolean): AlbumInfo | null {
  const [info, setInfo] = useState<{ galleryId: number; value: AlbumInfo } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getAlbum(galleryId);
        if (!cancelled) setInfo({ galleryId, value: { placed: Object.keys(res.album.assign).length, spreads: res.album.spreads.length } });
      } catch {
        // 행은 숫자 없이 둔다
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, enabled]);
  return enabled && info?.galleryId === galleryId ? info.value : null;
}
