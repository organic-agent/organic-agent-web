/**
 * 앰플리튜드 어댑터 — 래퍼의 다섯 호출을 @amplitude/analytics-browser에 잇는다
 * 위치: src/lib/analytics/adapters/amplitude.ts
 *
 * NEXT_PUBLIC_AMPLITUDE_API_KEY가 있을 때만 index.ts가 고른다(#133).
 * 자동 수집은 세션과 유입 출처(UTM · 리퍼러 → initial_utm_* 사용자 속성)만 켠다 — 페이지뷰 자동 수집은 초대 · 협업
 * 토큰이 든 주소를 그대로 올리므로 끄고, safeUrl로 가린 page_view를 우리가 보낸다. 폼 · 파일 다운로드 · 클릭 자동
 * 수집도 끈다: 이벤트 수 과금이고 사전에 없는 이름이 섞인다.
 * 사용자 ID는 서버의 숫자 ID 그대로("12")라 SDK 기본 최소 길이 5를 1로 낮춘다 — 안 낮추면 짧은 ID가 조용히 버려진다.
 */

import * as amplitude from "@amplitude/analytics-browser";
import type { AnalyticsAdapter, PropValue, Props } from "../types";

/** 한 번 정하면 바뀌지 않는 속성 — setOnce로 보내 재로그인 때 덮어쓰지 않는다 */
const SET_ONCE = ["signed_up_at", "signup_week"] as const;

function toValue(value: PropValue): string | number | boolean | string[] | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === "object" ? [...value] : value;
}

function toIdentify(props: Props, once: readonly string[] = []): amplitude.Identify {
  const ev = new amplitude.Identify();
  for (const [key, raw] of Object.entries(props)) {
    const value = toValue(raw);
    if (value === undefined) continue;
    if (once.includes(key)) ev.setOnce(key, value);
    else ev.set(key, value);
  }
  return ev;
}

export function createAmplitudeAdapter(apiKey: string): AnalyticsAdapter {
  return {
    init() {
      amplitude.init(apiKey, {
        minIdLength: 1,
        autocapture: {
          sessions: true,
          attribution: true,
          pageViews: false,
          formInteractions: false,
          fileDownloads: false,
          elementInteractions: false,
        },
      });
    },
    page(url) {
      amplitude.track("page_view", { action_url: url });
    },
    identify(userId, props) {
      amplitude.setUserId(userId);
      amplitude.identify(toIdentify(props, SET_ONCE));
    },
    setUserProps(props) {
      amplitude.identify(toIdentify(props));
    },
    reset() {
      amplitude.reset();
    },
    track(name, props) {
      amplitude.track(name, props);
    },
  };
}
