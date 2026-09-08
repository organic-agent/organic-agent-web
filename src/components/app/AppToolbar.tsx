/**
 * 앱 하단 툴바 골격 — 피그마 App/Toolbar 대응 (h48, 패딩 좌우 16, 좌·중·우 슬롯)
 * 위치: src/components/app/AppToolbar.tsx
 *
 * 좌측: 진행 카운트(예: "12 / 57") / 중앙: 별점 / 우측: 줌 컨트롤 — 내용물은 화면이 조립.
 */

import type { ReactNode } from "react";

export function AppToolbar({
  left,
  center,
  right,
  className = "",
}: {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={`flex h-12 shrink-0 items-center justify-between px-4 bg-background-default-main border-t border-divider-default ${className}`}
    >
      <div className="flex items-center gap-1">{left}</div>
      <div className="flex items-center gap-1">{center}</div>
      <div className="flex items-center gap-1">{right}</div>
    </footer>
  );
}
