/**
 * 플랜·테스트 결제 API — 스웨거 [Plan]·[Payment] 계약의 타입화
 * 위치: src/lib/api/payments.ts
 *
 * 개인 갤러리는 이용권(checkoutId)이 있어야 만들 수 있다. 지금은 테스트 결제만 있어
 * POST /payments/checkout 한 번으로 즉시 이용권이 발급되고 실제 돈은 나가지 않는다.
 * 0원 플랜(무료)도 같은 길로 이용권을 받는다. 실결제 PG는 중간평가 이후.
 */

import { api } from "@/lib/api/client";

export type Plan = {
  id: string;
  name: string;
  /** 0이면 무료 플랜 — 결제 화면 없이 이용권만 받는다 */
  amount: number;
  currency: string;
  /** 보관 기간(일) */
  durationDays: number;
  /** 올릴 수 있는 사진 수 */
  maxPhotoCount: number;
};

export type PlansResponse = {
  mode: string;
  /** false면 결제를 열 수 없는 환경 — 화면은 안내만 보여준다 */
  testCheckoutEnabled: boolean;
  plans: Plan[];
};

export type CheckoutResponse = {
  checkoutId: string;
  planId: string;
  status: string;
  mode: string;
  amount: number;
  currency: string;
  expiresAt: string;
  /** 이 이용권으로 만든 갤러리. 아직 안 썼으면 null */
  galleryId: number | null;
};

/** 플랜 목록과 테스트 결제 활성 여부 */
export function getPlans(): Promise<PlansResponse> {
  return api("/api/v1/plans");
}

/** 테스트 결제 — 즉시 완료되고 이용권(checkoutId)을 준다. 실제 결제 없음 */
export function createCheckout(planId: string): Promise<CheckoutResponse> {
  return api("/api/v1/payments/checkout", { method: "POST", body: { planId } });
}

/** 내 이용권 조회 — 갤러리 정보 화면이 어떤 플랜의 이용권인지 확인할 때 */
export function getCheckout(checkoutId: string): Promise<CheckoutResponse> {
  return api(`/api/v1/payments/checkout/${encodeURIComponent(checkoutId)}`);
}

export const isFreePlan = (plan: Pick<Plan, "amount">): boolean => plan.amount === 0;

const wonFormat = new Intl.NumberFormat("ko-KR");
/** 금액을 "19,900" 꼴로 — "원"은 화면이 붙인다 */
export const formatAmount = (amount: number): string => wonFormat.format(amount);
