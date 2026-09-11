/**
 * 하단 바 진행 막대 — "업로드 134 / 200 · 약 2분" 같은 한 칸. 두 개(업로드 · AI 분석)를 나란히 둔다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/UploadProgress.tsx
 *
 * 채움색은 상태 표시 색(brand/secondary 올리브). 비율이 null이면 아직 셀 수 없어 막대를 비워 둔다.
 */

import type { ReactNode } from "react";

export function ProgressBar({
  icon,
  title,
  ratio,
  sub,
  tone = "default",
}: {
  icon: ReactNode;
  /** "업로드 134 / 200" */
  title: ReactNode;
  /** 0~1. null이면 빈 막대 */
  ratio: number | null;
  /** "약 2분 · 1장 실패" */
  sub?: ReactNode;
  tone?: "default" | "warning";
}) {
  const percent = ratio === null ? 0 : Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={`flex shrink-0 ${tone === "warning" ? "text-function-warning-default" : "text-brand-secondary-dark"}`}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-baseline gap-2 whitespace-nowrap">
          <b className="type-label-semibold-s text-contents-light-bgd-default tabular-nums">{title}</b>
          {sub && <span className="type-content-xs text-contents-light-bgd-weakness">{sub}</span>}
        </span>
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ratio === null ? undefined : percent}
          className="block h-1 w-52 overflow-hidden rounded-(--pill) bg-surface-default-light"
        >
          <span
            className={`block h-full rounded-(--pill) transition-[width] duration-base ${
              tone === "warning" ? "bg-function-warning-default" : "bg-brand-secondary-default"
            }`}
            style={{ width: `${percent}%` }}
          />
        </span>
      </div>
    </div>
  );
}
