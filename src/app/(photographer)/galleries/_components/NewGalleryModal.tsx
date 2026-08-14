"use client";

/**
 * 새 갤러리 만들기 모달 (폼 입력 + 생성)
 * 위치: src/app/(photographer)/galleries/_components/NewGalleryModal.tsx
 *
 * 갤러리 목록 페이지에서 여닫는 생성 폼 모달이다.
 * 입력값으로 새 갤러리를 만들고 목업 저장소에 반영한다.
 *
 * 주요 책임:
 * - 새 갤러리 입력 폼 상태 관리
 * - 생성 가능 여부 검증
 * - upsertGallery를 통한 목업 갤러리 생성
 *
 * 참고:
 * - 커버 이미지는 목업 후보를 순서대로 돌려쓴다.
 */

import { useState } from "react";
import { upsertGallery } from "@/lib/galleries";
import {
  createDefaultGalleryForm,
  createGalleryFromForm,
  isGalleryFormValid,
} from "../../_lib/galleryForm";
import { GalleryFormFields } from "./GalleryFormFields";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

export function NewGalleryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (galleryName: string) => void;
}) {
  const [form, setForm] = useState(() => createDefaultGalleryForm());
  const canCreate = isGalleryFormValid(form);

  function resetForm() {
    setForm(createDefaultGalleryForm());
  }

  function handleClose() {
    onClose();
    resetForm();
  }

  function createGallery() {
    if (!canCreate) return;
    const gallery = createGalleryFromForm({
      values: form,
      id: String(Date.now()),
    });
    upsertGallery(gallery);
    onCreated?.(gallery.couple);
    handleClose();
  }

  if (!open) return null;

  return (
    <GalleryModalShell
      title="새 갤러리 만들기"
      desc="갤러리 정보를 입력해 생성하세요."
      onClose={handleClose}
    >
      <GalleryFormFields
        values={form}
        onChange={setForm}
        namePlaceholder="예: 민준 & 서연 웨딩"
        memoPlaceholder="예: 예식이 얼마 안 남아 전달을 서둘러야 해요"
        showDueDateHelp
      />
      <GalleryModalButtons
        onClose={handleClose}
        onConfirm={createGallery}
        confirmLabel="갤러리 생성"
        disabled={!canCreate}
      />
    </GalleryModalShell>
  );
}
