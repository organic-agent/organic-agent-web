/**
 * 공용 버튼 (variant·size로 모양을 바꾸는 UI 컴포넌트)
 * 위치: src/components/ui/Button.tsx
 *
 * href가 있으면 <Link>로, 없으면 <button>으로 렌더링한다.
 */

import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "dark" | "outline" | "accent" | "ghost";
type ButtonSize = "md" | "sm" | "lg";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

const base =
  "inline-flex items-center justify-center gap-[7px] rounded-pill font-medium tracking-tight whitespace-nowrap cursor-pointer border-none transition-all duration-fast ease-out active:translate-y-px";

const sizes: Record<ButtonSize, string> = {
  lg: "h-[52px] px-7 text-[15px]",
  md: "h-12 px-6 text-sm",
  sm: "h-[42px] px-[18px] text-[13px]",
};

const variants: Record<ButtonVariant, string> = {
  dark: "bg-ink text-on-ink hover:-translate-y-px hover:bg-[#333] hover:shadow-[0_4px_14px_rgba(0,0,0,0.15)]",
  outline:
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-on-ink",
  accent:
    "bg-accent-deep text-white hover:-translate-y-px hover:bg-accent-press hover:shadow-[0_4px_14px_rgba(168,91,98,0.3)]",
  ghost: "bg-transparent text-ink-2 hover:text-ink hover:bg-paper-deep",
};

export function Button({
  children,
  href,
  variant = "dark",
  size = "md",
  icon,
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  const content = (
    <>
      {children}
      {icon && (
        <span className="transition-transform duration-base ease-out group-hover:translate-x-[3px]">
          {icon}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`group ${cls}`}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={`group ${cls}`} onClick={onClick}>
      {content}
    </button>
  );
}
