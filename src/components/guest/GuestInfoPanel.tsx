/**
 * 게스트 정보 패널 — 피그마 Guest/PanelInfo 대응 (240px: 사진 메타데이터)
 * 위치: src/components/guest/GuestInfoPanel.tsx
 */

import { InfoRow } from "@/components/ui/InfoRow";

export function GuestInfoPanel({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-3 overflow-y-auto border-l border-divider-default bg-background-default-main p-4">
      <span className="type-label-semibold-xs text-contents-light-bgd-default">정보</span>
      <div className="h-px w-full shrink-0 bg-divider-default" />
      <div className="flex w-full flex-col gap-1">
        {rows.map((row) => (
          <InfoRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </aside>
  );
}
