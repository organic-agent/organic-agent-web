/**
 * 심사용 링크로 들어왔는지 — 이 브라우저에서만 아는 표시
 * 위치: src/lib/auth/reviewMode.ts
 *
 * 서버는 "이 사용자가 심사용 계정인가"를 내려 주지 않는다. 대신 /review 로그인이 이 표시를 남기고, 설정의
 * "작업 초기화" 카드가 이 표시가 있을 때만 보인다. 표시가 틀려도(지운 뒤 같은 계정으로 소셜 로그인 등) 안전하다 —
 * 초기화는 서버가 심사용 계정인지 다시 확인해 아니면 403으로 막는다. 로그아웃하면 지운다.
 */

import { useSyncExternalStore } from "react";

const REVIEW_MODE_KEY = "sel.reviewMode";

// 표시는 /review 로그인과 로그아웃에서만 바뀌고, 둘 다 화면을 떠나므로 바뀜을 알릴 필요가 없다.
const subscribe = () => () => {};

/** 서버 렌더 · 하이드레이션 첫 렌더는 false, 브라우저에서 실제 값으로 한 번 다시 그린다 */
export function useReviewMode(): boolean {
  return useSyncExternalStore(subscribe, isReviewMode, () => false);
}

export function markReviewMode(): void {
  try {
    localStorage.setItem(REVIEW_MODE_KEY, "1");
  } catch {
    // 저장이 막혀도 로그인은 그대로다. 초기화 카드만 보이지 않는다.
  }
}

export function isReviewMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(REVIEW_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearReviewMode(): void {
  try {
    localStorage.removeItem(REVIEW_MODE_KEY);
  } catch {
    // 지우지 못해도 서버가 초기화를 막으므로 넘어간다.
  }
}
