"use client";

/**
 * 보정 확정 확인 — 더 요청하지 않고 끝내기 → retouch/confirm → 갤러리 보관(ARCHIVED)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ConfirmRetouchModal.tsx
 *
 * 최신 회차를 작가가 보낸 뒤에만 할 수 있다. 남은 횟수는 쓰지 않는다. 보정본은 확정 뒤에도 내려받을 수 있다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { confirmRetouch } from "@/lib/api/retouch";

export function ConfirmRetouchModal({
  galleryId,
  photoCount,
  roundCount,
  remaining,
  onClose,
  onConfirmed,
}: {
  galleryId: number;
  photoCount: number;
  roundCount: number;
  remaining: number | null;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmRetouch(galleryId);
      onConfirmed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }
  return (
    <GalleryModalShell
      title="보정을 확정할까요?"
      desc={
        <>
          확정하면 <b className="text-contents-light-bgd-default">더 요청할 수 없고</b> 갤러리가 보관돼요.
          {remaining !== null && remaining > 0 && ` 남은 횟수 ${remaining}회는 쓰지 않아요.`} 보정본은 확정 뒤에도 언제든 내려받을 수 있어요.
        </>
      }
      maxWidthClassName="max-w-110"
      onClose={onClose}
    >
      <dl className="mb-5 flex flex-col type-content-s">
        <div className="flex justify-between gap-3 border-t border-divider-default py-2">
          <dt className="text-contents-light-bgd-weakness">최종 보정본</dt>
          <dd className="font-medium text-contents-light-bgd-default">{photoCount}장 · {roundCount}회 보정</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-b border-divider-default py-2">
          <dt className="text-contents-light-bgd-weakness">확정 뒤</dt>
          <dd className="font-medium text-contents-light-bgd-default">열람 · 내려받기만</dd>
        </div>
      </dl>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void confirm()} confirmLabel={busy ? "확정하는 중…" : "확정"} disabled={busy} />
    </GalleryModalShell>
  );
}
