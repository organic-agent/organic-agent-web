"use client";

/**
 * 작가 — 갤러리 완전 삭제 확인 모달 (와이어프레임 04 삭제 확인)
 * 위치: src/app/(studio)/studio/_components/DeleteGalleryConfirmModal.tsx
 *
 * 홈에는 휴지통 UI를 두지 않기로 했다(2026-09-10 결정). 그래서 삭제는 곧 완전 삭제다 —
 * 서버의 휴지통 이동(DELETE /galleries/{id}) 뒤 즉시 완전 삭제(DELETE /trash/galleries/{id})를
 * 이어 부른다. 되돌릴 수 없음을 문구와 확인 체크로 두 번 못 박는다.
 * 두 번째 호출이 실패해도 갤러리는 이미 휴지통이라 목록에서는 빠진 상태다 — 보관 기간 뒤
 * 서버가 지우므로 사용자에게는 삭제된 것으로 보여준다.
 */

import { useState } from "react";
import { CheckboxField } from "@/components/ui/Checkbox";
import { ApiError } from "@/lib/api/client";
import { moveGalleryToTrash, purgeGallery } from "@/lib/api/galleries";
import type { GalleryListItem } from "../_lib/useGalleryList";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

type Props = {
  gallery: GalleryListItem;
  onClose: () => void;
  onDeleted: (id: number) => void;
};

export function DeleteGalleryConfirmModal({ gallery, onClose, onDeleted }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function confirmDelete() {
    if (!acknowledged || submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      await moveGalleryToTrash(gallery.id);
      try {
        await purgeGallery(gallery.id);
      } catch {
        // 휴지통 이동은 됐다 — 보관 기간이 지나면 서버가 완전히 지운다
      }
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
      title="갤러리를 완전히 삭제할까요?"
      maxWidthClassName="max-w-[400px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="mb-5 type-content-m text-contents-light-bgd-sub">
        <span className="font-medium text-contents-light-bgd-default">{gallery.title}</span>의
        사진·폴더·셀렉 기록이 모두 사라지고 되돌릴 수 없어요. 클라이언트도 더 이상 열 수
        없어요.
      </p>
      <CheckboxField
        label="되돌릴 수 없다는 걸 확인했어요"
        checked={acknowledged}
        onChange={setAcknowledged}
        className="mb-6"
      />
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={confirmDelete}
        confirmLabel={submitting ? "삭제하는 중…" : "완전히 삭제"}
        confirmVariant="danger"
        disabled={!acknowledged || submitting}
      />
    </GalleryModalShell>
  );
}
