"use client";

/**
 * 계약 보정 횟수 바꾸기 — 남은 횟수가 0인데 더 필요할 때(장수 바꾸기와 같은 문법)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ChangeRoundsModal.tsx
 *
 * PATCH max-retouch-round-count. 이미 쓴 횟수보다 적게는 못 줄인다(서버 검사). 비우면 제한 없음.
 * 추가 비용 같은 계약 조건은 스튜디오와 클라이언트가 따로 정한다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import type { GalleryResponse } from "@/lib/api/galleries";
import { changeMaxRetouchRoundCount } from "@/lib/api/retouch";

export function ChangeRoundsModal({
  gallery,
  usedRounds,
  onClose,
  onDone,
}: {
  gallery: GalleryResponse;
  /** 제출된(요청 · 완료) 회차 수 */
  usedRounds: number;
  onClose: () => void;
  onDone: (gallery: GalleryResponse) => void;
}) {
  const [unlimited, setUnlimited] = useState(gallery.maxRetouchRoundCount === null);
  const [count, setCount] = useState(gallery.maxRetouchRoundCount ?? Math.max(usedRounds + 1, 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = unlimited || (Number.isInteger(count) && count >= Math.max(usedRounds, 1) && count <= 20);

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await changeMaxRetouchRoundCount(gallery.id, unlimited ? null : count));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell
      title="보정 횟수를 바꿀까요?"
      desc={
        <>
          계약한 보정 횟수를 늘리거나 줄여요. 지금 <b className="text-contents-light-bgd-default">{gallery.maxRetouchRoundCount ?? "제한 없음"}</b>
          {gallery.maxRetouchRoundCount !== null && "회"} · 쓴 {usedRounds}회. 추가 비용 같은 조건은 클라이언트와 따로 정해 주세요.
        </>
      }
      maxWidthClassName="max-w-105"
      onClose={onClose}
    >
      <label className="mb-3 flex flex-col gap-1.5">
        <span className="type-label-semibold-s text-contents-light-bgd-default">보정 횟수</span>
        <span className={`flex h-11 items-center gap-2 rounded-(--radius-8) border border-border-default px-3 focus-within:border-contents-light-bgd-sub ${unlimited ? "opacity-50" : ""}`}>
          <input
            type="number"
            min={Math.max(usedRounds, 1)}
            max={20}
            value={count}
            disabled={unlimited}
            onChange={(e) => setCount(Number(e.target.value))}
            className="min-w-0 flex-1 bg-transparent type-content-m text-contents-light-bgd-default tabular-nums focus:outline-none"
          />
          <span className="type-content-s text-contents-light-bgd-weakness">회</span>
        </span>
        {!valid && <span className="type-content-xs text-function-error-default">쓴 횟수({usedRounds}회) 이상, 20회 이하로 적어 주세요.</span>}
      </label>
      <label className="mb-5 inline-flex cursor-pointer items-center gap-2 type-content-s text-contents-light-bgd-sub">
        <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
        횟수 제한 없음
      </label>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void submit()} confirmLabel={busy ? "바꾸는 중…" : "횟수 바꾸기"} disabled={busy || !valid} />
    </GalleryModalShell>
  );
}
