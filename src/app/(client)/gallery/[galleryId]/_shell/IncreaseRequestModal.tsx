"use client";

/**
 * 선택 장수 추가 요청 모달 — 원하는 장수 · 한 줄 메시지 → 작가 알림
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/IncreaseRequestModal.tsx
 *
 * POST max-selectable-increase-request. 작가가 계약 장수를 바꾸면 클라이언트에게 알림이 온다.
 * 응답 전까지는 브라우저에 "요청함"을 기억해 버튼 문구를 바꾼다(increaseMemory).
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { requestSelectionIncrease } from "@/lib/api/selection";
import { writeIncreaseRequest } from "./increaseMemory";

export function IncreaseRequestModal({
  galleryId,
  currentMax,
  selectedCount,
  onClose,
  onRequested,
}: {
  galleryId: number;
  currentMax: number | null;
  selectedCount: number;
  onClose: () => void;
  onRequested: (requestedCount: number) => void;
}) {
  const base = currentMax ?? Math.max(selectedCount, 10);
  const [count, setCount] = useState(base + 10);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = Number.isInteger(count) && count > (currentMax ?? 0) && count <= 500;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestSelectionIncrease(galleryId, count, message);
      writeIncreaseRequest(galleryId, { requestedCount: count, maxAtRequest: currentMax, at: new Date().toISOString() });
      onRequested(count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell
      title="고를 장수를 늘려 달라고 요청할까요?"
      desc={
        <>
          지금은 <b className="text-contents-light-bgd-default">{currentMax !== null ? `${currentMax}장` : "제한 없이"}</b> 고를 수 있어요.
          요청하면 작가가 알림을 받고 장수를 정해요 — 답은 알림으로 와요.
        </>
      }
      maxWidthClassName="max-w-110"
      onClose={onClose}
    >
      <label className="mb-4 flex flex-col gap-1.5">
        <span className="type-label-semibold-s text-contents-light-bgd-default">원하는 장수</span>
        <span className="flex h-11 items-center gap-2 rounded-(--radius-8) border border-border-default px-3 focus-within:border-contents-light-bgd-sub">
          <input
            type="number"
            min={(currentMax ?? 0) + 1}
            max={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="min-w-0 flex-1 bg-transparent type-content-m text-contents-light-bgd-default tabular-nums focus:outline-none"
          />
          <span className="type-content-s text-contents-light-bgd-weakness">장{currentMax !== null && count > currentMax ? ` · +${count - currentMax}` : ""}</span>
        </span>
        {!valid && <span className="type-content-xs text-function-error-default">지금 장수보다 많고 500장 이하로 적어 주세요.</span>}
      </label>
      <label className="mb-5 flex flex-col gap-1.5">
        <span className="type-label-semibold-s text-contents-light-bgd-default">
          한 줄 메시지 <span className="font-normal text-contents-light-bgd-weakness">(선택)</span>
        </span>
        <textarea
          value={message}
          maxLength={300}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="예) 야외 컷이 너무 좋아서 10장만 더 고르고 싶어요"
          rows={3}
          className="w-full resize-none rounded-(--radius-8) border border-border-default bg-transparent px-3 py-2 type-content-s text-contents-light-bgd-default placeholder:text-contents-light-bgd-weakness focus:border-contents-light-bgd-sub focus:outline-none"
        />
      </label>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void submit()} confirmLabel={busy ? "보내는 중…" : "요청 보내기"} disabled={busy || !valid} />
    </GalleryModalShell>
  );
}
