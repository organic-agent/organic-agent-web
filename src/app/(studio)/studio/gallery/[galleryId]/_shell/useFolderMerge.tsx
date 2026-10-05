"use client";

/**
 * 세부 폴더 합치기 — 폴더 열에서 세부 폴더를 다른 세부 폴더 위에 끌어 놓거나, 폴더 메뉴의 "다른 폴더와 합치기"를 골랐을 때 (#97 · #88)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/useFolderMerge.tsx
 *
 * 작가 1단계 · 부부 컨셉 분류가 같은 부품(FolderColumn)을 써서 훅 하나로 둘 다 붙는다.
 * 끌어 놓으면 늘 확인 창을 띄운다(같은 컨셉 안이어도) — 합치기 전에 확인을 받는다(팀 노션 44번). 메뉴로 시작하면
 * 합칠 폴더를 고르는 창이 뜨고, 그 창의 "합치기"가 확인을 겸한다.
 * 합친 뒤 폴더를 다시 읽고, 보고 있던 폴더가 원본이면 대상 폴더로 옮겨 보여 준다. 알림에 "실행 취소"를 둔다 —
 * 서버가 원본 폴더를 지우지 않고 숨겨 두어(3분) 원래 자리 · 원래 폴더 그대로 돌아온다. 그 사이 사진이 다시 옮겨졌으면
 * 서버가 거절하고, 그때는 "되돌리지 못했어요"만 알린다.
 *
 * 쓰는 법: const merge = useFolderMerge({...}) →
 *   <FolderColumn onMergeDetail={merge.request} onPickMerge={merge.pick} … /> · {merge.overlay}
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Snackbar } from "@/components/app/Snackbar";
import { mergeDetailFolder, undoDetailFolderMerge, type ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { DetailFolderRef, FolderSelection } from "./FolderColumn";
import { FolderMergeModal, FolderMergePickModal } from "./FolderModals";

/** "실행 취소"가 떠 있는 시간 — 사진 옮기기의 실행 취소와 같다 */
const UNDO_MS = 6000;
const NOTICE_MS = 2500;
/** 알림에 넣는 폴더 이름의 최대 길이(이름은 100자까지라 길면 줄인다) */
const NAME_MAX = 14;

type MergeToast = { kind: "success" | "error"; text: string; undo: (() => void) | null };

function short(name: string) {
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX)}…` : name;
}

export function useFolderMerge({
  galleryId,
  folders,
  selection,
  refreshFolders,
  setSelection,
}: {
  galleryId: number;
  /** 메뉴로 합칠 때 고를 폴더 목록 */
  folders: ConceptFolderResponse[] | null;
  /** 지금 보고 있는 폴더 — 원본을 보고 있었으면 합친 뒤 대상으로, 되돌리면 다시 원본으로 옮긴다 */
  selection: FolderSelection;
  /** 합친 뒤 폴더 다시 불러오기 */
  refreshFolders: () => Promise<void>;
  setSelection: Dispatch<SetStateAction<FolderSelection>>;
}) {
  const [confirm, setConfirm] = useState<{ source: DetailFolderRef; target: DetailFolderRef } | null>(null);
  const [picking, setPicking] = useState<DetailFolderRef | null>(null);
  const [toast, setToast] = useState<MergeToast | null>(null);
  const toastTimerRef = useRef<number>(0);

  const showToast = useCallback((next: MergeToast, ms: number) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const undo = useCallback(
    async (mergeId: number, source: DetailFolderRef, target: DetailFolderRef, wasViewingSource: boolean) => {
      window.clearTimeout(toastTimerRef.current);
      setToast(null);
      try {
        await undoDetailFolderMerge(galleryId, mergeId);
        await refreshFolders();
        if (wasViewingSource) {
          setSelection((prev) =>
            prev.kind === "detail" && prev.detailId === target.detail.id
              ? { kind: "detail", conceptId: source.concept.id, detailId: source.detail.id }
              : prev,
          );
        }
      } catch {
        showToast({ kind: "error", text: "되돌리지 못했어요", undo: null }, NOTICE_MS);
        // 화면은 서버 기준으로 맞춘다
        try {
          await refreshFolders();
        } catch {
          // 다음 갱신 때 다시
        }
      }
    },
    [galleryId, refreshFolders, setSelection, showToast],
  );

  /** 실패하면 던진다 — 확인 창이 문구를 보인다 */
  const merge = useCallback(
    async (source: DetailFolderRef, target: DetailFolderRef) => {
      const wasViewingSource = selection.kind === "detail" && selection.detailId === source.detail.id;
      let mergeId: number;
      try {
        ({ mergeId } = await mergeDetailFolder(galleryId, source.concept.id, source.detail.id, target.detail.id));
      } catch (err) {
        // 화면이 낡았을 수 있다(이미 없는 폴더 등) — 서버 기준으로 맞춰 두고 문구는 창이 보인다
        void refreshFolders().catch(() => {});
        throw err;
      }
      await refreshFolders();
      if (wasViewingSource) setSelection({ kind: "detail", conceptId: target.concept.id, detailId: target.detail.id });
      showToast(
        {
          kind: "success",
          text: `${short(target.detail.name)}에 합쳤어요`,
          undo: () => void undo(mergeId, source, target, wasViewingSource),
        },
        UNDO_MS,
      );
    },
    [galleryId, selection, refreshFolders, setSelection, showToast, undo],
  );

  /** 세부 폴더를 다른 세부 폴더 위에 끌어 놓았다 — 확인 창을 띄운다 */
  const request = useCallback((source: DetailFolderRef, target: DetailFolderRef) => {
    if (source.detail.id === target.detail.id) return;
    setConfirm({ source, target });
  }, []);

  /** 폴더 메뉴의 "다른 폴더와 합치기" — 합칠 폴더를 고르는 창을 띄운다 */
  const pick = useCallback((source: DetailFolderRef) => setPicking(source), []);

  const overlay = (
    <>
      {confirm && (
        <FolderMergeModal
          source={confirm.source}
          target={confirm.target}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await merge(confirm.source, confirm.target);
            setConfirm(null);
          }}
        />
      )}
      {picking && folders && (
        <FolderMergePickModal
          source={picking}
          folders={folders}
          onClose={() => setPicking(null)}
          onConfirm={async (target) => {
            await merge(picking, target);
            setPicking(null);
          }}
        />
      )}
      {toast && (
        <Snackbar
          kind={toast.kind}
          action={toast.undo ? { label: "실행 취소", onClick: toast.undo } : undefined}
          className="fixed bottom-24 left-1/2 z-200 -translate-x-1/2"
        >
          {toast.text}
        </Snackbar>
      )}
    </>
  );

  return { request, pick, modalOpen: confirm !== null || picking !== null, overlay };
}
