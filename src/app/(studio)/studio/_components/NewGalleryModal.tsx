"use client";

/**
 * 새 갤러리 만들기 모달 (폼 입력 + 생성)
 * 위치: src/app/(studio)/studio/_components/NewGalleryModal.tsx
 *
 * 갤러리 목록 페이지에서 여닫는 생성 폼 모달이다.
 * POST /api/v1/galleries로 실제 갤러리를 만든다 — 생성 직후엔 DRAFT라
 * 부부에게 보이지 않으며, 그 안내는 생성 토스트가 맡는다.
 *
 * 오류 처리: 404(스튜디오 없음)는 온보딩 회송, 그 외는 배너로 표시하고
 * 입력값을 유지해 재시도할 수 있게 한다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  createGallery,
  toSelectionDeadline,
} from "@/lib/api/galleries";
import {
  createDefaultGalleryForm,
  isGalleryFormValid,
} from "../../_lib/galleryForm";
import type { GalleryListItem } from "../_lib/useGalleryList";
import { GalleryFormFields } from "./GalleryFormFields";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

export function NewGalleryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (gallery: GalleryListItem) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => createDefaultGalleryForm());
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const canCreate = isGalleryFormValid(form) && !submitting;

  function handleClose() {
    if (submitting) return;
    onClose();
    setForm(createDefaultGalleryForm());
    setBanner(null);
  }

  async function submitGallery() {
    if (!canCreate) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const created = await createGallery({
        title: form.name.trim(),
        selectionDeadline: form.dueDate
          ? toSelectionDeadline(form.dueDate)
          : null,
        maxSelectablePhotoCount: form.target.trim()
          ? Number(form.target)
          : null,
      });
      onCreated({ ...created, selectedCount: 0 });
      onClose();
      setForm(createDefaultGalleryForm());
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // 스튜디오가 없는 계정 — 갤러리는 스튜디오에 속하므로 온보딩으로 회송
        router.push("/onboarding/studio");
        return;
      }
      setBanner(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <GalleryModalShell
      title="새 갤러리 만들기"
      desc="이름만 정하면 바로 만들 수 있어요."
      onClose={handleClose}
    >
      <GalleryFormFields
        values={form}
        onChange={setForm}
        namePlaceholder="예: 지민 & 하윤 웨딩"
      />
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={handleClose}
        onConfirm={submitGallery}
        confirmLabel={submitting ? "만드는 중…" : "갤러리 생성"}
        disabled={!canCreate}
      />
    </GalleryModalShell>
  );
}
