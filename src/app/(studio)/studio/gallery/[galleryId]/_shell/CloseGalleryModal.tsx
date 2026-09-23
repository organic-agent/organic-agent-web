"use client";

/**
 * 갤러리 마무리(종료 · 보관) 확인 모달 — close → CLOSED · ARCHIVED, 이후 열람 · 내려받기만
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/CloseGalleryModal.tsx
 *
 * 작가 3단계(클라이언트가 확정도 재요청도 하지 않을 때)와 개인 갤러리 소유자(보정본을 확인한 뒤)가 같은 모달을 쓴다 —
 * 설명 한 줄(desc)만 부르는 쪽이 준다(2026-09-23 묶음 C: "보정본 n / m장 · 마무리하면 보관되고 열람 · 내려받기만").
 */

import { useState, type ReactNode } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { closeGallery, type GalleryResponse } from "@/lib/api/galleries";

export function CloseGalleryModal({
  galleryId,
  desc,
  onClose,
  onDone,
}: {
  galleryId: number;
  desc: ReactNode;
  onClose: () => void;
  onDone: (gallery: GalleryResponse) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await closeGallery(galleryId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }
  return (
    <GalleryModalShell title="이 갤러리를 마무리할까요?" desc={desc} maxWidthClassName="max-w-105" onClose={onClose}>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons onClose={onClose} onConfirm={() => void confirm()} confirmLabel={busy ? "마무리하는 중…" : "마무리(보관)"} disabled={busy} />
    </GalleryModalShell>
  );
}
