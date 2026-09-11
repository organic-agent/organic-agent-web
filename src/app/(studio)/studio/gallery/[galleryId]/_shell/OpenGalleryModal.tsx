"use client";

/**
 * 갤러리 열기 확인 — 사진 업로드 → 셀렉 대기 (POST /galleries/{id}/open)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/OpenGalleryModal.tsx
 *
 * 열면 클라이언트가 초대 링크로 들어와 고를 수 있다. 사진 · 폴더는 열린 뒤에도 고칠 수 있다.
 */

import { useState } from "react";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(studio)/studio/_components/GalleryModalShell";
import { deadlineDateLabel, deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { ApiError } from "@/lib/api/client";
import { openGallery, type GalleryResponse } from "@/lib/api/galleries";

export function OpenGalleryModal({
  gallery,
  photoCount,
  folderCount,
  reviewCount,
  onClose,
  onOpened,
}: {
  gallery: GalleryResponse;
  photoCount: number;
  folderCount: number;
  reviewCount: number;
  onClose: () => void;
  onOpened: (gallery: GalleryResponse) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const deadline = deadlineDateLabel(gallery.selectionDeadline);
  const offset = deadlineOffset(gallery.selectionDeadline);

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      onOpened(await openGallery(gallery.id));
    } catch (err) {
      setBanner(
        err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title="갤러리를 열까요?"
      desc="열면 셀렉 대기 단계가 되고, 클라이언트가 초대 링크로 들어와 사진을 고를 수 있어요. 사진과 폴더는 열린 뒤에도 고칠 수 있어요."
      maxWidthClassName="max-w-120"
      onClose={onClose}
    >
      <dl className="mb-5 flex flex-col type-content-s">
        <Row label="갤러리" value={gallery.title} />
        <Row
          label="사진"
          value={`${photoCount}장${folderCount > 0 ? ` · 폴더 ${folderCount}${reviewCount > 0 ? ` (확인 필요 ${reviewCount})` : ""}` : ""}`}
        />
        <Row
          label="선택 마감"
          value={
            deadline
              ? `${deadline}${offset !== null && offset < 0 ? ` (D-${-offset})` : ""}`
              : "기한 없음"
          }
        />
        <Row
          label="고를 장수"
          value={
            gallery.maxSelectablePhotoCount !== null ? `${gallery.maxSelectablePhotoCount}장` : "제한 없음"
          }
        />
      </dl>
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void confirm()}
        confirmLabel={submitting ? "여는 중…" : "갤러리 열기"}
        disabled={submitting}
      />
    </GalleryModalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-divider-default py-2 last:border-b">
      <dt className="text-contents-light-bgd-weakness">{label}</dt>
      <dd className="text-right font-medium text-contents-light-bgd-default">{value}</dd>
    </div>
  );
}
