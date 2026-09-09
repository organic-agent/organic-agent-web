/**
 * 플랜 카드 — 라디오처럼 하나를 고른다. 0원 플랜은 점선 테두리의 무료 카드
 * 위치: src/app/(auth)/onboarding/personal/_components/PlanCard.tsx
 */

import { formatAmount, isFreePlan, type Plan } from "@/lib/api/payments";

export function PlanCard({
  plan,
  checked,
  onPick,
}: {
  plan: Plan;
  checked: boolean;
  onPick: () => void;
}) {
  const free = isFreePlan(plan);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onPick}
      className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-(--radius-12) border bg-background-default-main p-4 text-left transition-[border-color,box-shadow,translate] duration-fast ease-out hover:-translate-y-0.5 hover:border-brand-secondary-light hover:shadow-(--shadow-hover) aria-checked:border-brand-primary-default aria-checked:shadow-[inset_0_0_0_1px_var(--brand-primary-default)] ${
        free ? "border-dashed border-border-default" : "border-divider-default"
      }`}
    >
      <span
        aria-hidden
        className="absolute top-3 right-3 grid size-5 place-items-center rounded-full border-[1.5px] border-border-default transition-colors duration-fast group-aria-checked:border-brand-primary-default group-aria-checked:bg-brand-primary-default"
      >
        <span className="size-1.75 rounded-full bg-background-default-main opacity-0 group-aria-checked:opacity-100" />
      </span>
      <span className="type-label-semibold-m text-contents-light-bgd-default">{plan.name}</span>
      <span className="type-title-l text-contents-light-bgd-default tabular-nums">
        {formatAmount(plan.amount)}
        <span className="ml-0.5 type-content-xs text-contents-light-bgd-weakness">원</span>
      </span>
      <ul className="mt-1 flex flex-col gap-1 type-content-xs text-contents-light-bgd-sub">
        <li className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-brand-secondary-default" />
          보관 {plan.durationDays}일
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-brand-secondary-default" />
          사진 {formatAmount(plan.maxPhotoCount)}장까지
        </li>
      </ul>
    </button>
  );
}
