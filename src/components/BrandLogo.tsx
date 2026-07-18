/**
 * 서비스 로고 심볼 (뷰파인더 프레임 + 가운데 다이아몬드)
 * 위치: src/components/BrandLogo.tsx
 *
 * 색은 currentColor를 따르므로 부모의 text 색상 클래스(className)로 제어한다.
 */

export function BrandLogo({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
    >
      {/* 네 모서리 뷰파인더 프레임 */}
      <path
        d="M7 12.5V7h5.5M19.5 7H25v5.5M25 19.5V25h-5.5M12.5 25H7v-5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {/* 가운데 다이아몬드 */}
      <path d="M16 12l4 4-4 4-4-4z" fill="currentColor" />
    </svg>
  );
}
