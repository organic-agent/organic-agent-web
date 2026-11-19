"use client";

/**
 * 앨범 편집 상태(이슈 168) — 앨범 · 되돌리기 · 스낵바 · 옮기기 확인 · 저장 · 닫은 배너
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumEditor.ts
 *
 * 클라이언트 선택과는 렌더할 때마다 맞춘다(syncSelection) — 선택에서 빠진 사진은 저절로 비고 "선택에서 빠짐"이 된다.
 * 되돌리기로 옛 앨범이 돌아와도 다시 맞춰지므로 빠진 사진이 되살아나지 않는다. 맞춘 결과는 바꾼 것으로 보고 저장된다.
 * 저장(안 A) — 서버에 저장한다. 자동 저장은 30초마다 · 화면을 나가거나 가릴 때(바꾼 게 있을 때만), 임시 저장은 누르는 순간.
 * 저장은 한 번에 하나씩, 앞 저장이 받은 버전으로 다음 저장을 보낸다. 다른 곳(다른 탭 · 다른 멤버)에서 먼저 저장해 거절되면
 * 저장을 멈추고 "최신 앨범으로 바꾸기"를 기다린다(이슈 168 결정 5 — 누르면 서버 앨범으로 바뀌고 이 화면의 저장 안 된 변경은 버린다).
 * 저장 시각 · 종류는 머리줄이, 저장할 게 남았는지는 "임시 저장" 버튼의 점이 보여 준다.
 *
 * 사진을 누르면: 아직 안 넣은 사진은 다음 배치 위치(또는 고른 프레임)에 넣는다 — 고른 프레임에 사진이 있으면 확인 없이 바꾸고
 * 되돌리기 스낵바. 이미 다른 프레임에 넣은 사진이면 옮길지 묻는다(원래 자리는 비고, 맞바꾸지 않는다).
 * 넣기 · 바꾸기 · 옮기기 · 빼기는 되돌리기 대상(최근 50번, 저장하지 않음). 프레임 고르기 · 펼침면 이동은 대상이 아니다.
 * PR ② — 프레임 그리기 · 옮기기 · 크기 · 지우기도 되돌리기 대상. 프레임은 클라이언트가 선택한 사진 수(cap)까지만 그린다.
 * 보내고 확정(PR ④) — 남은 변경을 먼저 저장한 뒤 보낸다. 서버가 그 자리에서 확정해, 그 뒤로는 스튜디오도 보기만 한다(status CONFIRMED).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { SnackbarKind } from "@/components/app/Snackbar";
import { ALBUM_REVISION_MISMATCH, ALBUM_TOO_MANY_FRAMES, getAlbum, sendAlbum } from "@/lib/api/album";
import { ApiError } from "@/lib/api/client";
import {
  addFrame,
  addGuide,
  addSpread,
  clearSelection,
  deleteFrame,
  deleteSpread,
  frameLabel,
  goSpread,
  indexFrames,
  moveGuide,
  movePhoto,
  moveSpread,
  photoFrame,
  placePhoto,
  removeGuide,
  removePhoto,
  resizeFrameMm,
  sameContent,
  selectFrame,
  setCrop,
  setFrameRect,
  syncSelection,
  type Album,
  type Crop,
  type Guide,
  type Rect,
} from "@/lib/album/model";
import { docOf, loadBanner, saveBanner, type AlbumDoc, type AlbumRepository, type BannerState, type SavedKind } from "@/lib/album/store";

const UNDO_MAX = 50;
const AUTOSAVE_MS = 30_000;

export type AlbumSnack = { id: number; text: string; undoable: boolean; kind: SnackbarKind };
export type MoveAsk = { photoId: number; from: string; to: string };

/** repo가 없으면 저장하지 않는다(보기만) */
export function useAlbumEditor(galleryId: number, initialDoc: AlbumDoc, selectedIds: ReadonlySet<number>, repo: AlbumRepository | null) {
  const [stored, setAlbum] = useState(initialDoc.album);
  const [undoStack, setUndoStack] = useState<Album[]>([]);
  const [snack, setSnack] = useState<AlbumSnack | null>(null);
  const [moveAsk, setMoveAsk] = useState<MoveAsk | null>(null);
  const F = useMemo(() => indexFrames(stored.spreads), [stored.spreads]);
  /** 화면 · 편집 · 저장이 쓰는 앨범 — 클라이언트 선택과 맞춘 것 */
  const album = useMemo(() => syncSelection(stored, F, selectedIds).album, [stored, F, selectedIds]);

  // ── 저장(서버) ──
  const [saved, setSaved] = useState<{ album: Album; at: string | null; kind: SavedKind }>({ album: initialDoc.album, at: initialDoc.savedAt, kind: "server" });
  const savedRef = useRef(saved);
  const revisionRef = useRef(initialDoc.revision);
  const [status, setStatus] = useState(initialDoc.status);
  /** 보내고 확정한 뒤에는 저장하지 않는다(서버도 받지 않는다) */
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  });
  const [banner, setBanner] = useState<BannerState>(() => loadBanner(galleryId));
  /** 닫은 배너의 최신 값 — 두 배너를 연달아 닫아도 앞의 것을 덮지 않게 */
  const bannerRef = useRef(banner);
  /** 저장 실패 — frames: 클라이언트가 선택에서 빼서 프레임이 선택 장수보다 많음(서버가 받지 않는다) */
  const [saveError, setSaveError] = useState<"generic" | "frames" | null>(null);
  /** 다른 곳에서 먼저 저장해 거절됨 — 최신 앨범으로 바꿀 때까지 저장을 멈춘다 */
  const [conflict, setConflict] = useState(false);
  const conflictRef = useRef(false);
  const dirty = !sameContent(album, saved.album);
  const albumRef = useRef(album);
  useEffect(() => {
    albumRef.current = album;
  });
  /** 저장은 한 번에 하나씩 — 앞 저장이 받은 버전으로 다음 저장을 보낸다 */
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));

  function markConflict() {
    conflictRef.current = true;
    setConflict(true);
  }
  /** 지금 앨범을 저장 — 바꾼 게 없으면 저장한 것으로 본다 */
  function persist(kind: Exclude<SavedKind, "server">, opts?: { keepalive?: boolean }): Promise<boolean> {
    const run = async () => {
      const snapshot = albumRef.current;
      if (!repo || conflictRef.current || statusRef.current === "CONFIRMED") return false;
      if (sameContent(snapshot, savedRef.current.album)) return true;
      try {
        const r = await repo.save(galleryId, snapshot, revisionRef.current, opts);
        revisionRef.current = r.revision;
        savedRef.current = { album: snapshot, at: r.savedAt ?? new Date().toISOString(), kind };
        setSaved(savedRef.current);
        setSaveError(null);
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.code === ALBUM_REVISION_MISMATCH) markConflict();
        else setSaveError(err instanceof ApiError && err.code === ALBUM_TOO_MANY_FRAMES ? "frames" : "generic");
        return false;
      }
    };
    const next = queue.current.then(run, run);
    queue.current = next;
    return next;
  }
  function saveNow() {
    void persist("manual").then((ok) => {
      if (ok) toast("임시 저장했어요", false);
      else if (!conflictRef.current) toast("저장하지 못했어요 · 잠시 뒤 다시 눌러 주세요", false, "error");
    });
  }
  /** 최신 앨범으로 바꾸기 — 서버에 마지막으로 저장된 앨범으로(이 화면에서 저장 안 된 변경은 버린다) */
  async function reloadLatest() {
    try {
      const doc = docOf(await getAlbum(galleryId));
      const next = goSpread(doc.album, indexFrames(doc.album.spreads), Math.min(albumRef.current.spread, doc.album.spreads.length - 1));
      revisionRef.current = doc.revision;
      savedRef.current = { album: next, at: doc.savedAt, kind: "server" };
      setSaved(savedRef.current);
      setStatus(doc.status);
      setAlbum(next);
      setUndoStack([]);
      conflictRef.current = false;
      setConflict(false);
      setSaveError(null);
      toast("최신 앨범으로 바꿨어요", false);
    } catch {
      toast("앨범을 불러오지 못했어요 · 잠시 뒤 다시 눌러 주세요", false, "error");
    }
  }
  /** 보내고 확정 — 남은 변경을 먼저 저장하고 보낸다. 보낸 뒤에는 고칠 수 없다 */
  async function send(): Promise<boolean> {
    if (!(await persist("manual"))) {
      if (!conflictRef.current) toast("보내지 못했어요 · 잠시 뒤 다시 눌러 주세요", false, "error");
      return false;
    }
    try {
      const res = await sendAlbum(galleryId, revisionRef.current);
      revisionRef.current = res.revision;
      statusRef.current = res.status;
      setStatus(res.status);
      toast("앨범을 보내고 확정했어요", false, "success");
      return true;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === ALBUM_REVISION_MISMATCH) markConflict();
      else if (code === "ALBUM_409_2") toast("클라이언트가 보정을 확정하면 보낼 수 있어요", false, "warning");
      else if (code === "ALBUM_409_3") toast("선택한 사진을 모두 넣어야 보낼 수 있어요", false, "warning");
      else toast("보내지 못했어요 · 잠시 뒤 다시 눌러 주세요", false, "error");
      return false;
    }
  }
  /** 배너 닫기 — 그 상태 키를 이 브라우저에 기억(상태가 바뀌면 다시 뜬다) */
  function dismissBanner(kind: "retouch" | "gone", key: string) {
    const next = { ...bannerRef.current, [kind]: key };
    bannerRef.current = next;
    setBanner(next);
    saveBanner(galleryId, next);
  }

  // 자동 저장 — 30초마다 · 화면을 가리거나 나갈 때(바꾼 게 있을 때만). 가리거나 닫을 때는 탭이 닫혀도 끝까지 보낸다
  const latest = useRef({ dirty, persist });
  useEffect(() => {
    latest.current = { dirty, persist };
  });
  useEffect(() => {
    const flush = (keepalive = false) => {
      if (latest.current.dirty) void latest.current.persist("auto", { keepalive });
    };
    const timer = window.setInterval(() => flush(), AUTOSAVE_MS);
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      flush();
    };
  }, []);

  function toast(text: string, undoable: boolean, kind: SnackbarKind = "info") {
    setSnack(text ? { id: Date.now(), text, undoable, kind } : null);
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

  // ── 프레임(PR ②) ──
  const cap = selectedIds.size;
  const atCap = F.list.length >= cap;
  function capHit() {
    toast(`선택한 사진이 ${cap}장이라 프레임을 더 그릴 수 없어요`, false, "warning");
  }
  /** 그린 프레임 더하기 — 상한이면 알리고 false */
  function drawFrame(rect: Rect): boolean {
    const r = addFrame(album, F, rect, cap);
    if (!r) {
      capHit();
      return false;
    }
    commit(r.album, r.toast);
    return true;
  }
  /** 끌어서 옮기거나 크기를 바꾼 프레임 — 스낵바 없이 되돌리기만 */
  function placeFrame(frameId: string, rect: Rect) {
    const next = setFrameRect(album, frameId, rect);
    if (next !== album) commit(next, "");
  }
  function resizeFrame(frameId: string, dim: "w" | "h", mm: number, lockRatio: boolean) {
    const next = resizeFrameMm(album, F, frameId, dim, mm, lockRatio);
    if (next !== album) commit(next, "");
  }
  function removeFrame(frameId: string) {
    const r = deleteFrame(album, F, frameId);
    if (r) commit(r.album, r.toast);
  }
  /** 프레임 고르기(이미 골랐으면 그대로) — 끌기를 시작할 때 */
  function pickFrame(frameId: string) {
    if (album.cursor === frameId && album.cursorMode === "manual") return;
    setAlbum(selectFrame({ ...album, cursorMode: "auto" }, F, frameId));
  }

  // ── 안내선(PR ②) — 더하기 · 옮기기는 조용히, 지우기는 되돌리기 스낵바 ──
  function putGuide(dir: Guide["dir"], pos: number, all: boolean) {
    commit(addGuide(album, dir, pos, all), "");
  }
  function shiftGuide(guideId: string, pos: number) {
    commit(moveGuide(album, guideId, pos), "");
  }
  function dropGuide(guideId: string) {
    commit(removeGuide(album, guideId), "안내선을 지웠어요");
  }

  // ── 위치 조정(PR ②) — 끝낼 때 한 번 저장 ──
  function setFrameCrop(frameId: string, c: Crop) {
    const next = setCrop(album, frameId, c);
    if (next !== album && F.byId[frameId]) commit(next, `${frameLabel(F.byId[frameId], album.spread)} 프레임 사진 위치를 바꿨어요`);
  }

  // ── 펼침면 관리(PR ②) ──
  function appendSpread() {
    const r = addSpread(album);
    commit(r.album, r.toast);
  }
  function removeSpread(index: number) {
    const r = deleteSpread(album, index);
    if (r) commit(r.album, r.toast);
  }
  function reorderSpread(from: number, before: number) {
    const r = moveSpread(album, from, before);
    if (r) commit(r.album, r.toast);
  }
  /** 펼침면에 넣은 사진 수 — 지우기 전에 물을지 */
  const photosIn = (index: number) => F.of(index).filter((f) => album.assign[f.id] !== undefined).length;

  const picked = album.cursorMode === "manual" && album.cursor ? album.cursor : null;

  return {
    album,
    F,
    go,
    onPhoto,
    onFrame,
    pickFrame,
    clearPick,
    cap,
    atCap,
    capHit,
    drawFrame,
    placeFrame,
    resizeFrame,
    removeFrame,
    setFrameCrop,
    appendSpread,
    removeSpread,
    reorderSpread,
    photosIn,
    putGuide,
    shiftGuide,
    dropGuide,
    toast,
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
    status,
    send,
    saved,
    saveError,
    saveNow,
    conflict,
    reloadLatest,
    banner,
    dismissBanner,
  };
}
