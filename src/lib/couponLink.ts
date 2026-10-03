/**
 * 프로 쿠폰 선물 링크 — 백오피스가 복사해 주는 주소와 웹의 쿠폰 등록 화면 사이의 약속
 * 위치: src/lib/couponLink.ts
 *
 * 백오피스(organic-agent-backoffice, admin-coupons.ts)는 `https://easyselect.kr/onboarding/personal#code=토큰`을
 * 만든다. 토큰은 쿼리가 아니라 # 조각에 있어 서버 · 로그에 남지 않고 브라우저만 읽는다.
 * 웹은 그 주소에서 #code를 읽는 즉시 쿠폰 등록 화면(COUPON_PATH)으로 주소를 바꾼다 — 선물 링크로 온 사람의
 * 첫 화면은 플랜 선택이 아니라 쿠폰 등록이다(2026-10-03 수민). 로그인 전이면 로그인 왕복 컨텍스트(loginFlow)에
 * 코드를 실어 두었다가 로그인 뒤 같은 화면으로 돌아온다.
 */

export const COUPON_PATH = "/onboarding/personal/coupon";

/** 주소의 # 조각에서 쿠폰 코드를 꺼낸다 — "#code=WES-…" 꼴. 없으면 null */
export function readCouponCodeFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const code = new URLSearchParams(raw).get("code")?.trim();
  return code ? code : null;
}

/** 쿠폰 등록 화면 주소 — 코드는 # 조각으로(백오피스 링크와 같은 규칙) */
export function couponRedemptionPath(code: string): string {
  return `${COUPON_PATH}#${new URLSearchParams({ code }).toString()}`;
}
