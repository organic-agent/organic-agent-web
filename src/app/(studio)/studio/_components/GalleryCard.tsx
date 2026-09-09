"use client";

/**
 * 작가 — 갤러리 카드 (피그마 Field/GalleryCard 대응)
 * 위치: src/app/(studio)/studio/_components/GalleryCard.tsx
 *
 * 커버(상태 칩 오버레이) + 정보(제목 · 케밥 메뉴 · 마감일 · 셀렉 현황 바).
 * 커버 클릭 = 워크스페이스 이동, 케밥 = 수정/삭제 메뉴.
 * 커버는 사진 업로드 연동(04) 전까지 플레이스홀더(사진 아이콘)를 보여준다.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { deadlineDateLabel } from "@/app/(studio)/_lib/galleryStatus";
import { MoreIcon, PhotoIcon } from "@/components/icons";
import { GalleryProgress } from "@/components/photographer/GalleryProgress";
import { GalleryStatusChip } from "@/components/photographer/GalleryStatusChip";
import { IconButton } from "@/components/ui/IconButton";
import type { GalleryListItem } from "../_lib/useGalleryList";

type Props = {
  gallery: GalleryListItem;
  onEdit: (gallery: GalleryListItem) => void;
  onDelete: (gallery: GalleryListItem) => void;
};

export function GalleryCard({ gallery, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const deadline = deadlineDateLabel(gallery.selectionDeadline);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-(--radius-16) border border-divider-default bg-background-default-main">
      <Link
        href={`/studio/gallery/${gallery.id}`}
        aria-label={`${gallery.title} 갤러리 열기`}
        className="relative block aspect-12/7 bg-surface-default-light"
      >
        <span className="absolute inset-0 grid place-items-center text-contents-light-bgd-weakness">
          <PhotoIcon size={24} />
        </span>
      </Link>
      <GalleryStatusChip
        gallery={gallery}
        className="pointer-events-none absolute left-2 top-2"
      />

      <div className="flex flex-col gap-5 p-3">
        <div className="flex flex-col gap-1">
          <div className="flex h-8 items-center justify-between gap-2">
            <h2 className="truncate type-title-m text-contents-light-bgd-default">
              {gallery.title}
            </h2>
            <div ref={menuRef} className="relative flex shrink-0">
              <IconButton
                icon={<MoreIcon size={20} />}
                aria-label={`${gallery.title} 갤러리 메뉴`}
                selected={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              />
              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 flex w-32 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover)">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(gallery);
                    }}
                    className="w-full cursor-pointer rounded-(--radius-4) px-3 py-2 text-left type-content-m text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(gallery);
                    }}
                    className="w-full cursor-pointer rounded-(--radius-4) px-3 py-2 text-left type-content-m text-function-error-default transition-colors duration-fast hover:bg-surface-default-lightness"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="type-content-xs text-contents-light-bgd-sub">
            {deadline ? `마감 : ${deadline}` : "마감 기한 없음"}
          </p>
        </div>

        <GalleryProgress
          selected={gallery.selectedCount}
          target={gallery.maxSelectablePhotoCount}
        />
      </div>
    </article>
  );
}
