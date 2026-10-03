/**
 * 개인 갤러리 온보딩 단계 표시 — 들어온 길에 따라 칸이 다르다
 * 위치: src/app/(auth)/onboarding/personal/_components/PersonalSteps.tsx
 *
 * plan: "플랜 선택 · 갤러리 정보" (일반 진입 — 무료, 또는 등록해 둔 쿠폰으로 프로)
 * coupon: "쿠폰 등록 · 갤러리 정보" (선물 링크 진입)
 * 어느 길이든 두 칸이고 번호는 1부터 이어진다. 결제 칸은 카드 결제가 열릴 때 돌아온다(이슈 81).
 */

export type PersonalStep = "plan" | "coupon" | "gallery";
export type PersonalStepsVariant = "plan" | "coupon";

export function PersonalSteps({
  variant,
  current,
}: {
  variant: PersonalStepsVariant;
  current: PersonalStep;
}) {
  const items: [PersonalStep, string][] =
    variant === "coupon"
      ? [
          ["coupon", "쿠폰 등록"],
          ["gallery", "갤러리 정보"],
        ]
      : [
          ["plan", "플랜 선택"],
          ["gallery", "갤러리 정보"],
        ];
  const idx = items.findIndex(([key]) => key === current);

  return (
    <ol
      aria-label="진행 단계"
      className="mb-3.5 flex items-center gap-2 type-content-xs text-contents-light-bgd-weakness"
    >
      {items.map(([key, label], i) => {
        const done = i < idx;
        const on = i === idx;
        return (
          <li key={key} className="flex items-center gap-2">
            <span
              aria-current={on ? "step" : undefined}
              className={`grid size-5.5 place-items-center rounded-full border type-label-semibold-2xs transition-colors duration-fast ${
                on
                  ? "border-brand-primary-default bg-brand-primary-default text-contents-dark-bgd-default"
                  : done
                    ? "border-brand-secondary-background bg-brand-secondary-background text-brand-secondary-dark"
                    : "border-border-default text-contents-light-bgd-weakness"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            {i < items.length - 1 ? (
              <span aria-hidden className="h-px w-6 bg-border-default" />
            ) : (
              <span className="ml-1">{label}</span>
            )}
            {on && i < items.length - 1 && <span className="sr-only">{label}</span>}
          </li>
        );
      })}
    </ol>
  );
}
