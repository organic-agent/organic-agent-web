/**
 * 스텝 슬라이더 — 피그마 Field/StepSlider 대응 (시안 v5 확정)
 * 위치: src/components/ui/StepSlider.tsx
 *
 * 자유 이동 대신 눈금(기본 5개)에 스냅한다. 하단 단계 라벨은 없다 —
 * 눈금 위치가 곧 값이고, 필요한 쪽(시간)만 우측 상단 값 라벨을 쓴다.
 * 트랙 2px, 지나온 눈금은 검정·남은 눈금은 회색, 썸 14px 흰 원 + 검정 보더.
 *
 * 구현: 시각 요소(트랙·눈금·썸)는 직접 그리고, 투명한 native range가
 * 위에서 드래그·클릭·키보드(←→ 한 단계)를 받는다.
 */

type StepSliderProps = {
  /** 현재 단계 (0 ~ steps-1) */
  index: number;
  /** 단계 수 (기본 5) */
  steps?: number;
  onChange?: (index: number) => void;
  /** 우측 상단 값 라벨 — 시간처럼 값 표기가 필요한 경우에만 */
  label?: string;
  "aria-label": string;
  className?: string;
};

export function StepSlider({
  index,
  steps = 5,
  onChange,
  label,
  className = "",
  "aria-label": ariaLabel,
}: StepSliderProps) {
  const clamped = Math.min(Math.max(index, 0), steps - 1);
  const pct = steps <= 1 ? 0 : (clamped / (steps - 1)) * 100;

  return (
    <div className={`flex w-full flex-col gap-1 ${className}`}>
      {label !== undefined && (
        <div className="flex justify-end">
          <span className="type-body-small text-fg-neutral-muted">{label}</span>
        </div>
      )}
      <div className="relative h-4 w-full">
        <input
          type="range"
          min={0}
          max={steps - 1}
          step={1}
          value={clamped}
          aria-label={ariaLabel}
          aria-valuetext={label}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="peer absolute inset-0 z-10 w-full cursor-pointer opacity-0"
        />
        <span className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 rounded-(--pill) bg-bg-disabled" />
        <span
          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-(--pill) bg-bg-brand-solid"
          style={{ width: `${pct}%` }}
        />
        {Array.from({ length: steps }, (_, i) => (
          <span
            key={i}
            className={`absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              i <= clamped ? "bg-bg-brand-solid" : "bg-stroke-neutral-weak"
            }`}
            style={{ left: `${steps <= 1 ? 0 : (i / (steps - 1)) * 100}%` }}
          />
        ))}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fg-neutral bg-bg-layer-default shadow-[0_1px_3px_rgba(0,0,0,0.15)] peer-focus-visible:ring-2 peer-focus-visible:ring-stroke-neutral-weak"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
