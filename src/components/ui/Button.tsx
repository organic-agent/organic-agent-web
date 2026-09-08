/**
 * 공용 버튼 — 디자인 시스템 Button 컴포넌트 (피그마 Components/Button 대응)
 * 위치: src/components/ui/Button.tsx
 *
 * kind: primary(채움 — 주 액션·"작가에게 전달하기" 포함) | ghost(투명)
 * v2: accent(로즈) kind는 폐지됨 — 디자이너 시안에서 주 버튼은 brand/primary 하나
 * size: sm(32) | md(40) | lg(48)
 * href가 있으면 <Link>로, 없으면 <button>으로 렌더링한다.
 */

import Link from "next/link";
import type { ReactNode } from "react";

type ButtonKind = "primary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  kind?: ButtonKind;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

const base =
  "type-label-medium-m inline-flex items-center justify-center gap-2 rounded-(--pill) whitespace-nowrap cursor-pointer border-none transition-all duration-fast ease-out active:translate-y-px";

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-4",
  md: "h-10 px-5",
  lg: "h-12 px-6",
};

const kinds: Record<ButtonKind, string> = {
  primary:
    "bg-brand-primary-default text-contents-dark-bgd-default hover:bg-brand-primary-light hover:shadow-(--shadow-hover)",
  ghost:
    "bg-transparent text-contents-light-bgd-default hover:bg-surface-default-lightness",
};

const disabledKinds: Record<ButtonKind, string> = {
  primary: "bg-surface-default-light text-contents-light-bgd-disabled cursor-not-allowed",
  ghost: "bg-transparent text-contents-light-bgd-disabled cursor-not-allowed",
};

export function Button({
  children,
  href,
  kind = "primary",
  size = "md",
  icon,
  disabled = false,
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  const cls = `${base} ${sizes[size]} ${
    disabled ? disabledKinds[kind] : kinds[kind]
  } ${className}`;

  const content = (
    <>
      {children}
      {icon && (
        <span className="size-4 transition-transform duration-base ease-out group-hover:translate-x-0.75 [&>svg]:size-full">
          {icon}
        </span>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={`group ${cls}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={`group ${cls}`}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
}
