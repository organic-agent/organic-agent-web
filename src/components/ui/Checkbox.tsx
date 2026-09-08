/**
 * 체크박스 — 피그마 Field/Checkbox + CheckboxField 대응 (16×16, 라운드 4)
 * 위치: src/components/ui/Checkbox.tsx
 *
 * native input 기반 controlled 컴포넌트 (키보드·스크린리더 접근성 유지).
 * unchecked: stroke.neutral-weak 보더 / checked: accent(로즈) 채움 + 흰 체크 — 체크 = "선택됨".
 */

type CheckboxProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Checkbox({
  checked,
  onChange,
  disabled = false,
  className = "",
}: CheckboxProps) {
  return (
    <span className={`relative inline-block size-4 shrink-0 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer absolute inset-0 size-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-(--radius-4) border border-border-default transition-colors duration-fast peer-checked:border-transparent peer-checked:bg-brand-primary-default peer-disabled:bg-surface-default-light peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-default"
      />
      {/* 체크 표시 (시안 원본 경로) */}
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="absolute inset-0 size-full opacity-0 transition-opacity duration-fast peer-checked:opacity-100 text-contents-dark-bgd-default"
      >
        <path
          d="M4 8.5L6.5 11L12 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

type CheckboxFieldProps = CheckboxProps & { label: string };

export function CheckboxField({
  label,
  className = "",
  ...checkbox
}: CheckboxFieldProps) {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer ${checkbox.disabled ? "cursor-not-allowed" : ""} ${className}`}
    >
      <Checkbox {...checkbox} />
      <span className="type-content-m text-contents-light-bgd-default">{label}</span>
    </label>
  );
}
