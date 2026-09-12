"use client";

/**
 * 선택 앨범 동기화 — 화면은 바로 바뀌고 서버는 잠깐 뒤에 한 번(WES-312)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useSelectionSync.ts
 *
 * 타일을 누르면 local(고른 id)이 즉시 바뀌고 300ms 뒤 서버 스냅샷과의 차이만 보낸다(담기 · 빼기 각 한 번).
 * 더블클릭(= 클릭 두 번)은 차이가 없어 서버 호출이 없다. 서버는 통째 거절(한도 초과 400 · 이미 담김 409)이라
 * 실패하면 스냅샷을 다시 읽어 화면을 서버에 맞추고 문구를 남긴다. 한도는 보내기 전에 화면에서 먼저 막는다.
 * 함께 고르는 사람의 변경은 15초마다 · 탭이 다시 보일 때 읽는다(보내는 중이면 스냅샷만 갱신).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { deselectPhotos, getPhotoSelection, type PhotoSelectionResponse, selectPhotos } from "@/lib/api/selection";

const FLUSH_MS = 300;
const POLL_MS = 15_000;

const idsOf = (s: PhotoSelectionResponse | null) => new Set(s?.photos.map((p) => p.photo.photoId) ?? []);

export function useSelectionSync(galleryId: number, editable: boolean, maxSelectable: number | null) {
  const [server, setServer] = useState<PhotoSelectionResponse | null>(null);
  const [local, setLocal] = useState<Set<number> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const localRef = useRef<Set<number> | null>(null);
  const serverRef = useRef<PhotoSelectionResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);
  const dirtyRef = useRef(false);
  // 타이머가 늘 최신 flush를 부르도록 — 자기 참조 useCallback은 React Compiler가 메모를 못 지킨다
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const apply = useCallback((next: PhotoSelectionResponse, resetLocal: boolean) => {
    serverRef.current = next;
    setServer(next);
    if (resetLocal || localRef.current === null) {
      const ids = idsOf(next);
      localRef.current = ids;
      setLocal(ids);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await getPhotoSelection(galleryId);
      // 보내는 중이거나 보낼 것이 남았으면 화면은 그대로 — 스냅샷만 갱신
      apply(next, !dirtyRef.current && !flushingRef.current);
    } catch {
      // 다음 주기에 다시
    }
  }, [galleryId, apply]);

  // 처음 · 주기 · 탭이 다시 보일 때
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function schedule() {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await refresh();
        if (!cancelled) schedule();
      }, POLL_MS);
    }
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    void refresh();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function flush() {
    timerRef.current = null;
    if (flushingRef.current) {
      // 지금 보내는 중 — 끝나면 다시 계산한다
      dirtyRef.current = true;
      return;
    }
    const wanted = localRef.current;
    const snapshot = serverRef.current;
    if (!wanted || !snapshot) return;
    const have = idsOf(snapshot);
    const adds = [...wanted].filter((id) => !have.has(id));
    const removes = [...have].filter((id) => !wanted.has(id));
    dirtyRef.current = false;
    if (adds.length === 0 && removes.length === 0) return;
    flushingRef.current = true;
    setBusy(true);
    try {
      let latest = snapshot;
      if (removes.length > 0) latest = await deselectPhotos(galleryId, removes);
      if (adds.length > 0) latest = await selectPhotos(galleryId, adds);
      serverRef.current = latest;
      setServer(latest);
      if (!dirtyRef.current) {
        // 보내는 동안 바뀐 게 없으면 서버 답이 화면
        const ids = idsOf(latest);
        localRef.current = ids;
        setLocal(ids);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "함께 고르는 사람이 먼저 골랐어요 · 최신 상태로 맞췄어요"
            : err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요";
      setNotice(message);
      dirtyRef.current = false;
      try {
        apply(await getPhotoSelection(galleryId), true);
      } catch {
        // 서버 스냅샷으로 되돌린다
        if (serverRef.current) apply(serverRef.current, true);
      }
    } finally {
      flushingRef.current = false;
      setBusy(false);
      if (dirtyRef.current && timerRef.current === null) timerRef.current = setTimeout(() => void flushRef.current(), FLUSH_MS);
    }
  }
  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function scheduleFlush() {
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushRef.current(), FLUSH_MS);
  }

  /** 한 장 담기 · 빼기 — 화면 즉시, 서버는 잠깐 뒤 */
  function toggle(photoId: number) {
    if (!editable || !localRef.current) return;
    const next = new Set(localRef.current);
    if (next.has(photoId)) next.delete(photoId);
    else {
      if (maxSelectable !== null && next.size >= maxSelectable) {
        setNotice(`${maxSelectable}장까지 고를 수 있어요 · 더 고르려면 "선택 장수 추가 요청"`);
        return;
      }
      next.add(photoId);
    }
    localRef.current = next;
    setLocal(next);
    setNotice(null);
    scheduleFlush();
  }

  /** 여러 장 담기(AI 추천 모두 선택) — 한도까지만 */
  function pickMany(photoIds: number[]) {
    if (!editable || !localRef.current) return;
    const next = new Set(localRef.current);
    for (const id of photoIds) {
      if (next.has(id)) continue;
      if (maxSelectable !== null && next.size >= maxSelectable) {
        setNotice(`${maxSelectable}장까지 고를 수 있어요 · 한도까지만 담았어요`);
        break;
      }
      next.add(id);
    }
    localRef.current = next;
    setLocal(next);
    scheduleFlush();
  }

  const pickedIds = useMemo<ReadonlySet<number>>(() => local ?? idsOf(server), [local, server]);

  return { selection: server, pickedIds, toggle, pickMany, refresh, notice, clearNotice: () => setNotice(null), busy };
}
