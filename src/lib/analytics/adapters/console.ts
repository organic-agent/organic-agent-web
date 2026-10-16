/**
 * 콘솔 어댑터 — 보낼 곳이 없을 때 개발자 도구 콘솔에만 찍는다
 * 위치: src/lib/analytics/adapters/console.ts
 *
 * 로컬 개발과, 분석 도구 키가 아직 없는 배포에서 쓴다. 운영 빌드(NODE_ENV=production)에서는 아무것도 찍지 않는다.
 * 확인법: 화면을 옮기면 "[analytics] page /gallery/12" 같은 줄이 콘솔에 보인다.
 */

import type { AnalyticsAdapter } from "../types";

const enabled = process.env.NODE_ENV !== "production";

function log(...args: unknown[]): void {
  if (enabled) console.debug("[analytics]", ...args);
}

export const consoleAdapter: AnalyticsAdapter = {
  init() {
    log("init — console adapter (분석 도구 키 없음)");
  },
  page(url) {
    log("page", url);
  },
  identify(userId, props) {
    log("identify", userId, props);
  },
  reset() {
    log("reset");
  },
  track(name, props) {
    log("track", name, props);
  },
};
