/**
 * 아바타 — 피그마 Avatar 대응 (회색 원 + 이니셜, 기본 28px / large 40px)
 * 위치: src/components/ui/Avatar.tsx
 */

export function Avatar({
  initial,
  large = false,
  className = "",
}: {
  initial: string;
  /** 프로필 메뉴 헤더용 40px */
  large?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-default-light text-contents-light-bgd-default ${
        large ? "size-10 type-content-l" : "size-7 type-content-xs"
      } ${className}`}
    >
      {initial}
    </span>
  );
}
