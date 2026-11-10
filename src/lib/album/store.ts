/**
 * 앨범 저장소(이슈 168) — 1단계는 브라우저 저장, 서버 계약이 생기면 구현만 바꾼다
 * 위치: src/lib/album/store.ts
 *
 * 화면은 AlbumRepository만 안다. 지금 구현은 localStorage — 같은 브라우저 안에서만 남는다.
 * - 스튜디오 앨범 `sel.album.{galleryId}` — 클라이언트에게 보내면 그때 앨범을 share에 함께 둔다(보기만 · 수정 가능)
 * - 클라이언트 사본 `sel.album.{galleryId}.client` — 수정 가능으로 받았을 때 고치는 앨범. basedOn = 받은 앨범의 보낸 시각
 * 서버가 생기면 보내기 · 받기 · 돌려보내기가 서버 몫이 되고 이 파일은 그 API로 바뀐다(PR ③ — 화면만).
 * 사이드바 "앨범" 행 · 단계 칩은 useAlbumSummary로 "있는지 · 몇 장 넣었는지 · 보냈는지"만 읽는다(다른 탭의 변경도 storage 이벤트로 따라간다).
 */

import { useSyncExternalStore } from "react";
import { normalizeAlbum, type Album } from "./model";

export type SavedKind = "auto" | "manual";

/** 클라이언트에게 보낸 방식 — 보기만 / 수정 가능(사진 교체 · 위치 조정) */
export type AlbumShareMode = "view" | "edit";
/** 보낸 앨범 — 보낸 시각과 그때의 앨범(보낸 뒤 스튜디오가 더 고쳐도 클라이언트는 이 앨범을 받는다) */
export type AlbumShare = { mode: AlbumShareMode; sentAt: string; album: Album };

/** 저장 단위 — 앨범 + 마지막 저장 시각 · 닫은 배너 */
export type AlbumDoc = {
  v: 1;
  album: Album;
  createdAt: string;
  savedAt: string;
  savedKind: SavedKind;
  /** 닫은 배너의 상태 키 — 상태가 바뀌면(키가 다르면) 다시 뜬다 */
  banner: { retouch: string | null; gone: string | null };
  /** 스튜디오 앨범 — 클라이언트에게 보낸 것 */
  share?: AlbumShare | null;
  /** 클라이언트 사본 — 어느 보내기에서 시작했는지(보낸 시각). 스튜디오가 다시 보내면 새로 시작한다 */
  basedOn?: string | null;
};

/** 새 앨범 저장 단위 */
export function newAlbumDoc(album: Album): AlbumDoc {
  const now = new Date().toISOString();
  return { v: 1, album, createdAt: now, savedAt: now, savedKind: "auto", banner: { retouch: null, gone: null } };
}

export interface AlbumRepository {
  load(galleryId: number): AlbumDoc | null;
  /** 실패하면 던진다(저장 공간 부족 · 막힌 브라우저) */
  save(galleryId: number, doc: AlbumDoc): void;
}

const keyOf = (galleryId: number) => `sel.album.${galleryId}`;
const clientKeyOf = (galleryId: number) => `sel.album.${galleryId}.client`;
const CHANGE = "sel-album-change";

function parse(raw: string | null): AlbumDoc | null {
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw) as AlbumDoc;
    if (!doc || doc.v !== 1 || !doc.album || !Array.isArray(doc.album.spreads)) return null;
    // PR ① 저장본(사이즈 · 펼침면 id · 안내선 · 위치 없음)도 연다
    const share = doc.share && doc.share.album && Array.isArray(doc.share.album.spreads) ? { ...doc.share, album: normalizeAlbum(doc.share.album) } : null;
    return { ...doc, album: normalizeAlbum(doc.album), share };
  } catch {
    return null;
  }
}

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
const readRaw = (galleryId: number) => readKey(keyOf(galleryId));

function localRepository(keyFor: (galleryId: number) => string): AlbumRepository {
  return {
    load(galleryId) {
      return parse(readKey(keyFor(galleryId)));
    },
    save(galleryId, doc) {
      window.localStorage.setItem(keyFor(galleryId), JSON.stringify(doc));
      window.dispatchEvent(new CustomEvent(CHANGE, { detail: galleryId }));
    },
  };
}

/** 스튜디오 앨범 */
export const localAlbumRepository = localRepository(keyOf);
/** 클라이언트 사본(수정 가능으로 받았을 때) */
export const clientAlbumRepository = localRepository(clientKeyOf);
/** 저장하지 않는다 — 보기만으로 받은 클라이언트 */
export const readOnlyAlbumRepository: AlbumRepository = { load: () => null, save: () => {} };

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

export type AlbumSummary = {
  exists: boolean;
  placed: number;
  /** 클라이언트에게 보낸 방식(안 보냈으면 null) · 보낸 앨범의 펼침면 수 */
  shared: AlbumShareMode | null;
  sharedSpreads: number;
};

const NONE: AlbumSummary = { exists: false, placed: 0, shared: null, sharedSpreads: 0 };
const summaryCache = new Map<string, AlbumSummary>();

/** 사이드바 행 · 단계 칩용 — 앨범이 있는지 · 넣은 장수 · 보냈는지(클라이언트 화면도 같은 브라우저 저장을 읽는다, 서버 전 화면만) */
export function useAlbumSummary(galleryId: number): AlbumSummary {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(galleryId) ?? "",
    () => "",
  );
  if (!raw) return NONE;
  const cached = summaryCache.get(raw);
  if (cached) return cached;
  const doc = parse(raw);
  const summary = doc
    ? { exists: true, placed: Object.keys(doc.album.assign).length, shared: doc.share?.mode ?? null, sharedSpreads: doc.share?.album.spreads.length ?? 0 }
    : NONE;
  summaryCache.clear();
  summaryCache.set(raw, summary);
  return summary;
}
