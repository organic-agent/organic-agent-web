"use client";

/**
 * 되돌릴 수 없는 동작의 확인 모달 — 내보내기 · 나가기 · 삭제 · 탈퇴
 * 위치: src/app/(auth)/settings/_components/DangerConfirmModal.tsx
 *
 * requireText를 주면 그 글자를 똑같이 입력해야 버튼이 켜진다(스튜디오 이름 · "탈퇴").
 * 실패 배너는 모달 안에 두고 입력을 유지한다.
 */

import { useState, type ReactNode } from "react";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(studio)/studio/_components/GalleryModalShell";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";

export function DangerConfirmModal({
  title,
  children,
  confirmLabel,
  busyLabel,
  requireText,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  /** 이 글자를 그대로 입력해야 확인할 수 있다 */
  requireText?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const ready = (requireText === undefined || typed === requireText) && !submitting;

  async function confirm() {
    if (!ready) return;
    setSubmitting(true);
    setBanner(null);
    try {
      await onConfirm();
    } catch (err) {
      setBanner(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title={title}
      maxWidthClassName="max-w-[420px]"
      paddingClassName="p-7"
      onClose={submitting ? () => {} : onClose}
    >
      <div className="mb-5 type-content-m text-contents-light-bgd-sub">{children}</div>
      {requireText !== undefined && (
        <TextField
          value={typed}
          onChange={setTyped}
          placeholder={requireText}
          aria-label={`확인을 위해 "${requireText}" 입력`}
          className="mb-5 h-12 px-4"
        />
      )}
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void confirm()}
        confirmLabel={submitting ? busyLabel : confirmLabel}
        confirmVariant="danger"
        disabled={!ready}
      />
    </GalleryModalShell>
  );
}
