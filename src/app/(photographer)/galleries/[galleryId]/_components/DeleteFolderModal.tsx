"use client";

/**
 * 앨범/폴더 삭제 확인 — Modal/Gallery kind=delete와 같은 문법 (이슈 #31)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/DeleteFolderModal.tsx
 *
 * 폴더는 사진을 가리키는 목록일 뿐이라 원본이 지워지지 않음을 명시한다 —
 * 휴지통 없이 즉시 삭제라 이 문구가 안전판이다. 실패는 배너로 표면화.
 */

import { useState } from "react";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(photographer)/galleries/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";

type DeleteFolderModalProps = {
  kind: "group" | "folder";
  name: string;
  onClose: () => void;
  /** 실제 삭제 — 실패 시 throw하면 배너로 보여주고 모달을 유지한다 */
  onConfirm: () => Promise<void>;
};

export function DeleteFolderModal({
  kind,
  name,
  onClose,
  onConfirm,
}: DeleteFolderModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function confirm() {
    if (submitting) return;
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
      title={
        kind === "group"
          ? `'${name}' 앨범을 삭제할까요?`
          : `'${name}' 폴더를 삭제할까요?`
      }
      desc={
        kind === "group"
          ? "앨범과 안의 폴더가 모두 삭제돼요. 사진 원본은 갤러리에 그대로 남아요."
          : "폴더와 담긴 목록만 삭제돼요. 사진 원본은 갤러리에 그대로 남아요."
      }
      onClose={onClose}
    >
      {banner && (
        <p
          role="alert"
          className="mb-4 text-center type-content-xs text-function-error-default"
        >
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void confirm()}
        confirmLabel={submitting ? "삭제 중…" : "삭제"}
        confirmVariant="danger"
        disabled={submitting}
      />
    </GalleryModalShell>
  );
}
