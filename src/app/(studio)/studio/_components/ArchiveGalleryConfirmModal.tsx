"use client";

/**
 * 작가 — 갤러리 보관 확인 모달
 * 위치: src/app/(studio)/studio/_components/ArchiveGalleryConfirmModal.tsx
 *
 * 카드 메뉴 "보관하기"의 확인. 서버로는 종료 API(POST /galleries/{id}/close) — OPEN을 CLOSED로
 * 바꾸고 단계를 보관(ARCHIVED)으로 옮긴다. 이후 클라이언트는 고를 수 없고 열람·삭제만 남는다.
 * 보관된 갤러리는 홈 목록에서 빠지고 "보관됨" 필터에서만 보인다.
 */

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { closeGallery } from "@/lib/api/galleries";
import type { GalleryListItem } from "../_lib/useGalleryList";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

type Props = {
  gallery: GalleryListItem;
  onClose: () => void;
  onArchived: (gallery: GalleryListItem) => void;
};

export function ArchiveGalleryConfirmModal({ gallery, onClose, onArchived }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function confirmArchive() {
    if (submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const updated = await closeGallery(gallery.id);
      onArchived({ ...updated, selectedCount: gallery.selectedCount });
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
      title="갤러리를 보관할까요?"
      maxWidthClassName="max-w-[400px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="mb-6 type-content-m text-contents-light-bgd-sub">
        <span className="font-medium text-contents-light-bgd-default">{gallery.title}</span>은
        홈 목록에서 사라지고 &ldquo;보관됨&rdquo; 필터에서만 보여요. 클라이언트는 더 이상 고를 수
        없고, 열람과 삭제만 할 수 있어요.
      </p>
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={confirmArchive}
        confirmLabel={submitting ? "보관하는 중…" : "보관하기"}
        disabled={submitting}
      />
    </GalleryModalShell>
  );
}
