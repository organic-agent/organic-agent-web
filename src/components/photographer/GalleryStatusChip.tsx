/**
 * 갤러리 상태 칩 — 피그마 Item/DdayInfo 대응 (흰 pill, "상태 · D-day")
 * 위치: src/components/photographer/GalleryStatusChip.tsx
 *
 * 문구는 상태 로직(getGalleryBadge·getOverdueLabel)이 계산한다.
 * 시안 문법: 기본 muted → 오늘 마감 warning → 지연 critical, 텍스트 한 덩어리에 색만 바뀐다.
 */

import {
  getGalleryBadge,
  getOverdueLabel,
  type Gallery,
} from "@/lib/galleries";

export function GalleryStatusChip({
  gallery,
  className = "",
}: {
  gallery: Gallery;
  className?: string;
}) {
  const { label } = getGalleryBadge(gallery);
  const overdue = getOverdueLabel(gallery);
  const text = overdue ? `${label} · ${overdue}` : label;
  const tone =
    !overdue || overdue.startsWith("D-")
      ? "text-fg-neutral-muted"
      : overdue === "오늘 마감"
        ? "text-fg-warning"
        : "text-fg-critical";

  return (
    <span
      className={`inline-flex items-center rounded-(--pill) bg-bg-layer-default px-2 py-1 type-body-small ${tone} ${className}`}
    >
      {text}
    </span>
  );
}
