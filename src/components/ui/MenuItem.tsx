/**
 * 메뉴 아이템 — 피그마 Item/Menuitem 대응 (px12·py8·라운드4, 아이콘 20 옵션 + 라벨 + 카운트)
 * 위치: src/components/ui/MenuItem.tsx
 *
 * 사이드바 앨범 내비 등에 사용.
 * selected: 현재 항목 — hover 배경 + 왼쪽 로즈 인디케이터 바(hover와 구분)
 * accentCount: 카운트를 로즈로 강조 (셀렉 수치 문법 — 예: 선택 사진 34/50)
 */

import type { ReactNode } from "react";

type MenuItemProps = {
  label: string;
  icon?: ReactNode;
  count?: string | number;
  /** 카운트를 로즈(fg.accent)로 — 선택 수치 표시용 */
  accentCount?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function MenuItem({
  label,
  icon,
  count,
  accentCount = false,
  selected = false,
  onClick,
  className = "",
}: MenuItemProps) {
  const cls = `flex items-center gap-2 w-full px-3 py-2 rounded-(--radius-4) text-left cursor-pointer transition-colors duration-fast ease-out hover:bg-surface-default-lightness ${
    selected
      ? "bg-surface-default-lightness relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-light"
      : ""
  } ${className}`;

  const content = (
    <>
      {icon && (
        <span className="shrink-0 text-contents-light-bgd-default flex items-center justify-center">
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0 truncate type-content-m text-contents-light-bgd-default">
        {label}
      </span>
      {count !== undefined && (
        <span
          className={`shrink-0 type-content-xs ${
            accentCount ? "text-brand-secondary-dark" : "text-contents-light-bgd-sub"
          }`}
        >
          {count}
        </span>
      )}
    </>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      aria-pressed={selected || undefined}
    >
      {content}
    </button>
  );
}
