/**
 * 플랜 표시 카탈로그 — 서버가 플랜을 하나(테스트 플랜)만 주는 동안 시안과 같은 카드를 보여준다
 * 위치: src/app/(auth)/onboarding/personal/_lib/planCatalog.ts
 *
 * 서버가 플랜을 2개 이상 주면 그대로 쓰고 이 카탈로그는 쓰이지 않는다.
 * 하나뿐이면 무료·스탠다드·프로 카드를 보여주되, 어느 카드를 골라도 결제는 서버의 그 플랜으로
 * 나간다(테스트 결제라 실제 돈은 없다). 백엔드에 0원 플랜과 유료 플랜 2개를 요청한 상태이며,
 * 그것이 들어오면 이 파일은 지운다. 숫자는 시안 자리표시 값이다.
 */

import type { Plan, PlansResponse } from "@/lib/api/payments";

/** 화면에 그리는 플랜 — 결제 요청에 쓸 서버 플랜 id를 따로 든다 */
export type DisplayPlan = Plan & { checkoutPlanId: string };

const DEMO_CATALOG: Omit<Plan, "id" | "currency">[] = [
  { name: "무료", amount: 0, durationDays: 30, maxPhotoCount: 100 },
  { name: "스탠다드", amount: 19900, durationDays: 90, maxPhotoCount: 2000 },
  { name: "프로", amount: 39900, durationDays: 180, maxPhotoCount: 5000 },
];

export function resolvePlans(res: PlansResponse): { plans: DisplayPlan[]; demo: boolean } {
  if (res.plans.length >= 2) {
    return { plans: res.plans.map((p) => ({ ...p, checkoutPlanId: p.id })), demo: false };
  }
  const base = res.plans[0];
  if (!base) return { plans: [], demo: false };
  return {
    demo: true,
    plans: DEMO_CATALOG.map((p, i) => ({
      ...p,
      id: `demo-${i}`,
      currency: base.currency,
      checkoutPlanId: base.id,
    })),
  };
}
