"use client";

/**
 * 작가에게 전달하기 확인 모달 — 선택 · 보정 요청 · 별점 요약 → submit(requests 동봉)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/SubmitSelectionModal.tsx
 *
 * 전달하면 더 고르거나 바꿀 수 없고 되돌리기는 작가만 한다. 서버는 계약 장수를 정확히 채워야 받는다
 * (SELECTION_400_7) — 버튼은 채웠을 때만 열리지만 함께 고르는 사람이 바꿨을 수 있어 실패 문구도 갖춘다.
 * 고르지 않은 사진의 보정 요청 초안은 전달되지 않는다고 미리 알린다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import type { RetouchRequestItem } from "@/lib/api/retouch";
import { submitSelection } from "@/lib/api/selection";

export function SubmitSelectionModal({
  galleryId,
  selectedCount,
  maxSelectable,
  requests,
  unpickedDraftCount,
  ratedCount,
  onClose,
  onSubmitted,
}: {
  galleryId: number;
  selectedCount: number;
  maxSelectable: number | null;
  /** 고른 사진의 보정 요청(전달 본문) */
  requests: RetouchRequestItem[];
  /** 고르지 않은 사진에 남은 초안 수 — 전달되지 않는다 */
  unpickedDraftCount: number;
  ratedCount: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const points = requests.reduce((n, r) => n + r.points.length, 0);
  const refined = requests.reduce((n, r) => n + r.points.filter((p) => p.useRefinedText).length, 0);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitSelection(galleryId, requests);
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiError && err.code === "SELECTION_400_7")
        setError(maxSelectable !== null ? `계약 장수 ${maxSelectable}장을 정확히 채워야 전달할 수 있어요 (지금 ${selectedCount}장).` : err.message);
      else if (err instanceof ApiError && err.code === "SELECTION_400_6") setError("고른 사진이 없어요.");
      else if (err instanceof ApiError && err.status === 409) setError("이미 전달됐어요 · 화면을 새로 고쳐 주세요.");
      else setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell
      title="작가에게 전달할까요?"
      desc={
        <>
          전달하면 <b className="text-contents-light-bgd-default">더 고르거나 바꿀 수 없어요.</b> 다시 열어 달라는 건 작가에게 요청해야 해요.
          보정 요청도 함께 전달돼요.
        </>
      }
      maxWidthClassName="max-w-120"
      onClose={onClose}
    >
      <dl className="mb-5 flex flex-col type-content-s">
        <Row label="선택한 사진" value={maxSelectable !== null ? `${selectedCount} / ${maxSelectable}장` : `${selectedCount}장`} />
        <Row
          label="보정 요청"
          value={
            requests.length === 0
              ? "없음 · 선택한 사진은 모두 기본 보정 대상이에요"
              : `${requests.length}장 · 점 ${points}개${refined > 0 ? ` (AI 다듬기 ${refined})` : ""}`
          }
        />
        <Row label="별점" value={ratedCount > 0 ? `${ratedCount}장 매김` : "없음"} />
      </dl>
      {unpickedDraftCount > 0 && (
        <p className="mb-4 rounded-(--radius-8) bg-function-warning-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
          고르지 않은 사진 {unpickedDraftCount}장에 쓴 보정 요청은 전달되지 않아요. 필요하면 먼저 그 사진을 골라 주세요.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void submit()} confirmLabel={busy ? "전달하는 중…" : "작가에게 전달하기"} disabled={busy} />
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
