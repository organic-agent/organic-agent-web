"use client";

/**
 * 회차 보내기 확인 — 항목 전부에 결과가 있을 때만. 보낸 뒤 이 회차 결과는 바꿀 수 없다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/SendRoundModal.tsx
 *
 * POST rounds/{n}/send → 회차 COMPLETED · 갤러리 DELIVERY · 클라이언트에게 "보정 결과가 준비되었습니다" 알림.
 * 클라이언트는 확인 뒤 남은 횟수 안에서 다시 요청하거나 보정을 확정(보관)한다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { type RetouchOverviewResponse, sendRetouchRound } from "@/lib/api/retouch";

export function SendRoundModal({
  galleryId,
  roundNo,
  photoCount,
  remainingAfter,
  onClose,
  onSent,
}: {
  galleryId: number;
  roundNo: number;
  photoCount: number;
  /** 보낸 뒤 클라이언트에게 남는 횟수 — null이면 제한 없음 */
  remainingAfter: number | null;
  onClose: () => void;
  onSent: (overview: RetouchOverviewResponse) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onSent(await sendRetouchRound(galleryId, roundNo));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }
  return (
    <GalleryModalShell
      title={`${roundNo}차 보정 결과를 보낼까요?`}
      desc={
        <>
          <b className="text-contents-light-bgd-default">{photoCount}장</b> 모두 결과가 있어요. 보낸 뒤에는 이 회차의 결과를 바꿀 수 없어요.
          <br />
          클라이언트가 확인한 뒤 {remainingAfter === null ? "다시 요청하거나" : remainingAfter > 0 ? `다시 요청(남은 횟수 ${remainingAfter})하거나` : "더 요청할 수 없고"} 보정을 확정해요.
        </>
      }
      maxWidthClassName="max-w-110"
      onClose={onClose}
    >
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void send()} confirmLabel={busy ? "보내는 중…" : "보내기"} disabled={busy} />
    </GalleryModalShell>
  );
}
