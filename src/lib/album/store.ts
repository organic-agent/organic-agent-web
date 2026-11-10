/**
 * 앨범 저장소(이슈 168) — 1단계는 브라우저 저장, 서버 계약이 생기면 구현만 바꾼다
 * 위치: src/lib/album/store.ts
 *
 * 화면은 AlbumRepository만 안다. 지금 구현은 localStorage(`sel.album.{galleryId}`) 하나 — 같은 브라우저 안에서만 남는다.
 * 사이드바 "앨범" 행 · 단계 칩은 useAlbumSummary로 "있는지 · 몇 장 넣었는지"만 읽는다(다른 탭의 변경도 storage 이벤트로 따라간다).
 */

import { useSyncExternalStore } from "react";
import type { Album } from "./model";

export type SavedKind = "auto" | "manual";

/** 저장 단위 — 앨범 + 마지막 저장 시각 · 닫은 배너 */
export type AlbumDoc = {
  v: 1;
  album: Album;
  createdAt: string;
  savedAt: string;
  savedKind: SavedKind;
  /** 닫은 배너의 상태 키 — 상태가 바뀌면(키가 다르면) 다시 뜬다 */
  banner: { retouch: string | null; gone: string | null };
};

export interface AlbumRepository {
  load(galleryId: number): AlbumDoc | null;
  /** 실패하면 던진다(저장 공간 부족 · 막힌 브라우저) */
  save(galleryId: number, doc: AlbumDoc): void;
}

const keyOf = (galleryId: number) => `sel.album.${galleryId}`;
const CHANGE = "sel-album-change";

function parse(raw: string | null): AlbumDoc | null {
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw) as AlbumDoc;
    return doc && doc.v === 1 && doc.album && Array.isArray(doc.album.spreads) ? doc : null;
  } catch {
    return null;
  }
}

function readRaw(galleryId: number): string | null {
  try {
    return window.localStorage.getItem(keyOf(galleryId));
  } catch {
    return null;
  }
}

export const localAlbumRepository: AlbumRepository = {
  load(galleryId) {
    return parse(readRaw(galleryId));
  },
  save(galleryId, doc) {
    window.localStorage.setItem(keyOf(galleryId), JSON.stringify(doc));
    window.dispatchEvent(new CustomEvent(CHANGE, { detail: galleryId }));
  },
};

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

export type AlbumSummary = { exists: boolean; placed: number };

const NONE: AlbumSummary = { exists: false, placed: 0 };
const summaryCache = new Map<string, AlbumSummary>();

/** 사이드바 행 · 단계 칩용 — 앨범이 있는지와 넣은 장수 */
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
  const summary = doc ? { exists: true, placed: Object.keys(doc.album.assign).length } : NONE;
  summaryCache.clear();
  summaryCache.set(raw, summary);
  return summary;
}
