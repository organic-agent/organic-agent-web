/**
 * 분석 도구로 보내기 전에 주소에서 비밀을 걷어낸다
 * 위치: src/lib/analytics/safeUrl.ts
 *
 * /invite/[token] · /collab/[token]의 토큰 조각은 :token으로 바꾸고, OAuth 콜백(/login/oauth2/code/*)은 쿼리를
 * 통째로 버리고(code · state 외에 제공자가 붙이는 scope · iss · authuser도 쓸모없다), 다른 경로의 code · state도 지우고,
 * # 조각(쿠폰 선물 링크가 코드를 싣는 자리)은 아예 보내지 않는다. 결과는 경로 + 쿼리뿐이라 도메인도 남지 않는다.
 * 의존성이 없어 scripts/analytics.test.mjs가 그대로 검증한다.
 */

const TOKEN_PATH = /\/(invite|collab)\/[^/?#]+/g;
const SECRET_QUERY = ["code", "state"] as const;
const DROP_ALL_QUERY = /^\/login\/oauth2\/code\//;

export function safeUrl(raw: string, origin: string = defaultOrigin()): string {
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return "/";
  }
  const path = url.pathname.replace(TOKEN_PATH, "/$1/:token");
  if (DROP_ALL_QUERY.test(path)) return path;
  for (const key of SECRET_QUERY) url.searchParams.delete(key);
  const query = url.searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function defaultOrigin(): string {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}
