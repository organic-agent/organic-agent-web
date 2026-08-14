/**
 * 셀렉 현황 진행 바 — 피그마 Field/ProgressBar 대응 (라벨 줄 + 4px 바)
 * 채움·카운트는 로즈(accent) — "선택이 쌓여가는" 지표라 선택 강조 전용색을 쓴다.
 * 위치: src/components/photographer/GalleryProgress.tsx
 *
 * 시드는 selected ≤ target을 지키지만, 예외 데이터에 대비해 바는 100%에서 클램프한다.
 * (selected의 의미는 별점 기반 재설계 때 재정의 예정)
 */

export function GalleryProgress({
  selected,
  target,
  className = "",
}: {
  selected: number;
  target: number;
  className?: string;
}) {
  const pct =
    target > 0 ? Math.min(100, Math.round((selected / target) * 100)) : 0;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between px-1 type-body-small">
        <span className="text-fg-neutral-muted">셀렉 현황</span>
        <span className="text-fg-accent">
          {selected} / {target}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-(--pill) bg-bg-disabled">
        {pct > 0 && (
          <div
            className="h-full rounded-(--pill) bg-bg-accent-solid"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
