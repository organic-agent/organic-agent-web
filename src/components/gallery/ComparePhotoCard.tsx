"use client";

/**
 * 비교 사진 카드 — 피그마 Image/ComparePhoto 대응 (4:5 이미지 + 별점)
 * 위치: src/components/gallery/ComparePhotoCard.tsx
 *
 * 카드 폭은 화면에서 역산해 전달받는다(imageWidth) — 항상 스크롤 없이
 * 사진+별점이 한 화면에 들어가는 것이 목표. 이미지 클릭 = 셀렉 토글.
 * 실제 이미지 연동 전까지 회색 플레이스홀더(bg.disabled 값 차용).
 */

import { StarRating } from "@/components/ui/StarRating";

type ComparePhotoCardProps = {
  label: string;
  /** CSS 길이 표현식 — 세로 맞춤 폭과 가로 N등분 폭 중 작은 쪽 */
  imageWidth: string;
  selected: boolean;
  /** 없으면 읽기 전용 — 선택 표시만 하고 토글 불가 (작가 화면용) */
  onToggleSelected?: () => void;
  rating: number;
  /** 없으면 별점도 읽기 전용 표시 */
  onRate?: (value: number) => void;
  /** 서명된 조회 URL — 없으면 회색 플레이스홀더 */
  imageUrl?: string | null;
  /** 파생 JPEG 준비 전 — 물결 + 아이콘 (시안 v5) */
  preparing?: boolean;
  onImageError?: () => void;
};

export function ComparePhotoCard({
  label,
  imageWidth,
  selected,
  onToggleSelected,
  rating,
  onRate,
  imageUrl,
  preparing = false,
  onImageError,
}: ComparePhotoCardProps) {
  const imageClass = `relative w-full aspect-4/5 overflow-hidden rounded-(--radius-4) bg-bg-disabled ${
    selected ? "border-2 border-fg-neutral" : ""
  }`;

  const fill = preparing ? (
    <span className="absolute inset-0">
      <span className="shimmer-sweep" />
      <span className="absolute inset-0 grid place-items-center text-fg-neutral-subtle">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </span>
    </span>
  ) : (
    imageUrl && (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        onError={onImageError}
        className="absolute inset-0 size-full object-cover"
      />
    )
  );

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-3"
      style={{ width: imageWidth }}
    >
      {onToggleSelected ? (
        <button
          type="button"
          onClick={onToggleSelected}
          aria-label={label}
          aria-pressed={selected}
          className={`${imageClass} cursor-pointer transition-opacity duration-fast hover:opacity-90`}
        >
          {fill}
        </button>
      ) : (
        <div role="img" aria-label={label} className={imageClass}>
          {fill}
        </div>
      )}
      <StarRating value={rating} onChange={onRate} />
    </div>
  );
}
