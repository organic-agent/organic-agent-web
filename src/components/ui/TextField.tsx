/**
 * 텍스트 인풋 — 피그마 Field 대응 (기본 h32·라운드8·px12)
 * 위치: src/components/ui/TextField.tsx
 *
 * 상태: 기본 neutral-weak 보더 / focus 검정 2px / error critical 2px (시안 값).
 * 2px 강조는 ring으로 그려 레이아웃 밀림이 없다. 높이는 className으로 오버라이드(예: h-12).
 * 날짜 칸(type="date")은 max를 주지 않으면 9999-12-31로 막는다 — 브라우저 날짜 입력은 최대 날짜가 없으면 연도를
 * 6자리까지 받아, 20261020을 이어 적으면 202610이 연도가 되고 월 · 일로 넘어가지 않는다(QA BUG-76).
 */

/** 날짜 칸의 기본 최대 날짜 — 연도를 4자리로 끝내 월로 넘어가게 한다 */
const DATE_MAX = "9999-12-31";

type TextFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  type?: "text" | "date" | "number" | "email";
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  /** number는 숫자, date는 "YYYY-MM-DD" */
  min?: number | string;
  max?: number | string;
  "aria-label"?: string;
  /** <label htmlFor>와 연결할 때 */
  id?: string;
  /** 브라우저 자동완성 힌트 (예: organization, tel) */
  autoComplete?: string;
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
  max,
  className = "",
  "aria-label": ariaLabel,
  id,
  autoComplete,
}: TextFieldProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      autoComplete={autoComplete}
      min={min}
      max={max ?? (type === "date" ? DATE_MAX : undefined)}
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
