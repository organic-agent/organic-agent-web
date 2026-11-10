"use client";

/**
 * 이미 넣은 사진을 다른 프레임으로 옮길지 묻는 창(이슈 168 · 디자이너 시안 Case 3)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/MoveConfirmModal.tsx
 *
 * 옮긴 뒤 모습을 미리 보여 준다 — 원래 자리는 빈 프레임, 고른 프레임에 그 사진. 맞바꾸지 않는다.
 */

import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ArrowRightIcon, PhotoIcon } from "@/components/icons";
import { pad2, type Frame } from "@/lib/album/model";
import type { AlbumPhoto } from "./useAlbumSource";

const nameOf = (f: Frame) => `펼침면 ${f.spread + 1} · ${pad2(f.no)}`;

export function MoveConfirmModal({ photo, from, to, onClose, onConfirm }: { photo: AlbumPhoto | null; from: Frame; to: Frame; onClose: () => void; onConfirm: () => void }) {
  return (
    <GalleryModalShell title="이미 넣은 사진이에요" desc="고른 프레임으로 옮기면 원래 자리는 비어요" maxWidthClassName="max-w-96" onClose={onClose}>
      <div className="mb-6 flex items-center justify-center gap-4">
        <figure className="m-0 flex flex-col items-center gap-2">
          <span className="grid size-20 place-items-center rounded-(--radius-8) border border-border-default bg-surface-default-lightness text-contents-light-bgd-weakness">
            <PhotoIcon size={22} />
          </span>
          <figcaption className="type-label-semibold-s text-contents-light-bgd-default">{nameOf(from)}</figcaption>
        </figure>
        <span aria-hidden className="flex pb-6 text-contents-light-bgd-weakness">
          <ArrowRightIcon size={20} />
        </span>
        <figure className="m-0 flex flex-col items-center gap-2">
          <span className="block size-20 overflow-hidden rounded-(--radius-8) bg-surface-default-lightness">
            {photo?.src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.src} alt="" className="size-full object-cover" />
            )}
          </span>
          <figcaption className="type-label-semibold-s text-contents-light-bgd-default">{nameOf(to)}</figcaption>
        </figure>
      </div>
      <GalleryModalButtons onClose={onClose} onConfirm={onConfirm} confirmLabel="옮기기" />
    </GalleryModalShell>
  );
}
