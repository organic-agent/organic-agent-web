"use client";

/**
 * 주소의 # 조각에서 쿠폰 코드를 읽는 훅 — 서버 렌더 · 하이드레이션 첫 렌더에서는 "아직 모름"
 * 위치: src/lib/useCouponCodeFromHash.ts
 *
 * # 조각은 브라우저만 안다. 효과 안에서 상태를 바꾸는 대신 외부 저장소(window.location)로 구독한다 —
 * 서버 스냅샷은 null이라 ready가 false이고, 클라이언트에서 실제 값으로 한 번 다시 그린다.
 */

import { useSyncExternalStore } from "react";
import { readCouponCodeFromHash } from "@/lib/couponLink";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const getHash = () => window.location.hash;
const getServerHash = (): string | null => null;

export function useCouponCodeFromHash(): { ready: boolean; code: string | null } {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  return { ready: hash !== null, code: hash === null ? null : readCouponCodeFromHash(hash) };
}
