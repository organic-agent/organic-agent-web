/**
 * 별점 — 피그마 Field/Star(outline/filled) + StarRating 대응 (별 24px × 5, gap 4)
 * 위치: src/components/ui/StarRating.tsx
 *
 * controlled: value(0~max)와 onChange. onChange가 없으면 읽기 전용 표시.
 * 같은 별을 다시 누르면 0점으로 해제한다.
 * v2: 별 글리프는 Material Symbols kid_star(디자이너 시안), 색은 brand/secondary(올리브) — 디자이너 확인 항목.
 */

import { StarFillIcon, StarIcon } from "@/components/icons";

function Star({ filled, size = 24 }: { filled: boolean; size?: number }) {
  const Icon = filled ? StarFillIcon : StarIcon;
  return <Icon size={size} className="shrink-0" />;
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
        className={`flex items-center gap-1 text-brand-secondary-default ${className}`}
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
    <div className={`flex items-center gap-1 text-brand-secondary-default ${className}`}>
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
