"use client";

/**
 * 세부 폴더 합치기 — 폴더 열에서 세부 폴더를 다른 세부 폴더 위에 끌어 놓았을 때 (#97)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/useFolderMerge.tsx
 *
 * 작가 1단계 · 부부 컨셉 분류가 같은 부품(FolderColumn)을 써서 훅 하나로 둘 다 붙는다.
 * 같은 컨셉 안이면 바로 합치고, 다른 컨셉으로 합칠 때만 확인을 띄운다 — 서버가 원본 컨셉에 남긴 하트 · 댓글을 지운다.
 * 합친 뒤 폴더를 다시 읽고, 보고 있던 폴더가 원본이면 대상 폴더로 옮겨 보여 준다. 원본이 지워지므로 실행 취소는 없다.
 *
 * 쓰는 법: const merge = useFolderMerge({...}) →
 *   <FolderColumn onMergeDetail={merge.request} … /> · {merge.overlay}
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Snackbar } from "@/components/app/Snackbar";
import { mergeDetailFolder } from "@/lib/api/conceptFolders";
import type { DetailFolderRef, FolderSelection } from "./FolderColumn";
import { FolderMergeModal } from "./FolderModals";
import { describeUploadError } from "./uploadSupport";

type MergeToast = { kind: "success" | "error"; text: string };

export function useFolderMerge({
  galleryId,
  refreshFolders,
  setSelection,
}: {
  galleryId: number;
  /** 합친 뒤 폴더 다시 불러오기 */
  refreshFolders: () => Promise<void>;
  setSelection: Dispatch<SetStateAction<FolderSelection>>;
}) {
  const [confirm, setConfirm] = useState<{ source: DetailFolderRef; target: DetailFolderRef } | null>(null);
  const [toast, setToast] = useState<MergeToast | null>(null);
  const busyRef = useRef(false);
  const toastTimerRef = useRef<number>(0);

  const showToast = useCallback((next: MergeToast) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  /** 실패하면 던진다 — 확인 모달이 문구를 보인다 */
  const merge = useCallback(
    async (source: DetailFolderRef, target: DetailFolderRef) => {
      await mergeDetailFolder(galleryId, source.concept.id, source.detail.id, target.detail.id);
      await refreshFolders();
      setSelection((prev) =>
        prev.kind === "detail" && prev.detailId === source.detail.id
          ? { kind: "detail", conceptId: target.concept.id, detailId: target.detail.id }
          : prev,
      );
      showToast({ kind: "success", text: `"${source.detail.name}" 폴더를 "${target.detail.name}"에 합쳤어요` });
    },
    [galleryId, refreshFolders, setSelection, showToast],
  );

  const request = useCallback(
    (source: DetailFolderRef, target: DetailFolderRef) => {
      if (source.detail.id === target.detail.id || busyRef.current) return;
      if (source.concept.id !== target.concept.id) {
        setConfirm({ source, target });
        return;
      }
      busyRef.current = true;
      void (async () => {
        try {
          await merge(source, target);
        } catch (err) {
          showToast({ kind: "error", text: describeUploadError(err) });
          // 화면은 서버 기준으로 맞춘다
          await refreshFolders();
        } finally {
          busyRef.current = false;
        }
      })();
    },
    [merge, refreshFolders, showToast],
  );

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
      {toast && (
        <Snackbar kind={toast.kind} className="fixed bottom-24 left-1/2 z-200 -translate-x-1/2">
          {toast.text}
        </Snackbar>
      )}
    </>
  );

  return { request, modalOpen: confirm !== null, overlay };
}
