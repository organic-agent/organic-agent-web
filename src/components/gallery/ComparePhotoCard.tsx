"use client";

/**
 * 비교 사진 카드 — 피그마 Image/ComparePhoto 대응 (4:5 이미지 + 별점)
 * 위치: src/components/gallery/ComparePhotoCard.tsx
 *
 * 카드 폭은 화면에서 역산해 전달받는다(imageWidth) — 항상 스크롤 없이
 * 사진+별점이 한 화면에 들어가는 것이 목표. 이미지 클릭 = 선택 앨범 토글.
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
};

export function ComparePhotoCard({
  label,
  imageWidth,
  selected,
  onToggleSelected,
  rating,
  onRate,
}: ComparePhotoCardProps) {
  const imageClass = `w-full aspect-4/5 bg-bg-disabled ${
    selected ? "border-2 border-fg-neutral" : ""
  }`;

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
        />
      ) : (
        <div role="img" aria-label={label} className={imageClass} />
      )}
      <StarRating value={rating} onChange={onRate} />
    </div>
  );
}
