/**
 * 개인 갤러리 온보딩 단계 표시 — 고른 경로대로 칸이 바뀐다
 * 위치: src/app/(auth)/onboarding/personal/_components/PersonalSteps.tsx
 *
 * 유료 플랜을 고르면 "플랜 선택 · 결제 · 갤러리 정보" 세 칸, 무료(또는 아직 안 골랐으면)
 * "플랜 선택 · 갤러리 정보" 두 칸. 어느 경로든 번호가 1부터 빠짐없이 이어진다.
 */

export type PersonalStep = "plan" | "checkout" | "gallery";

export function PersonalSteps({
  paid,
  current,
}: {
  paid: boolean;
  current: PersonalStep;
}) {
  const items: [PersonalStep, string][] = paid
    ? [
        ["plan", "플랜 선택"],
        ["checkout", "결제"],
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
