/**
 * 토글 스위치 — 피그마 Toggle(36×20) + Field/Toggle 대응
 * 위치: src/components/ui/Toggle.tsx
 *
 * on: brand-solid 트랙 / off: neutral-weak 트랙, 노브는 반전 전경색(테마 대응).
 */

type ToggleProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  "aria-label"?: string;
};

export function Toggle({
  checked,
  onChange,
  "aria-label": ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange?.(!checked)}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-(--pill) transition-colors duration-fast ${
        checked ? "bg-bg-brand-solid" : "bg-stroke-neutral-weak"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-fg-neutral-inverted transition-[left] duration-fast ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

type ToggleFieldProps = ToggleProps & {
  label: string;
  /** 라벨 우측 강조 값 (예: 디자인 탭의 "우리의 본식 촬영") */
  value?: string;
  /** 라벨 아래 설명 캡션 */
  description?: string;
};

export function ToggleField({
  label,
  value,
  description,
  ...toggle
}: ToggleFieldProps) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-3">
        <Toggle {...toggle} aria-label={label} />
        <span className="type-body-medium text-fg-neutral">{label}</span>
        {value && (
          <span className="type-label-button text-fg-neutral">{value}</span>
        )}
      </div>
      {description && (
        <p className="type-body-small text-fg-neutral-muted">{description}</p>
      )}
    </div>
  );
}
