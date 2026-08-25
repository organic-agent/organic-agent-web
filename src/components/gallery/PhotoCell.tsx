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
  /**
   * 폴더 관리용 다중 선택 상태 — 어두운 딤으로 표시 (이슈 #31).
   * 셀렉(로즈 체크·테두리)과 다른 문법이라 겹쳐 읽히지 않는다.
   * 부부 화면 전용 — 작가 화면은 managed(체크+검정 테두리)를 쓴다.
   */
  dimmed?: boolean;
  /**
   * 작가 관리 선택 상태 — 좌상단 검정 체크 + 검정 테두리 (#39 확정).
   * 작가 화면엔 셀렉(로즈)이 없어 체크 문법을 중립색으로 쓴다.
   */
  managed?: boolean;
  /** 서명된 조회 URL — 없으면 회색 플레이스홀더(연동 전 화면과 동일) */
  imageUrl?: string | null;
  /** 파생 JPEG 준비 전 — 물결 + 아이콘만 (시안 v5, 문구 없음) */
  preparing?: boolean;
  /** 이미지 로드 실패(서명 URL 만료 등) 폴백 */
  onImageError?: () => void;
};

/** 준비 중 표현 — 물결(shimmer) + 사진 아이콘, 문구 없음 (시안 v5 확정) */
function PreparingFill() {
  return (
    <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <span className="shimmer-sweep" />
      <span className="absolute inset-0 grid place-items-center text-fg-neutral-subtle">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </span>
    </span>
  );
}

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
  dimmed = false,
  managed = false,
  imageUrl,
  preparing = false,
  onImageError,
}: PhotoCellProps) {
  const focusRing = focused ? "scale-103 z-10 shadow-(--shadow-hover)" : "";
  const selectedRing = selected
    ? "border-2 border-stroke-accent"
    : managed
      ? "border-2 border-bg-neutral-inverted"
      : "";
  const cls =
    variant === "large"
      ? `group relative block w-full aspect-4/5 rounded-(--radius-4) bg-bg-disabled transition-[opacity,transform] duration-fast hover:opacity-90 cursor-pointer overflow-hidden ${focusRing} ${selectedRing}`
      : `group relative flex w-full flex-col gap-2 rounded-(--radius-4) bg-bg-layer-default-hover p-3 text-left transition-[opacity,transform] duration-fast hover:opacity-90 cursor-pointer ${focusRing} ${selectedRing}`;

  // 이미지 영역: 준비 중(물결+아이콘) > 실사진 > 회색 플레이스홀더
  const imageFill: ReactNode = preparing ? (
    <PreparingFill />
  ) : imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      onError={onImageError}
      className="absolute inset-0 size-full rounded-[inherit] object-cover"
    />
  ) : null;

  const content: ReactNode =
    variant === "large" ? (
      imageFill
    ) : (
      <>
        <span className="flex w-full items-center justify-between type-body-small text-fg-neutral-muted">
          <span className="truncate">{name}</span>
          <span className="shrink-0 pl-2">{format}</span>
        </span>
        <span className="relative block w-full aspect-4/5 overflow-hidden rounded-(--radius-4) bg-bg-disabled">
          {imageFill}
        </span>
      </>
    );

  // 관리 선택 표시 — 좌상단 검정 체크 (부부 셀렉의 로즈 체크와 같은 자리, 중립색)
  const managedIndicator = managed ? (
    <span
      aria-hidden
      className={`absolute z-10 grid size-6 place-items-center rounded-full bg-bg-neutral-inverted text-fg-neutral-inverted ${
        variant === "large" ? "left-2 top-2" : "left-5 top-10"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
      aria-pressed={selectable ? selected : managed || undefined}
      className={cls}
    >
      {content}
      {dimmed && (
        <span
          aria-hidden
          className="absolute inset-0 z-10 rounded-[inherit] bg-[rgba(23,23,23,0.45)]"
        />
      )}
      {managedIndicator}
      {selectIndicator}
    </button>
  );
}
