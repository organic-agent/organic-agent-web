/**
 * 텍스트 인풋 — 피그마 Field 대응 (기본 h32·라운드8·px12)
 * 위치: src/components/ui/TextField.tsx
 *
 * 상태: 기본 neutral-weak 보더 / focus 검정 2px / error critical 2px (시안 값).
 * 2px 강조는 ring으로 그려 레이아웃 밀림이 없다. 높이는 className으로 오버라이드(예: h-12).
 */

type TextFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  type?: "text" | "date" | "number" | "email";
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  min?: number;
  "aria-label"?: string;
  className?: string;
};

export function TextField({
  value,
  onChange,
  type = "text",
  placeholder,
  error = false,
  disabled = false,
  min,
  className = "",
  "aria-label": ariaLabel,
}: TextFieldProps) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={error || undefined}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={`h-8 w-full rounded-(--radius-8) border bg-background-default-main px-3 type-content-m text-contents-light-bgd-default outline-none transition-colors duration-fast placeholder:text-contents-light-bgd-sub disabled:cursor-not-allowed disabled:border-divider-default disabled:text-contents-light-bgd-disabled ${
        error
          ? "border-function-error-default ring-1 ring-function-error-default"
          : "border-border-default focus:border-contents-light-bgd-default focus:ring-1 focus:ring-contents-light-bgd-default"
      } ${className}`}
    />
  );
}
