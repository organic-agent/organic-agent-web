/**
 * 플랜 · 쿠폰 API — 스웨거 [Payment] · [Coupon] 계약의 타입화
 * 위치: src/lib/api/payments.ts
 *
 * 개인 갤러리 이용권은 쿠폰 방식이다(서버 전환 2026-10-02, 이슈 81). 플랜은 free · pro 둘뿐 —
 * 무료는 계정당 한 번이고 생성일부터 달력 기준 1개월 · 500장, 프로는 관리자가 백오피스에서 발급한
 * 일회용 코드를 등록해(POST /coupons/register) 미사용 쿠폰 한 장을 보관했다가 새 갤러리를 만들 때
 * 쓴다(1년 · 10,000장, 기간은 갤러리를 만들 때 시작). 카드 결제는 COMING_SOON — POST /payments/checkout은
 * 항상 503이라 개인 온보딩은 부르지 않는다(스튜디오 이용권 모달이 아직 쓴다 — 백엔드 이용권 API 전까지).
 */

import { api } from "@/lib/api/client";

export type Plan = {
  /** 갤러리 개설 요청의 planId — "free" | "pro" */
  id: string;
  name: string;
  /** 무료는 0, 가격 미정인 프로는 null — 화면은 PRO_AMOUNT_FALLBACK으로 적는다 */
  amount: number | null;
  currency: string;
  /** 서버가 달력 기준으로 계산하므로 null */
  durationDays: number | null;
  /** 생성일부터 달력 기준 이용 기간(개월). 무료 1 · 프로 12 */
  durationMonths: number | null;
  /** 갤러리에서 삭제되지 않은 사진의 최대 장수(업로드 대기 포함) */
  maxPhotoCount: number;
  /** 계정당 한 번 만들 수 있는 무료면 true */
  oncePerAccount: boolean;
  /** 개설에 미사용 쿠폰이 필요한지(프로) */
  couponRequired: boolean;
};

export type PlansResponse = {
  /** 현재 프로 이용권 발급 방식 — "COUPON" */
  mode: string;
  /** 옛 테스트 결제의 호환 필드. 발급이 끝나 항상 false */
  testCheckoutEnabled: boolean;
  /** 카드 결제 — "COMING_SOON" */
  cardPaymentStatus: string;
  plans: Plan[];
};

/**
 * 프로 가격 — 2026-10-03 수민 결정. 서버 플랜 응답의 amount가 아직 null이라 화면이 직접 적는다
 * (서버에 49,900 반영은 백엔드 전달 사항). 서버가 값을 주면 그 값을 쓴다 — planAmount 참고.
 */
export const PRO_AMOUNT_FALLBACK = 49_900;

export type ProCouponStatus = "AVAILABLE" | "USED" | "DISABLED";

export type ProCouponResponse = {
  /** 새 프로 갤러리를 개설할 때 보낼 쿠폰 id */
  couponId: number;
  /** 쿠폰이 제공하는 요금제 — "pro" */
  planId: string;
  /** 미사용 AVAILABLE · 비활성화 DISABLED · 갤러리에 사용 USED */
  status: ProCouponStatus;
  registeredAt: string;
  consumedAt: string | null;
  galleryId: number | null;
  /** 사용일부터 1년 뒤. 미사용이면 null */
  expiresAt: string | null;
};

export type MyBenefitsResponse = {
  /** 계정당 한 번인 무료 갤러리를 아직 만들지 않았으면 true. 삭제 · 만료 뒤에도 다시 주지 않는다 */
  freePlanAvailable: boolean;
  /** 본인이 등록한 프로 쿠폰. 사용한 쿠폰도 이력으로 포함 */
  coupons: ProCouponResponse[];
};

/** 플랜 목록(free · pro) */
export function getPlans(): Promise<PlansResponse> {
  return api("/api/v1/plans");
}

/** 내 무료 이용 가능 여부 · 프로 쿠폰 목록 */
export function getMyBenefits(): Promise<MyBenefitsResponse> {
  return api("/api/v1/billing/me");
}

/**
 * 프로 쿠폰 코드 등록 — 코드를 보관만 하고 이용 기간은 갤러리를 만들 때 시작한다.
 * 같은 계정의 재요청은 기존 쿠폰을 돌려주고, 다른 계정이 쓴 코드 · 동시 등록은 409.
 */
export function registerProCoupon(code: string): Promise<ProCouponResponse> {
  return api("/api/v1/coupons/register", { method: "POST", body: { code } });
}

export const isFreePlan = (plan: Pick<Plan, "id" | "amount">): boolean =>
  plan.id === "free" || plan.amount === 0;

/** 화면에 적을 금액 — 서버가 null로 주는 프로는 결정값으로 */
export function planAmount(plan: Pick<Plan, "id" | "amount">): number {
  if (plan.amount !== null) return plan.amount;
  return isFreePlan(plan) ? 0 : PRO_AMOUNT_FALLBACK;
}

/** 이용 기간 표기 — 서버가 달력 기준이라 "1개월" · "1년"(12개월). 옛 응답(durationDays)도 받는다 */
export function planDurationLabel(plan: Pick<Plan, "durationMonths" | "durationDays">): string {
  if (plan.durationMonths !== null) {
    if (plan.durationMonths % 12 === 0) return `${plan.durationMonths / 12}년`;
    return `${plan.durationMonths}개월`;
  }
  if (plan.durationDays !== null) return `${plan.durationDays}일`;
  return "기간 없음";
}

/** 지금 쓸 수 있는(미사용) 쿠폰 — 등록 순으로 첫 장 */
export function availableCoupon(benefits: MyBenefitsResponse): ProCouponResponse | null {
  return benefits.coupons.find((c) => c.status === "AVAILABLE") ?? null;
}

const wonFormat = new Intl.NumberFormat("ko-KR");
/** 숫자를 "19,900" 꼴로 — "원" · "장"은 화면이 붙인다 */
export const formatAmount = (amount: number): string => wonFormat.format(amount);

// ── 옛 테스트 결제 — 스튜디오 이용권 모달(TicketCheckoutModal)이 아직 부른다. 서버는 항상 503 ──

export type CheckoutResponse = {
  checkoutId: string;
  planId: string;
  status: string;
  mode: string;
  amount: number;
  currency: string;
  expiresAt: string;
  galleryId: number | null;
};

/** @deprecated 카드 결제 준비 중 — 서버가 항상 503(BILLING_503_1)을 돌려준다 */
export function createCheckout(planId: string): Promise<CheckoutResponse> {
  return api("/api/v1/payments/checkout", { method: "POST", body: { planId } });
}

/** @deprecated 옛 테스트 이용권 조회 */
export function getCheckout(checkoutId: string): Promise<CheckoutResponse> {
  return api(`/api/v1/payments/checkout/${encodeURIComponent(checkoutId)}`);
}
