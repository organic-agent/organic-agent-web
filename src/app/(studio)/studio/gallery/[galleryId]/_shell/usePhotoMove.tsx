"use client";

/**
 * 사진 끌어 옮기기 — 그리드에서 집어 폴더 열에 놓기 (2026-09-14 확정)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/usePhotoMove.tsx
 *
 * 작가 1단계 · 부부 컨셉 분류 · 개인 업로드가 같은 부품(PhotoGrid · FolderColumn)을 써서 훅 하나로 셋 다 붙는다.
 * 타일을 누른 채 6px 넘게 끌면 시작 — 고른 타일이면 고른 전부, 아니면 그 한 장(안 움직이면 그냥 클릭).
 * 놓을 수 있는 곳은 세부 폴더 · 미분류(FolderColumn의 data-drop)뿐이고, 접힌 컨셉 위에 머물면 폴더 열이 펼친다.
 * 놓으면 moveCategoryPhotos → 폴더 재조회 → 선택 해제, 그리고 "n장 옮겼어요 · 실행 취소"(반대 방향 move 한 번).
 * 끌고 있는 동안 폴더 열 가장자리에서는 저절로 스크롤된다.
 *
 * 쓰는 법: const move = usePhotoMove({...}) →
 *   <PhotoGrid drag={move.drag} … /> · <FolderColumn dropping={move.dropping} dropOver={move.dropOver} … /> · {move.overlay}
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { moveCategoryPhotos } from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";
import type { FolderDropTarget } from "./FolderColumn";
import type { PhotoDragBinding } from "./PhotoGrid";

/** 이만큼 움직여야 끌기다(PhotoGrid의 칠하기와 같은 값) */
const DRAG_THRESHOLD = 6;
/** 한 번에 옮기는 최대 장수(서버 배치) */
const MOVE_BATCH = 500;
/** 폴더 열 가장자리 이 안에 들어오면 저절로 스크롤 */
const EDGE = 56;
const EDGE_STEP = 10;

type Pending = { pointerId: number; x: number; y: number; photoId: number };
type Session = { pointerId: number; ids: number[] };
type MoveToast = { text: string; undo: (() => void) | null };

function targetAt(x: number, y: number): FolderDropTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]");
  const raw = el?.dataset.drop;
  if (!raw) return null;
  if (raw === "unsorted") return { kind: "unsorted" };
  const [kind, rest] = raw.split(":");
  const id = Number(rest);
  if (!Number.isFinite(id)) return null;
  if (kind === "detail") return { kind: "detail", id };
  if (kind === "concept") return { kind: "concept", id };
  return null;
}

function sameTarget(a: FolderDropTarget | null, b: FolderDropTarget | null) {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind === "unsorted" || b.kind === "unsorted" || a.id === b.id;
}

async function moveInBatches(galleryId: number, photoIds: number[], targetDetailId: number | null) {
  for (let i = 0; i < photoIds.length; i += MOVE_BATCH) {
    await moveCategoryPhotos(galleryId, photoIds.slice(i, i + MOVE_BATCH), targetDetailId);
  }
}

export function usePhotoMove({
  galleryId,
  enabled,
  photos,
  selectedIds,
  clearSelection,
  folderOf,
  onMoved,
}: {
  galleryId: number;
  /** 사진을 옮길 수 있는 화면인가(컨셉 분류 · 폴더 확정 전) */
  enabled: boolean;
  /** 지금 보이는 사진 — 고스트 썸네일용 */
  photos: PhotoResponse[];
  selectedIds: ReadonlySet<number>;
  clearSelection: () => void;
  /** 이 사진이 지금 들어 있는 세부 폴더(없으면 미분류) — 실행 취소가 쓴다 */
  folderOf: (photoId: number) => number | null;
  /** 옮긴 뒤 폴더 · 사진 다시 불러오기 */
  onMoved: () => Promise<void> | void;
}) {
  const [ids, setIds] = useState<number[] | null>(null);
  const [over, setOver] = useState<FolderDropTarget | null>(null);
  const [toast, setToast] = useState<MoveToast | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const draggedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const ghostRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number>(0);

  const showToast = useCallback((next: MoveToast, ms: number) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const runMove = useCallback(
    async (dragIds: number[], targetDetailId: number | null) => {
      const before = new Map(dragIds.map((id) => [id, folderOf(id)] as const));
      const moving = dragIds.filter((id) => before.get(id) !== targetDetailId);
      if (moving.length === 0) return;
      try {
        await moveInBatches(galleryId, moving, targetDetailId);
        await onMoved();
        clearSelection();
      } catch {
        showToast({ text: "옮기지 못했어요", undo: null }, 2500);
        // 500장씩 나눠 보내다 실패하면 앞 묶음은 이미 옮겨졌을 수 있다 — 화면은 서버 기준으로 맞춘다
        try {
          await onMoved();
        } catch {
          // 다음 갱신 때 다시
        }
        return;
      }
      showToast(
        {
          text: `${moving.length}장 옮겼어요`,
          undo: () => {
            setToast(null);
            const groups = new Map<number | null, number[]>();
            for (const id of moving) {
              const from = before.get(id) ?? null;
              groups.set(from, [...(groups.get(from) ?? []), id]);
            }
            void (async () => {
              try {
                for (const [from, back] of groups) await moveInBatches(galleryId, back, from);
                await onMoved();
              } catch {
                showToast({ text: "되돌리지 못했어요", undo: null }, 2500);
              }
            })();
          },
        },
        6000,
      );
    },
    [galleryId, folderOf, onMoved, clearSelection, showToast],
  );

  // 포인터 리스너는 enabled에만 묶는다(선택 · 폴더가 바뀌어도 진행 중인 끌기가 끊기지 않게) — 최신 값은 여기서 읽는다
  const latestRef = useRef({ selectedIds, runMove });
  useEffect(() => {
    latestRef.current = { selectedIds, runMove };
  });

  useEffect(() => {
    if (!enabled) return;
    function stop() {
      pendingRef.current = null;
      sessionRef.current = null;
      setIds(null);
      setOver(null);
      delete document.documentElement.dataset.dragging;
    }
    function onPointerMove(e: PointerEvent) {
      const pending = pendingRef.current;
      if (pending && e.pointerId === pending.pointerId) {
        // 손을 뗀 걸 놓쳤으면(창 밖에서 뗌) 여기서 끝낸다
        if (e.buttons === 0) {
          pendingRef.current = null;
          return;
        }
        if (Math.abs(e.clientX - pending.x) + Math.abs(e.clientY - pending.y) < DRAG_THRESHOLD) return;
        const { selectedIds: picked } = latestRef.current;
        const dragIds = picked.has(pending.photoId) ? [...picked] : [pending.photoId];
        pendingRef.current = null;
        sessionRef.current = { pointerId: pending.pointerId, ids: dragIds };
        pointerRef.current = { x: e.clientX, y: e.clientY };
        setIds(dragIds);
        // 어디에 올려도 손 모양(globals.css의 html[data-dragging] 규칙)
        document.documentElement.dataset.dragging = "";
      }
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      if (e.buttons === 0) {
        stop();
        return;
      }
      pointerRef.current = { x: e.clientX, y: e.clientY };
      const ghost = ghostRef.current;
      if (ghost) ghost.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY + 14}px, 0)`;
      const found = targetAt(e.clientX, e.clientY);
      setOver((prev) => (sameTarget(prev, found) ? prev : found));
    }
    function onPointerUp(e: PointerEvent) {
      pendingRef.current = null;
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      const target = e.type === "pointerup" ? targetAt(e.clientX, e.clientY) : null;
      draggedRef.current = true;
      stop();
      if (!target || target.kind === "concept") return;
      void latestRef.current.runMove(session.ids, target.kind === "detail" ? target.id : null);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      // 끌 수 없는 화면이 되거나 사라지면 진행 중이던 끌기도 접는다(고스트가 남지 않게)
      stop();
    };
  }, [enabled]);

  // 끌기가 막 시작됐을 때 고스트를 손 옆에 놓는다(다음 pointermove 전까지)
  useEffect(() => {
    const ghost = ghostRef.current;
    if (ids === null || !ghost) return;
    ghost.style.transform = `translate3d(${pointerRef.current.x + 14}px, ${pointerRef.current.y + 14}px, 0)`;
  }, [ids]);

  // 폴더 열 가장자리 자동 스크롤
  useEffect(() => {
    if (ids === null) return;
    let frame = 0;
    function step() {
      const column = document.querySelector<HTMLElement>("[data-folder-scroll]");
      if (column) {
        const box = column.getBoundingClientRect();
        const { x, y } = pointerRef.current;
        if (x >= box.left && x <= box.right) {
          if (y < box.top + EDGE) column.scrollTop -= EDGE_STEP;
          else if (y > box.bottom - EDGE) column.scrollTop += EDGE_STEP;
        }
      }
      frame = window.requestAnimationFrame(step);
    }
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [ids]);

  const start = useCallback((photoId: number, e: { pointerId: number; clientX: number; clientY: number }) => {
    draggedRef.current = false;
    pendingRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, photoId };
  }, []);

  const consumeClick = useCallback(() => {
    const dragged = draggedRef.current;
    draggedRef.current = false;
    return dragged;
  }, []);

  const drag = useMemo<PhotoDragBinding | null>(
    () => (enabled ? { start, consumeClick, movingIds: ids === null ? null : new Set(ids) } : null),
    [enabled, start, consumeClick, ids],
  );

  const ghostPhotos = useMemo(() => {
    if (ids === null) return [];
    const set = new Set(ids);
    return photos.filter((photo) => set.has(photo.photoId) && photo.viewUrl !== null).slice(0, 3);
  }, [ids, photos]);

  const overlay = (
    <>
      {ids !== null && (
        <div ref={ghostRef} aria-hidden className="pointer-events-none fixed top-0 left-0 z-300 will-change-transform">
          <div className="relative size-20">
            {ghostPhotos.length === 0 && (
              <span className="absolute size-20 rounded-(--radius-8) border-2 border-background-default-main bg-surface-default-light shadow-(--shadow-hover)" />
            )}
            {ghostPhotos.map((photo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.photoId}
                src={photo.viewUrl ?? undefined}
                alt=""
                style={{ left: i * 7, top: i * 7, zIndex: i }}
                className="absolute size-20 rounded-(--radius-8) border-2 border-background-default-main object-cover shadow-(--shadow-hover)"
              />
            ))}
            {ids.length > 1 && (
              <span className="absolute -top-1.5 -right-1.5 z-10 grid h-5 min-w-5 place-items-center rounded-(--pill) bg-brand-primary-default px-1.5 type-label-semibold-xs text-contents-dark-bgd-default">
                {ids.length}
              </span>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-200 flex -translate-x-1/2 items-center gap-2 rounded-(--pill) border border-surface-inverse-medium bg-background-inverse-main py-2 pr-2 pl-5 type-label-medium-m text-contents-dark-bgd-default shadow-(--shadow-hover)"
        >
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={toast.undo}
              className="cursor-pointer rounded-(--pill) px-3 py-1.5 type-label-semibold-s transition-colors duration-fast hover:bg-surface-inverse-medium"
            >
              실행 취소
            </button>
          )}
        </div>
      )}
    </>
  );

  return { drag, dropping: ids !== null, dropOver: over, overlay };
}
