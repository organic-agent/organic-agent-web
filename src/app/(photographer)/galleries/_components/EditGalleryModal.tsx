"use client";

/**
 * 작가 — 갤러리 수정 모달
 * 위치: src/app/(photographer)/galleries/_components/EditGalleryModal.tsx
 *
 * 목록 카드 메뉴에서 여는 갤러리 정보 수정 폼이다. 세 필드를 보여주되,
 * 지금 실제로 저장되는 것은 계약 장수뿐이다(PATCH /max-selectable-photo-count).
 * 이름·마감 기한은 서버에 수정 API가 없어 잠가둔다 — 수정 API(WES-216)가
 * 배포되면 잠금을 풀고 저장을 연결한다. "수정했는데 저장이 안 되는" 화면을
 * 만들지 않기 위한 임시 조치다.
 */

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { patchMaxSelectablePhotoCount } from "@/lib/api/galleries";
import type { GalleryFormValues } from "../../_lib/galleryForm";
import type { GalleryListItem } from "../_lib/useGalleryList";
import { GalleryFormFields } from "./GalleryFormFields";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

type Props = {
  gallery: GalleryListItem;
  onClose: () => void;
  onSaved: (gallery: GalleryListItem) => void;
};

export function EditGalleryModal({ gallery, onClose, onSaved }: Props) {
  const [form, setForm] = useState<GalleryFormValues>(() => ({
    name: gallery.title,
    dueDate: gallery.selectionDeadline
      ? gallery.selectionDeadline.slice(0, 10)
      : "",
    target:
      gallery.maxSelectablePhotoCount !== null
        ? String(gallery.maxSelectablePhotoCount)
        : "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const targetValid = form.target.trim() === "" || Number(form.target) > 0;
  const canSave = targetValid && !submitting;

  async function saveGallery() {
    if (!canSave) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const updated = await patchMaxSelectablePhotoCount(
        gallery.id,
        form.target.trim() ? Number(form.target) : null,
      );
      onSaved({ ...updated, selectedCount: gallery.selectedCount });
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
      title="갤러리 수정"
      desc="이름·마감 기한 수정은 준비 중이에요. 지금은 계약 장수를 바꿀 수 있어요."
      onClose={onClose}
    >
      <GalleryFormFields values={form} onChange={setForm} lockNameAndDueDate />
      {banner && (
        <p role="alert" className="mb-4 text-center type-body-small text-fg-critical">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={saveGallery}
        confirmLabel={submitting ? "저장 중…" : "저장"}
        disabled={!canSave}
      />
    </GalleryModalShell>
  );
}
