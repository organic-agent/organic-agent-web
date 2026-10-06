/**
 * 플랜 카드 — 라디오처럼 하나를 고른다. 무료는 점선 테두리(고르면 실선), 잠긴 카드는 흐리게 + 꼬리표
 * 위치: src/app/(auth)/onboarding/personal/_components/PlanCard.tsx
 *
 * 꼬리표(tag)는 왜 못 고르는지 한 마디 — "이미 사용함"(무료 소진) · "결제 준비 중"(프로, 카드 결제 전)는 회색,
 * 고를 수 있는 이유 "쿠폰 등록됨"은 브랜드 올리브(tagTone "brand" — D-day 칩 · 사이드바 플랜 카드와 같은 토큰).
 * 가격 · 기간 · 장수는 서버 플랜 값으로(프로 가격만 결정값, payments 참고).
 */

import {
  formatAmount,
  isFreePlan,
  planAmount,
  planDurationLabel,
  type Plan,
} from "@/lib/api/payments";

export function PlanCard({
  plan,
  checked,
  disabled = false,
  tag = null,
  tagTone = "muted",
  onPick,
}: {
  plan: Plan;
  checked: boolean;
  /** 고를 수 없는 카드 — 흐리게, 호버 없음 */
  disabled?: boolean;
  /** 카드 머리 오른쪽 꼬리표 */
  tag?: string | null;
  /** muted = 잠긴 이유(회색) · brand = 고를 수 있는 이유(올리브) */
  tagTone?: "muted" | "brand";
  onPick: () => void;
}) {
  const free = isFreePlan(plan);
  const border = free
    ? checked
      ? "border-border-default"
      : "border-dashed border-border-default"
    : "border-divider-default";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onPick}
      className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-(--radius-12) border bg-background-default-main p-4 text-left transition-[border-color,box-shadow,translate] duration-fast ease-out hover:-translate-y-0.5 hover:border-brand-secondary-light hover:shadow-(--shadow-hover) aria-checked:border-brand-primary-default aria-checked:shadow-[inset_0_0_0_1px_var(--brand-primary-default)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:border-border-default disabled:hover:shadow-none ${border}`}
    >
      {tag && (
        <span
          className={`absolute top-3 right-10 rounded-(--pill) px-2 py-0.5 type-label-semibold-2xs ${
            tagTone === "brand"
              ? "bg-brand-secondary-background text-brand-secondary-dark"
              : "bg-surface-default-light text-contents-light-bgd-sub"
          }`}
        >
          {tag}
        </span>
      )}
      <span
        aria-hidden
        className="absolute top-3 right-3 grid size-5 place-items-center rounded-full border-[1.5px] border-border-default transition-colors duration-fast group-aria-checked:border-brand-primary-default group-aria-checked:bg-brand-primary-default"
      >
        <span className="size-1.75 rounded-full bg-background-default-main opacity-0 group-aria-checked:opacity-100" />
      </span>
      <span className="type-label-semibold-m text-contents-light-bgd-default">{plan.name}</span>
      <span className="type-title-l text-contents-light-bgd-default tabular-nums">
        {formatAmount(planAmount(plan))}
        <span className="ml-0.5 type-content-xs text-contents-light-bgd-weakness">원</span>
      </span>
      <ul className="mt-1 flex flex-col gap-1 type-content-xs text-contents-light-bgd-sub">
        <li className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-brand-secondary-default" />
          이용 기간 {planDurationLabel(plan)}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-brand-secondary-default" />
          사진 {formatAmount(plan.maxPhotoCount)}장까지
        </li>
        {plan.oncePerAccount && (
          <li className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-brand-secondary-default" />
            계정당 한 번
          </li>
        )}
      </ul>
    </button>
  );
}
