/**
 * 셀렉 현황 진행 바 — 피그마 Field/ProgressBar 대응 (라벨 줄 + 4px 바)
 * 채움·카운트는 로즈(accent) — "선택이 쌓여가는" 지표라 선택 강조 전용색을 쓴다.
 * 위치: src/components/photographer/GalleryProgress.tsx
 *
 * target이 없으면(계약 장수 제한 없음) 분모가 없어 비율을 그릴 수 없다 —
 * 바 없이 "n장 선택" 카운트만 보여준다. 계약 축소로 selected가 target을
 * 넘는 예외에 대비해 바는 100%에서 클램프한다.
 */

export function GalleryProgress({
  selected,
  target,
  className = "",
}: {
  selected: number;
  /** 계약 장수. null이면 제한 없음 — 카운트만 표시. */
  target: number | null;
  className?: string;
}) {
  const pct =
    target !== null && target > 0
      ? Math.min(100, Math.round((selected / target) * 100))
      : 0;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between px-1 type-body-small">
        <span className="text-fg-neutral-muted">셀렉 현황</span>
        <span className="text-fg-accent">
          {target !== null ? `${selected} / ${target}` : `${selected}장 선택`}
        </span>
      </div>
      {target !== null && (
        <div className="h-1 w-full overflow-hidden rounded-(--pill) bg-bg-disabled">
          {pct > 0 && (
            <div
              className="h-full rounded-(--pill) bg-bg-accent-solid"
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      )}
    </div>
  );
}
