"use client";

/**
 * 작가 — 갤러리 수정 모달
 * 위치: src/app/(photographer)/galleries/_components/EditGalleryModal.tsx
 *
 * 목록 카드 메뉴에서 여는 갤러리 정보 수정 폼이다.
 * 이름, 마감일, 목표 선택 장수, 컨셉 개수, 메모를 수정한다.
 *
 * 주요 책임:
 * - 선택된 갤러리의 수정 폼 상태 관리
 * - 저장 가능 여부 검증
 * - 수정된 필드 전달
 */

import { useState } from "react";
import type { Gallery } from "@/lib/galleries";
import {
  type GalleryFormPatch,
  galleryToFormValues,
  isGalleryFormValid,
  toGalleryFormPatch,
} from "../../_lib/galleryForm";
import { GalleryFormFields } from "./GalleryFormFields";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

type Props = {
  gallery: Gallery;
  onClose: () => void;
  onSave: (patch: GalleryFormPatch) => void;
};

export function EditGalleryModal({ gallery, onClose, onSave }: Props) {
  const [form, setForm] = useState(() => galleryToFormValues(gallery));
  const canSave = isGalleryFormValid(form);

  function saveGallery() {
    if (!canSave) return;
    onSave(toGalleryFormPatch(form));
  }

  return (
    <GalleryModalShell
      title="갤러리 수정"
      desc="목록에 표시되는 기본 정보를 수정하세요."
      onClose={onClose}
    >
      <GalleryFormFields values={form} onChange={setForm} />
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={saveGallery}
        confirmLabel="저장"
        disabled={!canSave}
      />
    </GalleryModalShell>
  );
}
