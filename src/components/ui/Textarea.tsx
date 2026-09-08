/**
 * 텍스트영역 — 피그마 Field/Textarea 대응 (라운드 8, 패딩 12, neutral-weak 보더)
 * 위치: src/components/ui/Textarea.tsx
 */

type TextareaProps = {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  "aria-label": string;
  className?: string;
};

export function Textarea({
  value,
  onChange,
  placeholder,
  className = "",
  "aria-label": ariaLabel,
}: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`w-full resize-none rounded-(--radius-8) border border-border-default bg-background-default-main p-3 type-content-m text-contents-light-bgd-default outline-none transition-colors duration-fast placeholder:text-contents-light-bgd-sub focus:border-contents-light-bgd-default ${className}`}
    />
  );
}
