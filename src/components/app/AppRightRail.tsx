/**
 * 우측 레일 골격 — 피그마 App/RightRail 세트(role=app/guest) 대응 (w40)
 * 위치: src/components/app/AppRightRail.tsx
 *
 * 패널을 여닫는 IconButton들이 children으로 들어온다.
 * footer가 있으면 게스트 레일처럼 위(children)/아래(footer)로 나눠 정렬한다.
 */

import type { ReactNode } from "react";

export function AppRightRail({
  children,
  footer,
  className = "",
}: {
  children: ReactNode;
  /** 하단 고정 슬롯 (예: 게스트의 좋아요 버튼) — 있으면 justify-between 배치 */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={`flex w-10 shrink-0 flex-col items-center ${
        footer ? "justify-between" : "justify-end"
      } gap-1 bg-bg-layer-default border-l border-stroke-neutral-muted px-1 py-2 ${className}`}
    >
      {footer ? (
        <div className="flex flex-col items-center gap-1">{children}</div>
      ) : (
        children
      )}
      {footer}
    </aside>
  );
}
