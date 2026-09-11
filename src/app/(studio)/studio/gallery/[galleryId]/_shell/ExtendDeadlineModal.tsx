"use client";

/**
 * 기간 연장 — 새 선택 마감을 받아 클라이언트가 이어서(또는 다시) 고를 수 있게
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ExtendDeadlineModal.tsx
 *
 * 제출된 상태면 제출 되돌리기(작가만) → 마감 변경. 닫힌 갤러리면 재오픈이 마감을 받는다.
 * 문구는 상태와 무관하게 하나(2026-09-11 결정).
 */

import { useState } from "react";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(studio)/studio/_components/GalleryModalShell";
import { addDaysAsInputValue, isPastDueDate } from "@/app/(studio)/_lib/galleryForm";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import {
  changeSelectionDeadline,
  reopenGallery,
  toSelectionDeadline,
  type GalleryResponse,
} from "@/lib/api/galleries";
import { withdrawSelection } from "@/lib/api/selection";

export function ExtendDeadlineModal({
  gallery,
  selectedCount,
  submitted,
  onClose,
  onDone,
}: {
  gallery: GalleryResponse;
  selectedCount: number;
  /** 제출된 상태면 먼저 되돌린다 */
  submitted: boolean;
  onClose: () => void;
  onDone: (gallery: GalleryResponse) => void;
}) {
  const current = gallery.selectionDeadline ? gallery.selectionDeadline.slice(0, 10) : "";
  const [date, setDate] = useState(
    current && !isPastDueDate(current) ? current : addDaysAsInputValue(7),
  );
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const valid = date.length > 0 && !isPastDueDate(date);

  async function confirm() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      if (submitted) await withdrawSelection(gallery.id);
      const deadline = toSelectionDeadline(date);
      const updated =
        gallery.status === "CLOSED"
          ? await reopenGallery(gallery.id, deadline)
          : await changeSelectionDeadline(gallery.id, deadline);
      onDone(updated);
    } catch (err) {
      setBanner(
        err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title="선택 기간을 연장할까요?"
      maxWidthClassName="max-w-[440px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="mb-5 type-content-m text-contents-light-bgd-sub">
        새 마감일까지 클라이언트가 이어서 고를 수 있어요. 지금까지 고른{" "}
        <span className="font-medium text-contents-light-bgd-default">{selectedCount}장</span>은
        그대로예요.
      </p>
      <label className="mb-2 block type-label-medium-m text-contents-light-bgd-default">
        새 선택 마감
      </label>
      <TextField
        type="date"
        value={date}
        onChange={setDate}
        error={!valid}
        aria-label="새 선택 마감"
        className="mb-1.5 h-12 px-4"
      />
      <p
        className={`mb-6 type-content-xs ${
          valid ? "text-contents-light-bgd-sub" : "text-function-error-default"
        }`}
      >
        {valid ? "그날이 다 가기 전까지 고를 수 있어요" : "오늘 이후 날짜를 골라 주세요"}
      </p>
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void confirm()}
        confirmLabel={submitting ? "연장하는 중…" : "연장하고 다시 열기"}
        disabled={!valid || submitting}
      />
    </GalleryModalShell>
  );
}
