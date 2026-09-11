"use client";

/**
 * 장수 바꾸기 — 클라이언트의 계약 장수 상향 요청에 답하거나 그냥 바꾼다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ChangeQuotaModal.tsx
 *
 * PATCH max-selectable-photo-count. 바꾸면 클라이언트에게 알림이 간다(서버).
 * 추가 비용 같은 계약 조건은 서비스 밖에서 정한다.
 */

import { useState } from "react";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(studio)/studio/_components/GalleryModalShell";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import { patchMaxSelectablePhotoCount, type GalleryResponse } from "@/lib/api/galleries";

export function ChangeQuotaModal({
  gallery,
  selectedCount,
  requestMessage,
  onClose,
  onDone,
}: {
  gallery: GalleryResponse;
  selectedCount: number;
  /** 클라이언트 요청 알림의 문구 — 있으면 모달 위에 보여준다 */
  requestMessage?: string | null;
  onClose: () => void;
  onDone: (gallery: GalleryResponse) => void;
}) {
  const [count, setCount] = useState(
    gallery.maxSelectablePhotoCount !== null ? String(gallery.maxSelectablePhotoCount) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const n = Number(count);
  const valid = count.trim() === "" || (Number.isInteger(n) && n >= 1);
  const changed = (count.trim() ? n : null) !== gallery.maxSelectablePhotoCount;

  async function confirm() {
    if (!valid || !changed || submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      onDone(await patchMaxSelectablePhotoCount(gallery.id, count.trim() ? n : null));
    } catch (err) {
      setBanner(
        err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title="고를 장수를 바꿀까요?"
      maxWidthClassName="max-w-[440px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      {requestMessage && (
        <p className="mb-3 rounded-(--radius-8) bg-brand-secondary-background px-3.5 py-2.5 type-content-s text-contents-light-bgd-default">
          {requestMessage}
        </p>
      )}
      <p className="mb-5 type-content-m text-contents-light-bgd-sub">
        바꾸면 클라이언트에게 알림이 가요. 추가 비용 같은 계약 조건은 스튜디오와 클라이언트가 따로
        정해요.
      </p>
      <label className="mb-2 block type-label-medium-m text-contents-light-bgd-default">
        고를 장수
        <span className="ml-1 font-normal text-contents-light-bgd-sub">
          — 지금 {gallery.maxSelectablePhotoCount ?? "제한 없음"} · 고른 {selectedCount}장
        </span>
      </label>
      <TextField
        type="number"
        min={1}
        value={count}
        onChange={setCount}
        error={!valid}
        placeholder="비우면 제한 없음"
        aria-label="고를 장수"
        className="mb-1.5 h-12 px-4"
      />
      <p
        className={`mb-6 type-content-xs ${
          valid ? "text-contents-light-bgd-sub" : "text-function-error-default"
        }`}
      >
        {valid ? "비우면 제한 없이 고를 수 있어요" : "1 이상의 정수를 입력해 주세요"}
      </p>
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void confirm()}
        confirmLabel={submitting ? "바꾸는 중…" : "장수 바꾸기"}
        disabled={!valid || !changed || submitting}
      />
    </GalleryModalShell>
  );
}
