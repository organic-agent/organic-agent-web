"use client";

/**
 * 선택에서 빼기 확인 — 체크박스를 눌러 뺄 때 한 번 묻는다 (2026-09-12 수민)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/DeselectConfirmModal.tsx
 *
 * 담기는 바로, 빼기는 확인 뒤. 별점 · 보정 요청 초안은 빼도 남는다(다시 담으면 그대로).
 */

import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import type { PhotoResponse } from "@/lib/api/photos";

export function DeselectConfirmModal({ photo, onClose, onConfirm }: { photo: PhotoResponse; onClose: () => void; onConfirm: () => void }) {
  return (
    <GalleryModalShell
      title="선택에서 뺄까요?"
      desc={
        <>
          <b className="text-contents-light-bgd-default">{photo.originalFileName}</b>을(를) 선택한 사진에서 빼요.
          <br />
          별점과 보정 요청 초안은 그대로 남아요.
        </>
      }
      maxWidthClassName="max-w-105"
      onClose={onClose}
    >
      <div className="mb-5 h-40 overflow-hidden rounded-(--radius-8) bg-surface-default-light">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo.viewUrl && <img src={photo.viewUrl} alt="" className="size-full object-contain" />}
      </div>
      <GalleryModalButtons onClose={onClose} onConfirm={onConfirm} confirmLabel="빼기" />
    </GalleryModalShell>
  );
}
