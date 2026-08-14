/**
 * 별점 — 피그마 Field/Star(outline/filled) + StarRating 대응 (별 24px × 5, gap 4)
 * 위치: src/components/ui/StarRating.tsx
 *
 * controlled: value(0~max)와 onChange. onChange가 없으면 읽기 전용 표시.
 * 같은 별을 다시 누르면 0점으로 해제한다.
 * 별 색은 로즈(accent) — 별점 = "마음에 듦" 표시라 선택 강조 전용색을 쓴다.
 */

const STAR_PATH =
  "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z";

function Star({ filled, size = 24 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d={STAR_PATH}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  /** 별 하나의 크기(px). 시안 기본 24 */
  size?: number;
  className?: string;
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 24,
  className = "",
}: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  if (!onChange) {
    return (
      <div
        className={`flex items-center gap-1 text-bg-accent-solid ${className}`}
        role="img"
        aria-label={`별점 ${value}/${max}`}
      >
        {stars.map((n) => (
          <Star key={n} filled={n <= value} size={size} />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-bg-accent-solid ${className}`}>
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          aria-label={`${n}점`}
          aria-pressed={n <= value}
          className="cursor-pointer transition-transform duration-fast active:scale-90"
        >
          <Star filled={n <= value} size={size} />
        </button>
      ))}
    </div>
  );
}
