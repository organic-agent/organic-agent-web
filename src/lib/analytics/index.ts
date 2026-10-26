/**
 * 분석 래퍼 입구 — 화면과 API 모듈은 이 파일의 함수만 부른다
 * 위치: src/lib/analytics/index.ts
 *
 * 다섯 호출의 자리: init · page는 src/instrumentation-client.ts, identify는 AuthBootstrap, reset은 logout,
 * track은 각 화면의 API 성공 직후. 어댑터는 NEXT_PUBLIC_AMPLITUDE_API_KEY가 있으면 앰플리튜드, 없으면(로컬 ·
 * 키를 안 넣은 배포) 콘솔이다. 키는 빌드 때 번들에 박히는 공개 값이라 개발 · 운영 프로젝트의 키를 환경별로 넣는다(#133).
 * 트래킹은 기능을 막지 않는다 — 모든 호출을 try로 감싸고 await 하지 않는다.
 */

import { isDemoActive } from "@/lib/demo/demoMode";
import { createAmplitudeAdapter } from "./adapters/amplitude";
import { consoleAdapter } from "./adapters/console";
import type { EventMap } from "./events";
import { safeUrl } from "./safeUrl";
import type { AnalyticsAdapter, IdentifyProps, Props } from "./types";

const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const adapter: AnalyticsAdapter = apiKey ? createAmplitudeAdapter(apiKey) : consoleAdapter;

/** 같은 사용자 · 같은 속성으로 identify가 반복되면(세션 복구 · 내 정보 갱신) 한 번만 보낸다 */
let lastIdentify: string | null = null;

export function init(): void {
  guard(() => adapter.init());
}

/** 화면 이동. raw는 href든 경로든 상관없고, 토큰 · code는 safeUrl이 가린다 */
export function pageView(raw: string): void {
  guard(() => adapter.page(safeUrl(raw)));
}

export function identify(userId: string, props: IdentifyProps): void {
  if (isDemoActive()) return;
  const key = JSON.stringify([userId, props]);
  if (key === lastIdentify) return;
  lastIdentify = key;
  guard(() => adapter.identify(userId, props));
}

/** identify 뒤에 알게 되는 사용자 속성(예: plan)을 덧붙인다 */
export function setUserProps(props: Props): void {
  guard(() => adapter.setUserProps(props));
}

export function reset(): void {
  lastIdentify = null;
  guard(() => adapter.reset());
}

export function track<K extends keyof EventMap>(name: K, props: EventMap[K]): void {
  // 체험(/demo)에서는 제품 이벤트를 보내지 않는다 — 깔때기를 더럽히지 않게. demo_ 이벤트만 간다
  if (isDemoActive() && !String(name).startsWith("demo_")) return;
  guard(() => adapter.track(name, props));
}

function guard(fn: () => void): void {
  try {
    fn();
  } catch {
    // 트래킹 실패는 조용히 삼킨다 — 화면 흐름에 영향을 주면 안 된다
  }
}

export { safeUrl } from "./safeUrl";
export { buildIdentifyProps } from "./userProps";
export type { EventMap, EventName } from "./events";
export type { IdentifyProps, Props } from "./types";
