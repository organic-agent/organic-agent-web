"use client";

/**
 * 버셀 Web Analytics — 보내기 전에 주소를 safeUrl로 가린다
 * 위치: src/components/VercelAnalytics.tsx
 *
 * 루트 레이아웃은 서버 컴포넌트라 beforeSend 함수를 직접 넘길 수 없어 이 얇은 클라이언트 컴포넌트가 감싼다.
 * 초대 · 협업 토큰과 OAuth 콜백 쿼리가 버셀에도 남지 않도록 lib/analytics와 같은 규칙을 쓴다(#133).
 * 개발 모드에서는 버셀 스크립트가 서버로 보내지 않고 콘솔에 "[Vercel Web Analytics]"로만 찍는다.
 */

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { safeUrl } from "@/lib/analytics/safeUrl";

function redact(event: BeforeSendEvent): BeforeSendEvent {
  try {
    const origin = new URL(event.url).origin;
    return { ...event, url: new URL(safeUrl(event.url, origin), origin).toString() };
  } catch {
    return event;
  }
}

export function VercelAnalytics() {
  return <Analytics beforeSend={redact} />;
}
