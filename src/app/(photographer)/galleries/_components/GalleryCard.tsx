/**
 * 작가 — 갤러리 카드
 * 위치: src/app/(photographer)/galleries/_components/GalleryCard.tsx
 *
 * 갤러리 목록에서 갤러리 하나의 커버, 상태, 날짜, 셀렉 현황을 보여준다.
 * 업로드 전 갤러리는 실제 커버 대신 업로드 대기 placeholder를 표시한다.
 *
 * 주요 책임:
 * - 갤러리 카드 링크 렌더링
 * - 카드 관리 메뉴 렌더링
 * - 상태 배지와 마감일 표시
 * - 업로드 전 placeholder와 진행률 표시
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { useClickOutside } from "../../_hooks/useClickOutside";
import {
  type Gallery,
  galleryBadgeClass,
  getDueDateBorderColor,
  getGalleryBadge,
  getOverdueLabel,
} from "@/lib/galleries";
import { dueDateTextClass, toDotDate } from "../_lib/galleryList";

type Props = {
  gallery: Gallery;
  onEdit: (gallery: Gallery) => void;
  onDelete: (gallery: Gallery) => void;
};

export function GalleryCard({ gallery, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pct = gallery.total
    ? Math.round((gallery.selected / gallery.total) * 100)
    : 0;
  const badge = getGalleryBadge(gallery);
  const dueBorderColor = getDueDateBorderColor(gallery);
  const overdueLabel = getOverdueLabel(gallery);
  const needsUpload = !gallery.uploaded || gallery.total === 0;

  useClickOutside(menuRef, menuOpen, () => setMenuOpen(false));

  return (
    <div
      className="group relative border border-line rounded-lg bg-white hover:shadow-md hover:-translate-y-1 transition-all"
      style={
        dueBorderColor
          ? { borderColor: dueBorderColor, borderWidth: 2 }
          : undefined
      }
    >
      <Link
        href={`/galleries/${gallery.id}`}
        className="block overflow-hidden rounded-t-lg cursor-pointer"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#F3F4F6]">
          {needsUpload ? (
            <div className="w-full h-full grid place-items-center text-center px-4">
              <div>
                <div className="w-11 h-11 rounded-full bg-white border border-line-strong grid place-items-center text-ink-3 mx-auto mb-3 shadow-sm">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
                <p className="text-[12px] font-medium text-ink-2">
                  사진 업로드 전
                </p>
                <p className="text-[11px] text-ink-3 mt-1">
                  업로드 후 초대할 수 있어요
                </p>
              </div>
            </div>
          ) : (
            <img
              src={gallery.cover}
              alt={`${gallery.couple} 갤러리 커버`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          <span
            className={`absolute top-3 right-3 px-2.5 py-1 rounded-pill text-[11px] font-medium ${galleryBadgeClass(badge.label)}`}
          >
            {badge.label}
            {overdueLabel && ` · ${overdueLabel}`}
          </span>
        </div>
      </Link>

      <div className="relative p-5">
        <Link
          href={`/galleries/${gallery.id}`}
          className="block cursor-pointer pr-10"
        >
          <div className="mb-1">
            <h2 className="font-display-ko font-medium text-[17px] text-ink">
              {gallery.couple}
            </h2>
            <span
              className={`font-mono text-[11px] ${dueDateTextClass(gallery)}`}
            >
              {toDotDate(gallery.dueDate)}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-ink-2">셀렉 현황</span>
              <span className="text-[12px] font-medium text-ink">
                {gallery.selected} / {gallery.total}
              </span>
            </div>
            <div className="h-1.5 rounded-pill bg-paper-deep overflow-hidden">
              <div
                className="h-full rounded-pill bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </Link>

        <div className="absolute right-4 top-4 z-10" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={`${gallery.couple} 갤러리 관리 메뉴`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-8 h-8 rounded-full border border-transparent text-ink-3 grid place-items-center hover:text-ink hover:border-line hover:bg-paper-deep transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5h.01M12 12h.01M12 19h.01" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-[132px] rounded-lg border border-line bg-white shadow-md py-1.5"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(gallery);
                }}
                className="w-full px-4 py-2.5 text-left text-[13px] text-ink-2 hover:bg-paper-deep hover:text-ink transition-colors"
              >
                수정
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(gallery);
                }}
                className="w-full px-4 py-2.5 text-left text-[13px] text-danger hover:bg-danger/10 transition-colors"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
