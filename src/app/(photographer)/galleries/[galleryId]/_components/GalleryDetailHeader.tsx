/**
 * 작가 — 갤러리 상세 헤더
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryDetailHeader.tsx
 *
 * 갤러리 상세 화면의 상단 정보를 보여준다.
 * 뒤로가기, 갤러리 이름, 날짜, 상태 배지, 주요 액션 버튼을 담당한다.
 *
 * 주요 책임:
 * - 갤러리 기본 정보 표시
 * - 상태 배지 표시
 * - 초대/업로드/전달 완료 버튼 렌더링
 */

import Link from "next/link";
import { galleryBadgeClass, type Gallery } from "@/lib/galleries";

type Props = {
  couple: string;
  date: string;
  gallery?: Gallery;
  badge: { label: string; isCorrection: boolean } | null;
  onInviteOpen: () => void;
  onUploadOpen: () => void;
  onMarkDelivered: () => void;
};

export function GalleryDetailHeader({
  couple,
  date,
  gallery,
  badge,
  onInviteOpen,
  onUploadOpen,
  onMarkDelivered,
}: Props) {
  return (
    <div className="px-6 md:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/galleries"
          className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep transition-colors shrink-0"
          aria-label="갤러리 목록으로"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display-ko font-medium text-[19px] text-ink truncate">
              {couple}
            </h1>
            <span className="font-mono text-[11px] text-ink-3 shrink-0">
              {date}
            </span>
            {badge && (
              <span
                className={`px-2.5 py-1 rounded-pill text-[11px] font-medium shrink-0 ${galleryBadgeClass(badge.label)}`}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {gallery && badge?.label === "셀렉 완료" && (
          <button
            onClick={onMarkDelivered}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-pill border border-select text-[13px] font-medium text-select hover:bg-select hover:text-white transition-colors"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            전달 완료로 표시
          </button>
        )}
        <button
          onClick={onInviteOpen}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-pill border border-ink text-[13px] font-medium text-ink hover:bg-ink hover:text-on-ink transition-colors"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" />
          </svg>
          초대
        </button>
        <button
          onClick={onUploadOpen}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-pill bg-ink text-on-ink text-[13px] font-medium hover:-translate-y-px hover:bg-[#333] transition-all active:translate-y-0"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          업로드
        </button>
      </div>
    </div>
  );
}
