/**
 * 슬라이더 — 피그마 Slider + Field/Slider 대응
 * 위치: src/components/ui/Slider.tsx
 *
 * native input[type=range] 기반 controlled (키보드 접근성 유지).
 * 트랙 3px: 채움 brand-solid / 나머지 bg.disabled, 핸들 14px 흰 원 + neutral-weak 보더.
 * label을 주면 시안 Field/Slider처럼 우측 상단에 값 라벨이 붙는다.
 */

type SliderProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  /** 우측 상단 값 라벨 (예: "1분") */
  label?: string;
  "aria-label": string;
  className?: string;
};

const thumb =
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bg-layer-default [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-stroke-neutral-weak [&::-webkit-slider-thumb]:-mt-[5.5px] " +
  "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-layer-default [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-stroke-neutral-weak";

const track =
  "[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-(--pill) [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--bg-brand-solid)_var(--slider-pct),var(--bg-disabled)_var(--slider-pct))] " +
  "[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-(--pill) [&::-moz-range-track]:bg-bg-disabled [&::-moz-range-progress]:h-[3px] [&::-moz-range-progress]:rounded-(--pill) [&::-moz-range-progress]:bg-bg-brand-solid";

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  className = "",
  "aria-label": ariaLabel,
}: SliderProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <span className="type-body-small text-fg-neutral-muted text-right w-full">
          {label}
        </span>
      )}
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={{ "--slider-pct": `${pct}%` } as React.CSSProperties}
        className={`w-full h-4 appearance-none bg-transparent cursor-pointer ${track} ${thumb}`}
      />
    </div>
  );
}
