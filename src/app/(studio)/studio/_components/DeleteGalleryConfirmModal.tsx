"use client";

/**
 * 작가 — 갤러리 삭제(휴지통 이동) 확인 모달
 * 위치: src/app/(studio)/studio/_components/DeleteGalleryConfirmModal.tsx
 *
 * 목록 카드 메뉴에서 삭제를 누른 뒤 최종 확인을 받는다.
 * 서버 동작은 즉시 삭제가 아니라 휴지통 이동이다 — 복원할 수 있고,
 * 보관 기간이 지나면 원본과 함께 자동으로 완전히 삭제된다.
 * 문구가 그 사실을 그대로 말하게 한다.
 */

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { moveGalleryToTrash } from "@/lib/api/galleries";
import type { GalleryListItem } from "../_lib/useGalleryList";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

type Props = {
  gallery: GalleryListItem | null;
  onClose: () => void;
  onDeleted: (id: number) => void;
};

export function DeleteGalleryConfirmModal({
  gallery,
  onClose,
  onDeleted,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  if (!gallery) return null;

  async function confirmDelete() {
    if (!gallery || submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      await moveGalleryToTrash(gallery.id);
      onDeleted(gallery.id);
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
      title="갤러리를 휴지통으로 보낼까요?"
      maxWidthClassName="max-w-[380px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="mb-6 type-content-m text-contents-light-bgd-sub">
        <span className="font-medium text-contents-light-bgd-default">{gallery.title}</span>의
        사진과 선택 기록이 부부에게 보이지 않게 돼요. 휴지통에서 언제든 되돌릴
        수 있고, 보관 기간이 지나면 원본과 함께 자동으로 완전히 삭제돼요.
      </p>
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={confirmDelete}
        confirmLabel={submitting ? "보내는 중…" : "휴지통으로 보내기"}
        confirmVariant="danger"
        disabled={submitting}
      />
    </GalleryModalShell>
  );
}
