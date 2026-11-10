"use client";

/**
 * 앨범 편집 상태(이슈 168) — 앨범 · 되돌리기 · 스낵바 · 옮기기 확인 · 저장 · 닫은 배너
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumEditor.ts
 *
 * 클라이언트 선택과는 렌더할 때마다 맞춘다(syncSelection) — 선택에서 빠진 사진은 저절로 비고 "선택에서 빠짐"이 된다.
 * 되돌리기로 옛 앨범이 돌아와도 다시 맞춰지므로 빠진 사진이 되살아나지 않는다. 맞춘 결과는 바꾼 것으로 보고 저장된다.
 * 저장(안 A) — 같은 곳에 저장한다. 자동 저장은 30초마다 · 화면을 나가거나 가릴 때(바꾼 게 있을 때만), 임시 저장은 누르는 순간.
 * 저장 시각 · 종류는 머리줄이, 저장할 게 남았는지는 "임시 저장" 버튼의 점이 보여 준다.
 *
 * 사진을 누르면: 아직 안 넣은 사진은 다음 배치 위치(또는 고른 프레임)에 넣는다 — 고른 프레임에 사진이 있으면 확인 없이 바꾸고
 * 되돌리기 스낵바. 이미 다른 프레임에 넣은 사진이면 옮길지 묻는다(원래 자리는 비고, 맞바꾸지 않는다).
 * 넣기 · 바꾸기 · 옮기기 · 빼기는 되돌리기 대상(최근 50번, 저장하지 않음). 프레임 고르기 · 펼침면 이동은 대상이 아니다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSelection,
  frameLabel,
  goSpread,
  indexFrames,
  movePhoto,
  photoFrame,
  placePhoto,
  removePhoto,
  sameContent,
  selectFrame,
  syncSelection,
  type Album,
} from "@/lib/album/model";
import type { AlbumDoc, AlbumRepository, SavedKind } from "@/lib/album/store";

const UNDO_MAX = 50;
const AUTOSAVE_MS = 30_000;

export type AlbumSnack = { id: number; text: string; undoable: boolean };
export type MoveAsk = { photoId: number; from: string; to: string };

export function useAlbumEditor(galleryId: number, initialDoc: AlbumDoc, selectedIds: ReadonlySet<number>, repo: AlbumRepository) {
  const [stored, setAlbum] = useState(initialDoc.album);
  const [undoStack, setUndoStack] = useState<Album[]>([]);
  const [snack, setSnack] = useState<AlbumSnack | null>(null);
  const [moveAsk, setMoveAsk] = useState<MoveAsk | null>(null);
  const F = useMemo(() => indexFrames(stored.spreads), [stored.spreads]);
  /** 화면 · 편집 · 저장이 쓰는 앨범 — 클라이언트 선택과 맞춘 것 */
  const album = useMemo(() => syncSelection(stored, F, selectedIds).album, [stored, F, selectedIds]);

  // ── 저장 ──
  const [saved, setSaved] = useState<{ album: Album; at: string; kind: SavedKind }>({ album: initialDoc.album, at: initialDoc.savedAt, kind: initialDoc.savedKind });
  const [banner, setBanner] = useState(initialDoc.banner);
  /** 닫은 배너의 최신 값 — 두 배너를 연달아 닫아도 앞의 것을 덮지 않게 */
  const bannerRef = useRef(initialDoc.banner);
  const [saveError, setSaveError] = useState(false);
  const dirty = !sameContent(album, saved.album);

  function persist(kind: SavedKind, nextBanner = bannerRef.current): boolean {
    const at = new Date().toISOString();
    try {
      repo.save(galleryId, { v: 1, album, createdAt: initialDoc.createdAt, savedAt: at, savedKind: kind, banner: nextBanner });
      setSaved({ album, at, kind });
      setSaveError(false);
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  }
  function saveNow() {
    toast(persist("manual") ? "임시 저장했어요" : "저장하지 못했어요 · 잠시 뒤 다시 눌러 주세요", false);
  }
  /** 배너 닫기 — 그 상태 키를 기억(상태가 바뀌면 다시 뜬다) */
  function dismissBanner(kind: "retouch" | "gone", key: string) {
    const next = { ...bannerRef.current, [kind]: key };
    bannerRef.current = next;
    setBanner(next);
    persist(saved.kind, next);
  }

  // 자동 저장 — 30초마다 · 화면을 가리거나 나갈 때(바꾼 게 있을 때만)
  const latest = useRef({ dirty, persist });
  useEffect(() => {
    latest.current = { dirty, persist };
  });
  useEffect(() => {
    const flush = () => {
      if (latest.current.dirty) latest.current.persist("auto");
    };
    const timer = window.setInterval(flush, AUTOSAVE_MS);
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  function toast(text: string, undoable: boolean) {
    setSnack(text ? { id: Date.now(), text, undoable } : null);
  }
  /** 되돌리기 대상인 바꿈 */
  function commit(next: Album, text: string) {
    setUndoStack((s) => [...s, album].slice(-UNDO_MAX));
    setAlbum(next);
    toast(text, true);
  }

  function go(spread: number) {
    setAlbum(goSpread(album, F, spread));
  }

  function onPhoto(photoId: number) {
    const where = photoFrame(album)[photoId];
    const cur = album.cursor;
    if (where !== undefined) {
      if (cur && cur !== where) {
        setMoveAsk({ photoId, from: where, to: cur });
        return;
      }
      if (album.cursorMode === "manual" && cur === where) {
        setAlbum(clearSelection(album, F));
        return;
      }
      toast(`${frameLabel(F.byId[where], album.spread)} 프레임에 넣은 사진이에요 · 옮기려면 프레임을 먼저 고르세요`, false);
      return;
    }
    const r = placePhoto(album, F, photoId);
    if (!r) {
      toast("빈 프레임이 없어요 · 바꿀 프레임을 먼저 고르세요", false);
      return;
    }
    if (r.navTo === undefined) {
      commit(r.album, r.toast);
      return;
    }
    // 펼침면을 다 채웠으면 잠깐 보여 준 뒤 다음 펼침면으로
    const to = r.navTo;
    commit(r.album, "");
    window.setTimeout(() => {
      setAlbum((a) => goSpread(a, indexFrames(a.spreads), to));
      toast(r.toast, true);
    }, 380);
  }

  function confirmMove() {
    if (!moveAsk) return;
    const r = movePhoto(album, F, moveAsk.photoId, moveAsk.from, moveAsk.to);
    setMoveAsk(null);
    commit(r.album, r.toast);
  }

  function onFrame(frameId: string) {
    setAlbum(selectFrame(album, F, frameId));
  }
  function clearPick() {
    setAlbum(clearSelection(album, F));
  }

  /** 고른 프레임의 사진 빼기 */
  function removePicked() {
    if (album.cursorMode !== "manual" || !album.cursor) return;
    const r = removePhoto(album, F, album.cursor);
    if (r) commit(r.album, r.toast);
  }

  function undo() {
    const prev = undoStack[undoStack.length - 1];
    if (!prev) return;
    setUndoStack((s) => s.slice(0, -1));
    setAlbum(prev);
    setSnack(null);
  }

  const picked = album.cursorMode === "manual" && album.cursor ? album.cursor : null;

  return {
    album,
    F,
    go,
    onPhoto,
    onFrame,
    clearPick,
    removePicked,
    picked,
    canRemove: picked !== null && album.assign[picked] !== undefined,
    undo,
    canUndo: undoStack.length > 0,
    snack,
    hideSnack: () => setSnack(null),
    moveAsk,
    confirmMove,
    cancelMove: () => setMoveAsk(null),
    dirty,
    saved,
    saveError,
    saveNow,
    banner,
    dismissBanner,
  };
}
