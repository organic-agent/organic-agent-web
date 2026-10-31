"use client";

/**
 * 요청서 내보내기 취소 확인 모달(개인 갤러리) — 보정 확인 → 셀렉 단계로 되돌린다 (이슈 132)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/CancelExportModal.tsx
 *
 * 보정본을 한 장도 올리지 않았을 때만 연다(서버도 SELECTION_409_8로 막는다). 되돌리면 다시 고르고 폴더를 정리할 수 있고,
 * 보정 요청 메모는 그대로 남아 다시 마치면 같은 1차 요청서로 실린다. 이미 내려받은 요청서 파일은 지워지지 않는다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { cancelSelectionExport } from "@/lib/api/selection";

export function CancelExportModal({
  galleryId,
  onClose,
  onCanceled,
}: {
  galleryId: number;
  onClose: () => void;
  onCanceled: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await cancelSelectionExport(galleryId);
      onCanceled();
    } catch (err) {
      if (err instanceof ApiError && err.code === "SELECTION_409_8") setError("보정본을 올리기 시작해서 되돌릴 수 없어요");
      else if (err instanceof ApiError && err.code === "SELECTION_409_7") setError("이미 선택 단계로 돌아갔어요 · 화면을 새로 고쳐 주세요");
      else setError(err instanceof ApiError ? err.message : "되돌리지 못했어요 · 네트워크 연결을 확인한 뒤 다시 시도해 주세요");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell
      title="선택을 다시 할까요?"
      desc={
        <>
          <b className="text-contents-light-bgd-default">셀렉 단계로 돌아가 사진을 다시 고르고 폴더를 정리할 수 있어요</b> · 적어 둔 보정 작성 내용은 그대로 남아요.
          다 고르면 선택을 다시 마치고 요청서를 새로 내려받아 주세요
        </>
      }
      maxWidthClassName="max-w-120"
      onClose={onClose}
    >
      <p className="mb-4 rounded-(--radius-8) bg-function-warning-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
        이미 내려받은 요청서는 바뀌지 않아요. 보정 업체에 보냈다면 새 요청서를 다시 보내 주세요.
      </p>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void run()}
        confirmLabel={busy ? "되돌리는 중…" : "다시 하기"}
        disabled={busy}
      />
    </GalleryModalShell>
  );
}
