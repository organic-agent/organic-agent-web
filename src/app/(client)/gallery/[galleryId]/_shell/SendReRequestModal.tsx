"use client";

/**
 * 다시 요청 보내기 확인 — 적은 사진 · 점 수 · 남은 횟수 안내 → rounds/{n}/requests
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/SendReRequestModal.tsx
 *
 * 보내면 계약 횟수 한 번을 쓰고 작가에게 알림이 간다. 보낸 뒤에는 이 회차 요청을 고칠 수 없다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { type RetouchOverviewResponse, type RetouchRequestItem, submitRoundRequests } from "@/lib/api/retouch";

export function SendReRequestModal({
  galleryId,
  roundNo,
  requests,
  pickedCount,
  remaining,
  onClose,
  onSent,
}: {
  galleryId: number;
  /** 새로 만들 회차 번호 */
  roundNo: number;
  requests: RetouchRequestItem[];
  /** 보낼 사진 수 — 보정 요청 탭에 적은 사진(이슈 125부터 담기 상태가 없어 requests와 같다) */
  pickedCount: number;
  /** 보내기 전 남은 횟수 — null이면 제한 없음 */
  remaining: number | null;
  onClose: () => void;
  onSent: (overview: RetouchOverviewResponse) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const points = requests.reduce((n, r) => n + r.points.length, 0);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onSent(await submitRoundRequests(galleryId, roundNo, requests));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell
      title={`${roundNo}차 보정을 요청할까요?`}
      desc={
        <>
          보내면 보정 횟수 한 번을 써요{remaining !== null ? ` (남은 ${remaining}회 → ${Math.max(0, remaining - 1)}회)` : ""}. 보낸 뒤에는 이 회차의 요청을 고칠 수 없어요.
        </>
      }
      maxWidthClassName="max-w-110"
      onClose={onClose}
    >
      <dl className="mb-5 flex flex-col type-content-s">
        <Row label="다시 요청할 사진" value={`${pickedCount}장`} />
        <Row label="점" value={points > 0 ? `${points}개` : "없음"} />
      </dl>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void send()} confirmLabel={busy ? "보내는 중…" : `${roundNo}차 요청 보내기`} disabled={busy || pickedCount === 0} />
    </GalleryModalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-divider-default py-2 last:border-b">
      <dt className="shrink-0 text-contents-light-bgd-weakness">{label}</dt>
      <dd className="text-right font-medium text-contents-light-bgd-default">{value}</dd>
    </div>
  );
}
