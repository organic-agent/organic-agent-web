/**
 * 정보 행 — 피그마 Item/InfoRow 대응 (라벨·값, gray.100 배경 칩)
 * 위치: src/components/ui/InfoRow.tsx
 *
 * 배경은 전용 토큰이 없어 layer-default-hover 값(gray.100)을 차용 — 시안과 동일 값.
 */

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-(--radius-4) bg-bg-layer-default-hover px-2 py-1">
      <span className="shrink-0 type-body-small text-fg-neutral-muted">
        {label}
      </span>
      <span className="truncate type-body-small text-fg-neutral">{value}</span>
    </div>
  );
}
