/**
 * 아이콘 버튼 — 피그마 IconButton 대응 (32×32, 내부 아이콘 24)
 * 위치: src/components/ui/IconButton.tsx
 *
 * selected: 토글형 버튼의 켜짐 상태 — hover와 같은 회색 배경 (수민 결정: 로즈 배경 대신
 * 회색 통일. 좋아요처럼 색으로 상태를 말해야 하면 아이콘 쪽에서 fill·색을 준다)
 */

import type { ReactNode } from "react";

type IconButtonProps = {
  icon: ReactNode;
  "aria-label": string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function IconButton({
  icon,
  selected = false,
  onClick,
  className = "",
  "aria-label": ariaLabel,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected || undefined}
      className={`inline-flex items-center justify-center p-1 rounded-(--radius-4) text-contents-light-bgd-default cursor-pointer transition-colors duration-fast ease-out hover:bg-surface-default-lightness ${
        selected ? "bg-surface-default-lightness" : ""
      } ${className}`}
    >
      {icon}
    </button>
  );
}
