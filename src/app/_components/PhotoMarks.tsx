/**
 * 사진 위 표시 — 랜딩에서 제품의 표시(체크 · 핀 · 별점 줄 · 좋아요 · 댓글 · 요청)를 그대로 그린다(이슈 182)
 * 위치: src/app/_components/PhotoMarks.tsx
 *
 * 랜딩의 개념이 "모든 셀렉은 사진 위에서"라 히어로 · 문제 제기 · 함께 고르기 · 마무리가 같은 표시를 쓴다.
 * 모두 그림이다(동작 없음) — 모양만 제품(PhotoGrid CheckMark · RetouchPins · 크게 보기 별점 줄 · 게스트 댓글)을 따른다.
 * 감싼 쪽이 aria-hidden을 맡는다.
 */

import type { ReactNode } from "react";
import { HeartFillIcon, StarFillIcon, StarIcon } from "@/components/icons";

/** 사람 이니셜 색 — 신부 a · 신랑 b · 엄마 c · 언니 d(브랜드 보라 계열 + 검정만) */
const TONES = {
  a: "bg-brand-secondary-light text-brand-on-fill",
  b: "bg-brand-secondary-dark text-brand-on-fill",
  c: "bg-brand-secondary-lightness text-brand-secondary-dark",
  d: "bg-brand-primary-default text-brand-on-fill",
} as const;
export type MarkTone = keyof typeof TONES;

export function Initial({ tone, small = false, children }: { tone: MarkTone; small?: boolean; children: ReactNode }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${small ? "size-5.5 text-[10px]" : "size-7 text-xs"} ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

function CheckPath({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  );
}

/** 고른 사진의 체크 — PhotoGrid CheckMark(선택됨) 모양 */
export function TileCheck({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid size-5.5 place-items-center rounded-(--radius-4) border border-contents-dark-bgd-default bg-surface-default-dark text-contents-dark-bgd-default ${className}`}
    >
      <CheckPath className="size-3.5" />
    </span>
  );
}

/** 보정 요청 핀 — 보라 원 + 흰 테 */
export function PinMark({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span
      className={`grid size-7 place-items-center rounded-full bg-brand-accent-default text-[13px] font-bold text-brand-on-fill ring-3 ring-background-default-main shadow-(--shadow-hover) ${className}`}
    >
      {n}
    </span>
  );
}

/** 크게 보기의 별점 줄 — 매긴 별은 연보라, 오른쪽에 선택 칩(picked가 false면 고르기 전 모양 · 체크 없음) */
export function RatingBar({
  score,
  label = "선택됨",
  picked = true,
  className = "",
}: {
  score: number;
  label?: string;
  picked?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-(--pill) bg-surface-default-darkness py-1.5 pr-1.5 pl-3 whitespace-nowrap ${className}`}>
      {[1, 2, 3, 4, 5].map((k) =>
        k <= score ? (
          <StarFillIcon key={k} size={18} className="text-brand-secondary-lightness" />
        ) : (
          <StarIcon key={k} size={18} className="text-contents-dark-bgd-weakness" />
        ),
      )}
      <span
        className={`ml-2 inline-flex h-7 items-center gap-1 rounded-(--pill) px-3 type-label-semibold-s motion-safe:transition-colors motion-safe:duration-300 ${
          picked ? "bg-brand-accent-default text-brand-on-fill" : "bg-surface-inverse-light text-contents-dark-bgd-default"
        }`}
      >
        {picked && <CheckPath className="size-3.5" />}
        {label}
      </span>
    </span>
  );
}

/** 공유 링크 좋아요 수 */
export function LikeChip({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-(--pill) bg-background-default-main px-2 type-label-semibold-xs text-brand-accent-text ${className}`}>
      <HeartFillIcon size={14} className="text-brand-accent-default" />
      {count}
    </span>
  );
}

/** 사진에 달린 댓글 한 줄 */
export function CommentChip({ who, tone, children, className = "" }: { who: string; tone: MarkTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-(--radius-12) bg-background-default-main py-1 pr-2.5 pl-1 type-label-medium-s whitespace-nowrap text-contents-light-bgd-default shadow-(--shadow-hover) ${className}`}
    >
      <Initial tone={tone} small>
        {who}
      </Initial>
      <span className="truncate">{children}</span>
    </span>
  );
}

/** 핀 번호가 붙은 보정 요청 한 줄 */
export function RequestChip({ n, children, className = "" }: { n: number; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-(--radius-8) bg-background-default-main py-1 pr-2.5 pl-1 type-label-medium-s whitespace-nowrap text-contents-light-bgd-default shadow-(--shadow-hover) ${className}`}
    >
      <span className="grid size-5 place-items-center rounded-full bg-brand-accent-default text-[11px] font-bold text-brand-on-fill">{n}</span>
      {children}
    </span>
  );
}
