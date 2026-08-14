/**
 * 탭 아이템 — 피그마 Item/TabItem 대응 (active: 하단 2px 보더 + 진한 텍스트)
 * 위치: src/components/ui/TabItem.tsx
 */

export function TabItem({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 cursor-pointer border-b-2 px-1 py-2 type-label-button transition-colors duration-fast ${
        active
          ? "border-fg-neutral text-fg-neutral"
          : "border-transparent text-fg-neutral-muted hover:text-fg-neutral"
      }`}
    >
      {label}
    </button>
  );
}
