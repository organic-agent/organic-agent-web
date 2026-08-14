/**
 * 패널 헤더 — 피그마 Panel/Header 대응 (좌: 아이콘16+제목, 우: 액션 슬롯)
 * 위치: src/components/ui/PanelHeader.tsx
 *
 * 사이드바·정보 패널의 섹션 소제목. 제목은 utility.panel 타이포(12 semibold 대문자).
 */

import type { ReactNode } from "react";

type PanelHeaderProps = {
  children: ReactNode;
  /** 좌측 16px 아이콘 (예: <SparkleIcon size={16} />) */
  icon?: ReactNode;
  /** 우측 슬롯 (접기 토글 등) */
  action?: ReactNode;
  className?: string;
};

export function PanelHeader({
  children,
  icon,
  action,
  className = "",
}: PanelHeaderProps) {
  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      <div className="flex items-center gap-2 text-fg-neutral">
        {icon}
        <span className="type-utility-panel">{children}</span>
      </div>
      {action}
    </div>
  );
}
