/**
 * 갤러리 상태 칩 — 피그마 Item/DdayInfo 대응 (흰 pill, "상태 · D-day")
 * 위치: src/components/photographer/GalleryStatusChip.tsx
 *
 * 서버 status(DRAFT/OPEN/CLOSED) 기반. 문구·톤은 galleryChip이 계산한다.
 * 시안 문법: 기본 muted → 오늘 마감 warning → 지연 critical, 마감은 기본색.
 * 텍스트 한 덩어리에 색만 바뀐다.
 */

import {
  type ChipTone,
  galleryChip,
} from "@/app/(studio)/_lib/galleryStatus";
import type { GalleryResponse } from "@/lib/api/galleries";

const TONE_CLASS: Record<ChipTone, string> = {
  muted: "text-contents-light-bgd-sub",
  warning: "text-function-warning-default",
  critical: "text-function-error-default",
  strong: "text-contents-light-bgd-default",
};

export function GalleryStatusChip({
  gallery,
  className = "",
}: {
  gallery: Pick<GalleryResponse, "status" | "selectionDeadline">;
  className?: string;
}) {
  const { text, tone } = galleryChip(gallery);

  return (
    <span
      className={`inline-flex items-center rounded-(--pill) bg-background-default-main px-2 py-1 type-content-xs ${TONE_CLASS[tone]} ${className}`}
    >
      {text}
    </span>
  );
}
