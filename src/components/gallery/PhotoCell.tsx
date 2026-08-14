/**
 * 그리드 사진 셀 — 피그마 Image/Thumbnail(대형)·Image/Cell(소형+메타) 대응
 * 위치: src/components/gallery/PhotoCell.tsx
 *
 * 실제 이미지 연동 전까지 시안의 회색 플레이스홀더로 표시한다
 * (이미지 영역 회색은 전용 토큰이 없어 bg.disabled 값을 임시 차용 — 시안과 동일 값).
 * 클릭/더블클릭 동작은 호출부가 정한다 (부부: 클릭=선택 토글, 더블클릭=크게 보기 —
 * 라이트룸류 셀렉 툴 문법). selectable이면 호버 시 체크 표시가 나타나고,
 * 선택된 셀은 로즈 체크 상시 표시 + 로즈 테두리(stroke.accent — "선택 사진 테두리" 토큰)로 구분한다.
 */

import type { ReactNode } from "react";

type PhotoCellProps = {
  label: string;
  onClick?: () => void;
  /** 더블클릭 액션 (부부: 크게 보기) */
  onDoubleClick?: () => void;
  variant?: "large" | "small";
  /** 현재 포커스된 사진 (작가 화면 — 툴바·패널이 보고 있는 사진) — 살짝 확대 표시 */
  focused?: boolean;
  /** 소형(메타) 셀 좌측 라벨 — 파일명 등 */
  name?: string;
  /** 소형(메타) 셀 우측 라벨 — 포맷 등 */
  format?: string;
  /** 선택 가능한 셀 — 호버 체크 표시 + selected 상태 렌더링 (부부 전용) */
  selectable?: boolean;
  /** 선택 앨범에 담긴 상태 */
  selected?: boolean;
};

export function PhotoCell({
  label,
  onClick,
  onDoubleClick,
  variant = "large",
  focused = false,
  name,
  format,
  selectable = false,
  selected = false,
}: PhotoCellProps) {
  const focusRing = focused ? "scale-103 z-10 shadow-(--shadow-hover)" : "";
  const selectedRing = selected ? "border-2 border-stroke-accent" : "";
  const cls =
    variant === "large"
      ? `group relative block w-full aspect-4/5 rounded-(--radius-4) bg-bg-disabled transition-[opacity,transform] duration-fast hover:opacity-90 cursor-pointer ${focusRing} ${selectedRing}`
      : `group relative flex w-full flex-col gap-2 rounded-(--radius-4) bg-bg-layer-default-hover p-3 text-left transition-[opacity,transform] duration-fast hover:opacity-90 cursor-pointer ${focusRing} ${selectedRing}`;

  const content: ReactNode =
    variant === "large" ? null : (
      <>
        <span className="flex w-full items-center justify-between type-body-small text-fg-neutral-muted">
          <span>{name}</span>
          <span>{format}</span>
        </span>
        <span className="block w-full aspect-4/5 bg-bg-disabled" />
      </>
    );

  // 선택 상태 표시 — 별도 버튼이 아니라 셀 자체가 토글이므로 시각 표시만 담당
  const selectIndicator = selectable ? (
    <span
      aria-hidden
      className={`absolute z-10 grid size-6 place-items-center rounded-full border transition-opacity duration-fast ${
        variant === "large" ? "left-2 top-2" : "left-5 top-10"
      } ${
        selected
          ? "border-transparent bg-bg-accent-solid text-fg-neutral-inverted opacity-100"
          : "border-stroke-neutral-weak bg-bg-layer-default/90 text-fg-neutral-subtle opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 8.5L6.5 11L12 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-label={label}
      aria-pressed={selectable ? selected : undefined}
      className={cls}
    >
      {content}
      {selectIndicator}
    </button>
  );
}
