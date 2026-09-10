"use client";

/**
 * 작가 — 갤러리 카드 (와이어프레임 03 스튜디오 화면 · 04 카드 메뉴)
 * 위치: src/app/(studio)/studio/_components/GalleryCard.tsx
 *
 * 커버(단계 칩 오버레이) + 정보(제목 · 케밥 메뉴 · 마감 · 촬영 종류 · 셀렉 현황 바).
 * 커버 클릭 = 갤러리 이동, 케밥 = 수정 · 보관하기 · 삭제. 보관하기는 종료 API가 OPEN만 받아
 * 열려 있는 갤러리에만 보이고, 보관된 갤러리는 열람 · 삭제만 남는다.
 * 커버는 사진 업로드 연동(PR B) 전까지 플레이스홀더(사진 아이콘)를 보여준다.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  SHOOT_TYPE_LABEL,
  deadlineDateLabel,
} from "@/app/(studio)/_lib/galleryStatus";
import {
  ArchiveIcon,
  DeleteForeverIcon,
  EditIcon,
  MoreIcon,
  PhotoIcon,
  VisibilityIcon,
} from "@/components/icons";
import { GalleryProgress } from "@/components/photographer/GalleryProgress";
import { GalleryStatusChip } from "@/components/photographer/GalleryStatusChip";
import { IconButton } from "@/components/ui/IconButton";
import type { GalleryListItem } from "../_lib/useGalleryList";

type Props = {
  gallery: GalleryListItem;
  onEdit: (gallery: GalleryListItem) => void;
  onArchive: (gallery: GalleryListItem) => void;
  onDelete: (gallery: GalleryListItem) => void;
};

const MENU_ITEM_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-3 py-2 text-left type-content-m transition-colors duration-fast hover:bg-surface-default-lightness";

function MenuButton({
  icon,
  label,
  tone = "default",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${MENU_ITEM_CLASS} ${
        tone === "danger" ? "text-function-error-default" : "text-contents-light-bgd-default"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function GalleryCard({ gallery, onEdit, onArchive, onDelete }: Props) {
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

  const href = `/studio/gallery/${gallery.id}`;
  const deadline = deadlineDateLabel(gallery.selectionDeadline);
  const shootType = SHOOT_TYPE_LABEL[gallery.shootType];
  const archived = gallery.stage === "ARCHIVED";
  // 종료(보관) API는 OPEN 갤러리만 받는다 — 업로드 중(DRAFT)이나 이미 닫힌 갤러리엔 숨긴다
  const canArchive = gallery.status === "OPEN";

  return (
    // overflow-hidden을 카드 전체에 걸면 케밥 메뉴가 잘린다 — 둥근 모서리 클리핑은 커버에만 건다
    <article className="relative flex flex-col rounded-(--radius-16) border border-divider-default bg-background-default-main transition-[border-color,box-shadow] duration-fast hover:border-brand-secondary-light hover:shadow-(--shadow-hover)">
      <Link
        href={href}
        aria-label={`${gallery.title} 갤러리 열기`}
        className="relative block aspect-12/7 overflow-hidden rounded-t-[calc(var(--radius-16)-1px)] bg-surface-default-light"
      >
        <span className="absolute inset-0 grid place-items-center text-contents-light-bgd-weakness">
          <PhotoIcon size={24} />
        </span>
      </Link>
      <GalleryStatusChip
        gallery={gallery}
        className="pointer-events-none absolute top-2 left-2"
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
                <div
                  role="menu"
                  className="absolute top-full right-0 z-20 mt-1 flex w-40 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover)"
                >
                  {archived ? (
                    <Link
                      href={href}
                      className={`${MENU_ITEM_CLASS} text-contents-light-bgd-default`}
                    >
                      <VisibilityIcon size={18} />
                      열람
                    </Link>
                  ) : (
                    <MenuButton
                      icon={<EditIcon size={18} />}
                      label="수정"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(gallery);
                      }}
                    />
                  )}
                  {!archived && canArchive && (
                    <MenuButton
                      icon={<ArchiveIcon size={18} />}
                      label="보관하기"
                      onClick={() => {
                        setMenuOpen(false);
                        onArchive(gallery);
                      }}
                    />
                  )}
                  <div className="my-1 h-px bg-divider-default" />
                  <MenuButton
                    icon={<DeleteForeverIcon size={18} />}
                    label="삭제"
                    tone="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(gallery);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <p className="type-content-xs text-contents-light-bgd-sub">
            {deadline ? `마감 ${deadline}` : "마감 없음"}
            {shootType && ` · ${shootType}`}
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
