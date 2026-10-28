/**
 * 플랜 · 쿠폰 API — 스웨거 [Payment] · [Coupon] 계약의 타입화
 * 위치: src/lib/api/payments.ts
 *
 * 개인 갤러리 이용권은 쿠폰 방식이다(서버 전환 2026-10-02, 이슈 81). 플랜은 free · pro 둘뿐 —
 * 무료는 계정당 한 번이고 생성일부터 달력 기준 1개월 · 500장, 프로는 관리자가 백오피스에서 발급한
 * 코드를 등록해(POST /coupons/register) 보관했다가 새 갤러리를 만들 때 쓴다(1년 · 10,000장, 기간은 갤러리를
 * 만들 때 시작). 코드는 1회용(WES-… 자동 생성)이거나 관리자가 직접 지은 공유 코드(인플루언서 배포, 서버 PR 327
 * 2026-10-18)다 — 공유 코드는 계정당 1회 또는 반복 사용이고, 사용 마감(redeemUntil)이 지나면 EXPIRED.
 * 카드 결제는 COMING_SOON — POST /payments/checkout은 항상 503이라 개인 온보딩은 부르지 않는다(스튜디오
 * 이용권 모달이 아직 쓴다 — 백엔드 이용권 API 전까지).
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
 * 프로 가격 — 2026-10-04 수민 결정(49,900 → 39,900, QA BUG-104). 서버 플랜 응답의 amount가 아직 null이라
 * 화면이 직접 적는다. 서버가 값을 주면 그 값을 쓴다 — planAmount 참고.
 */
export const PRO_AMOUNT_FALLBACK = 39_900;

/** 미사용 AVAILABLE · 갤러리에 사용 USED · 비활성화 DISABLED · 사용 마감이 지남 EXPIRED */
export type ProCouponStatus = "AVAILABLE" | "USED" | "DISABLED" | "EXPIRED";

/** 1회용 SINGLE_USE · 공유 코드를 계정당 1회 ONCE_PER_ACCOUNT · 공유 코드를 같은 계정이 반복 사용 UNLIMITED */
export type CouponUsagePolicy = "SINGLE_USE" | "ONCE_PER_ACCOUNT" | "UNLIMITED";

/** 관리자가 직접 지은 공유 코드인지 — 1회용 자동 생성 코드와 달리 여러 계정이 같은 코드를 쓴다 */
export const isSharedCoupon = (policy: CouponUsagePolicy): boolean => policy !== "SINGLE_USE";

/** 사용 마감이 지난 코드를 등록 · 사용하려 할 때의 서버 오류 코드(HTTP 410). 화면은 이 코드를 우리 말투로 바꾼다 */
export const COUPON_EXPIRED_CODE = "BILLING_410_2";
export const COUPON_EXPIRED_MESSAGE = "쿠폰 사용 기간이 끝났어요";

export type ProCouponResponse = {
  /** 새 프로 갤러리를 개설할 때 보낼 쿠폰 id */
  couponId: number;
  /** 쿠폰이 제공하는 요금제 — "pro" */
  planId: string;
  /** 본인 기준의 상태 — 반복 사용 코드는 쓴 뒤에도 AVAILABLE */
  status: ProCouponStatus;
  /** 본인이 코드를 등록한 시각. 이용 기간은 시작하지 않는다 */
  registeredAt: string;
  /** 본인의 최근 사용 시각. 미사용이면 null */
  consumedAt: string | null;
  /** 본인의 최근 사용 갤러리. 미사용 · 영구 삭제이면 null */
  galleryId: number | null;
  /** 최근 사용 갤러리의 프로 만료일(사용일부터 1년). 쿠폰 사용 마감과 별개 */
  expiresAt: string | null;
  usagePolicy: CouponUsagePolicy;
  /** 쿠폰 사용 마감 시각. null이면 마감 없음 */
  redeemUntil: string | null;
};

/** 링크 조회는 쿠폰을 등록하지 않는다. 갤러리 id는 사용한 쿠폰이고 접근 권한이 있을 때만 반환된다. 반복 사용 코드는 쓴 뒤에도 AVAILABLE */
export type ProCouponLinkResponse = {
  status: ProCouponStatus;
  galleryId: number | null;
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
 * 같은 계정의 재요청은 기존 등록을 돌려준다. 1회용 코드는 다른 계정이 등록한 코드 · 동시 등록이 409, 공유 코드는
 * 계정별로 독립이다. 사용 마감이 지난 코드는 410(BILLING_410_2), 없는 코드는 404.
 */
export function registerProCoupon(code: string): Promise<ProCouponResponse> {
  return api("/api/v1/coupons/register", { method: "POST", body: { code } });
}

/** 코드가 URL · 접근 로그에 남지 않도록 본문으로 조회한다. */
export function resolveProCouponLink(code: string): Promise<ProCouponLinkResponse> {
  return api("/api/v1/coupons/resolve", { method: "POST", body: { code } });
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

/** 쓸 수 있는 쿠폰은 없고 마감 전에 등록해 둔 쿠폰이 마감으로 막힌 상태 — 화면이 "왜 쿠폰이 사라졌나"를 알려 준다 */
export function hasExpiredCouponOnly(benefits: MyBenefitsResponse): boolean {
  return availableCoupon(benefits) === null && benefits.coupons.some((c) => c.status === "EXPIRED");
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
