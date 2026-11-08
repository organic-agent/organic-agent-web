"use client";

/**
 * 선택 앨범 동기화 — 화면은 바로 바뀌고 서버는 잠깐 뒤에 한 번(WES-312)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useSelectionSync.ts
 *
 * 타일을 누르면 local(고른 id)이 즉시 바뀌고 300ms 뒤 서버 스냅샷과의 차이만 보낸다(담기 · 빼기 각 한 번).
 * 더블클릭(= 클릭 두 번)은 차이가 없어 서버 호출이 없다. 서버는 통째 거절(한도 초과 400 · 이미 담김 409)이라
 * 실패하면 스냅샷을 다시 읽어 화면을 서버에 맞추고 문구를 남긴다. 한도는 보내기 전에 화면에서 먼저 막는다.
 * 서버가 거절한 오류는 onRejected로도 넘긴다 — 화면이 오류 코드(선택 마감 지남 등)를 보고 잠글 수 있게.
 *
 * 함께 고르는 사람의 변경(이슈 148, 서버 #351):
 * - live가 켜지면(개인 갤러리 · 멤버 2명) 3초마다 변경 번호(selection-sync)만 읽고, 번호가 바뀐 쪽 목록만 다시 읽는다 —
 *   선택은 스냅샷 GET, 별점은 전체 목록 GET(onRatings로 화면에 넘긴다). 처음 · 탭 복귀 때는 번호를 먼저 읽고 목록을 읽은 뒤,
 *   목록 적용에 성공했을 때만 그 번호를 기준값으로 둔다(목록 뒤에 읽은 번호를 기준으로 삼으면 그 사이 변경을 놓친다).
 *   요청은 겹치지 않게 직렬이고, 갤러리를 떠난 뒤 온 늦은 응답은 버린다. 실패하면 기준값을 그대로 두고 다음 주기에 다시.
 * - 상대가 바꾼 선택은 partnerChange로 알린다(담은 · 뺀 id) — 화면이 타일을 잠깐 강조하고 장수가 바뀌면 스낵바를 띄운다.
 * - 휴지통(제외, 이슈 160)은 exclusionRevision이 바뀌면 onExclusions로 알리기만 한다 — 사진 · 폴더는 페이지가, 휴지통 목록은 셀렉 화면이 다시 읽는다.
 * - live가 꺼져 있으면(스튜디오 초대 · 혼자) 전처럼 15초마다 · 탭이 다시 보일 때 스냅샷만 읽는다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api/client";
import { listGalleryRatings, type PhotoRatingResponse } from "@/lib/api/ratings";
import { deselectPhotos, getPhotoSelection, getSelectionSync, type PhotoSelectionResponse, selectPhotos, type SelectionSyncResponse } from "@/lib/api/selection";

const FLUSH_MS = 300;
const POLL_MS = 15_000;
/** 변경 번호 조회 주기 — 서버가 정한 값(Swagger) */
const LIVE_MS = 3_000;

const idsOf = (s: PhotoSelectionResponse | null) => new Set(s?.photos.map((p) => p.photo.photoId) ?? []);

export type PartnerChange = {
  /** 상대가 담은 사진 */
  added: number[];
  /** 상대가 뺀 사진 */
  removed: number[];
  /** 알림마다 다른 값 — 같은 내용이 이어져도 효과가 다시 돌게 */
  nonce: number;
};

export function useSelectionSync(
  galleryId: number,
  editable: boolean,
  maxSelectable: number | null,
  onRejected?: (err: unknown) => void,
  /** 개인 갤러리 — 장수를 다 채웠을 때 "추가 요청" 대신 설정에서 늘리라고 안내 */
  personal = false,
  live?: {
    /** 3초 변경 번호 조회를 돌릴지 — 개인 갤러리 · 멤버 2명 */
    enabled: boolean;
    /** 내 사용자 id — 상대가 바꾼 것만 가려낸다 */
    meId: number | null;
    /** 별점 전체 목록이 왔을 때 — 화면이 사진 목록의 점수 · 매긴 사람 · 시각을 통째로 바꾼다 */
    onRatings: (list: PhotoRatingResponse[]) => void;
    /** 휴지통 변경 번호(exclusionRevision)가 바뀌었을 때(이슈 160) — 화면이 사진 · 폴더 · 공유 · 휴지통 목록을 다시 읽는다. 처음 들어올 때는 부르지 않는다 */
    onExclusions?: () => void;
  },
) {
  const [server, setServer] = useState<PhotoSelectionResponse | null>(null);
  const [local, setLocal] = useState<Set<number> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [partnerChange, setPartnerChange] = useState<PartnerChange | null>(null);
  const localRef = useRef<Set<number> | null>(null);
  const serverRef = useRef<PhotoSelectionResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);
  const dirtyRef = useRef(false);
  // 타이머가 늘 최신 flush를 부르도록 — 자기 참조 useCallback은 React Compiler가 메모를 못 지킨다
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const liveEnabled = live?.enabled ?? false;
  const meId = live?.meId ?? null;
  const onRatingsRef = useRef(live?.onRatings);
  const onExclusionsRef = useRef(live?.onExclusions);
  useEffect(() => {
    onRatingsRef.current = live?.onRatings;
    onExclusionsRef.current = live?.onExclusions;
  });

  /** 새 스냅샷에서 상대가 바꾼 것 — 내가 담은(addedByUserId가 나) 항목과 지금 보내는 중인 것은 뺀다 */
  const noticePartner = useCallback(
    (prev: PhotoSelectionResponse | null, next: PhotoSelectionResponse) => {
      if (!liveEnabled || !prev) return;
      const before = idsOf(prev);
      const after = idsOf(next);
      const pending = localRef.current;
      const added = next.photos.filter((p) => !before.has(p.photo.photoId) && p.addedByUserId !== null && p.addedByUserId !== meId).map((p) => p.photo.photoId);
      const removed = [...before].filter((id) => !after.has(id) && (pending === null || pending.has(id)));
      if (added.length === 0 && removed.length === 0) return;
      setPartnerChange({ added, removed, nonce: Date.now() });
    },
    [liveEnabled, meId],
  );

  const apply = useCallback(
    (next: PhotoSelectionResponse, resetLocal: boolean) => {
      noticePartner(serverRef.current, next);
      serverRef.current = next;
      setServer(next);
      if (resetLocal || localRef.current === null) {
        const ids = idsOf(next);
        localRef.current = ids;
        setLocal(ids);
      }
    },
    [noticePartner],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await getPhotoSelection(galleryId);
      // 보내는 중이거나 보낼 것이 남았으면 화면은 그대로 — 스냅샷만 갱신
      apply(next, !dirtyRef.current && !flushingRef.current);
    } catch {
      // 다음 주기에 다시
    }
  }, [galleryId, apply]);

  // ── 15초 폴링(live 아님): 처음 · 주기 · 탭이 다시 보일 때 ──
  useEffect(() => {
    if (liveEnabled) return;
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
  }, [refresh, liveEnabled]);

  // ── 3초 변경 번호(live): 번호가 다를 때만 그 목록을 읽는다 ──
  useEffect(() => {
    if (!liveEnabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let running = false;
    /** 목록 적용에 성공한 번호 — null이면 아직 처음(둘 다 읽는다) */
    let known: SelectionSyncResponse | null = null;
    async function tick() {
      if (running || cancelled) return;
      running = true;
      try {
        const rev = await getSelectionSync(galleryId);
        if (cancelled) return;
        const needSelection = known === null || known.selectionRevision !== rev.selectionRevision;
        const needRatings = known === null || known.ratingRevision !== rev.ratingRevision;
        if (needSelection) {
          const next = await getPhotoSelection(galleryId);
          if (cancelled) return;
          apply(next, !dirtyRef.current && !flushingRef.current);
        }
        if (needRatings) {
          const list = await listGalleryRatings(galleryId);
          if (cancelled) return;
          onRatingsRef.current?.(list);
        }
        // 휴지통(제외)은 목록을 여기서 읽지 않고 화면에 알리기만 — 사진 · 폴더는 페이지가, 휴지통 목록은 셀렉 화면이 다시 읽는다
        if (known !== null && known.exclusionRevision !== rev.exclusionRevision) onExclusionsRef.current?.();
        known = rev;
      } catch {
        // 기준값은 그대로 — 다음 주기에 다시
      } finally {
        running = false;
      }
    }
    function schedule() {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await tick();
        if (!cancelled) schedule();
      }, LIVE_MS);
    }
    function onVisible() {
      if (document.visibilityState === "visible") void tick();
    }
    void tick();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [galleryId, liveEnabled, apply]);

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
      if (removes.length > 0) track("photo_deselected", { gallery_id: galleryId, count: removes.length });
      if (adds.length > 0) track("photo_selected", { gallery_id: galleryId, count: adds.length });
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
      onRejected?.(err);
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
        setNotice(personal ? `${maxSelectable}장까지 선택할 수 있어요 · 더 선택하려면 갤러리 설정에서 선택 장수를 늘려 주세요` : `${maxSelectable}장까지 고를 수 있어요 · 더 고르려면 "선택 장수 추가 요청"`);
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
  /** 사진 → 마지막에 담은 사람(서버 스냅샷 기준). 내가 방금 담아 아직 안 보낸 사진은 없다 */
  const addedByOf = useMemo(() => new Map(server?.photos.map((p) => [p.photo.photoId, p.addedByUserId] as const) ?? []), [server]);

  return { selection: server, pickedIds, addedByOf, toggle, pickMany, refresh, notice, clearNotice: () => setNotice(null), busy, partnerChange };
}
