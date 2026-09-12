"use client";

/**
 * 작가 — 갤러리 수정 모달
 * 위치: src/app/(studio)/studio/_components/EditGalleryModal.tsx
 *
 * 목록 카드 메뉴에서 여는 갤러리 정보 수정 폼. 네 필드(이름·선택 마감·고를
 * 장수·보정 횟수)가 각자 별도 PATCH라서 원본과 비교해 **바뀐 필드만** 순서대로 보낸다.
 * 중간에 실패하면 이미 보낸 필드는 서버에 반영된 상태다 — 입력을 유지한 채
 * 배너로 알리고, 다시 저장하면 같은 값 PATCH는 멱등이라 안전하다.
 */

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  type GalleryResponse,
  changeSelectionDeadline,
  patchMaxSelectablePhotoCount,
  renameGallery,
  toSelectionDeadline,
} from "@/lib/api/galleries";
import { changeMaxRetouchRoundCount } from "@/lib/api/retouch";
import { type GalleryFormValues, isPastDueDate, isRoundsValid } from "../../_lib/galleryForm";
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
    rounds: gallery.maxRetouchRoundCount !== null ? String(gallery.maxRetouchRoundCount) : "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // 원본과 비교 — 바뀐 필드만 PATCH 대상이다
  const originalDueDate = gallery.selectionDeadline
    ? gallery.selectionDeadline.slice(0, 10)
    : "";
  const nameChanged = form.name.trim() !== gallery.title;
  const dueDateChanged = form.dueDate !== originalDueDate;
  const targetChanged =
    (form.target.trim() ? Number(form.target) : null) !==
    gallery.maxSelectablePhotoCount;
  const roundsChanged = (form.rounds.trim() ? Number(form.rounds) : null) !== gallery.maxRetouchRoundCount;

  const nameValid = form.name.trim().length > 0;
  const targetValid = form.target.trim() === "" || Number(form.target) > 0;
  const roundsValid = isRoundsValid(form.rounds);
  // 지난 날짜는 "바꾸는 경우"에만 막는다 — 이미 지나 있던 기한을 안 건드리면
  // 다른 필드는 저장할 수 있어야 한다
  const duePastBlocked = dueDateChanged && isPastDueDate(form.dueDate);
  const canSave =
    nameValid &&
    targetValid &&
    roundsValid &&
    !duePastBlocked &&
    !submitting &&
    (nameChanged || dueDateChanged || targetChanged || roundsChanged);

  async function saveGallery() {
    if (!canSave) return;
    setSubmitting(true);
    setBanner(null);
    try {
      let updated: GalleryResponse = gallery;
      if (nameChanged) {
        updated = await renameGallery(gallery.id, form.name.trim());
      }
      if (dueDateChanged) {
        updated = await changeSelectionDeadline(
          gallery.id,
          form.dueDate ? toSelectionDeadline(form.dueDate) : null,
        );
      }
      if (targetChanged) {
        updated = await patchMaxSelectablePhotoCount(
          gallery.id,
          form.target.trim() ? Number(form.target) : null,
        );
      }
      if (roundsChanged) {
        updated = await changeMaxRetouchRoundCount(gallery.id, form.rounds.trim() ? Number(form.rounds) : null);
      }
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
      desc="이름과 선택 마감, 고를 장수, 보정 횟수를 바꿀 수 있어요."
      onClose={onClose}
    >
      <GalleryFormFields values={form} onChange={setForm} mode="edit" />
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
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
