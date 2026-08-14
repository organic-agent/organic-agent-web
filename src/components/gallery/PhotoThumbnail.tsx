/**
 * 필름스트립 썸네일 — 피그마 Image/Thumbnail 대응 (4:5, 행 높이에 비례 · 최대 64×80)
 * 위치: src/components/gallery/PhotoThumbnail.tsx
 *
 * 크기는 필름스트립 행 높이(clamp 유동)를 따라간다 — h-full + aspect.
 * selected: 현재 보고 있는 사진 (검정 보더). badge: 좌상단 검정 칩 (앨범 사진 수 등).
 * 실제 이미지 연동 전까지 회색 플레이스홀더(bg.disabled 값 차용).
 */

type PhotoThumbnailProps = {
  onClick: () => void;
  label: string;
  selected?: boolean;
  badge?: string | number;
};

export function PhotoThumbnail({
  onClick,
  label,
  selected = false,
  badge,
}: PhotoThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={selected || undefined}
      className="relative h-full shrink-0 cursor-pointer"
    >
      <span
        className={`block aspect-4/5 h-full rounded-(--radius-4) bg-bg-disabled ${
          selected ? "border-2 border-fg-neutral" : ""
        }`}
      />
      {badge !== undefined && (
        <span className="absolute left-1 top-1 rounded-(--radius-4) bg-bg-neutral-inverted px-1 py-0.5 type-body-small leading-none text-fg-neutral-inverted">
          {badge}
        </span>
      )}
    </button>
  );
}
