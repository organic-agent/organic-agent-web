"use client";

/**
 * 앨범 편집 상태(이슈 168) — 앨범 · 되돌리기 · 스낵바 · 옮기기 확인
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumEditor.ts
 *
 * 사진을 누르면: 아직 안 넣은 사진은 다음 배치 위치(또는 고른 프레임)에 넣는다 — 고른 프레임에 사진이 있으면 확인 없이 바꾸고
 * 되돌리기 스낵바. 이미 다른 프레임에 넣은 사진이면 옮길지 묻는다(원래 자리는 비고, 맞바꾸지 않는다).
 * 넣기 · 바꾸기 · 옮기기 · 빼기는 되돌리기 대상(최근 50번, 저장하지 않음). 프레임 고르기 · 펼침면 이동은 대상이 아니다.
 */

import { useMemo, useState } from "react";
import {
  clearSelection,
  frameLabel,
  goSpread,
  indexFrames,
  movePhoto,
  photoFrame,
  placePhoto,
  removePhoto,
  selectFrame,
  type Album,
} from "@/lib/album/model";
import type { AlbumDoc } from "@/lib/album/store";

const UNDO_MAX = 50;

export type AlbumSnack = { id: number; text: string; undoable: boolean };
export type MoveAsk = { photoId: number; from: string; to: string };

export function useAlbumEditor(initialDoc: AlbumDoc) {
  const [album, setAlbum] = useState(initialDoc.album);
  const [undoStack, setUndoStack] = useState<Album[]>([]);
  const [snack, setSnack] = useState<AlbumSnack | null>(null);
  const [moveAsk, setMoveAsk] = useState<MoveAsk | null>(null);
  const F = useMemo(() => indexFrames(album.spreads), [album.spreads]);

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
    setAlbum((a) => goSpread(a, indexFrames(a.spreads), spread));
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
  };
}
