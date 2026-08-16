/**
 * 토큰 보관소 — access는 메모리, refresh는 localStorage
 * 위치: src/lib/auth/tokenStore.ts
 *
 * 저장 위치가 다른 이유:
 *  - access(수명 30분)는 모든 API 요청에 실려 노출이 잦다. 모듈 변수에만 두면
 *    localStorage를 뒤지는 방식의 XSS 탈취가 통하지 않고, 새로고침에 사라지는
 *    건 부팅 시 reissue 복구가 메운다.
 *  - refresh(수명 14일)는 새로고침 생존이 필수라 localStorage에 둔다.
 *
 * createLocalStore를 쓰지 않고 localStorage를 직접 다루는 이유: 그 헬퍼의
 * 존재 이유(React 구독, JSON 참조 캐시, SSR 스냅샷)가 토큰에는 전부 해당하지
 * 않는다. 토큰은 화면에 렌더되지 않으므로 구독이 필요 없고, 문자열이라 파싱도
 * 필요 없다.
 *
 * 백엔드의 reissue는 rotation 방식이라(쓴 refresh 즉시 무효) 토큰은 항상
 * 쌍으로 교체돼야 한다. 그래서 set은 쌍만 받고, 한쪽만 갱신하는 API는
 * 의도적으로 만들지 않았다.
 *
 * 서버에 로그아웃 API가 없으므로(AuthController는 reissue뿐) clearTokens()로
 * 로컬에서 지우는 것이 로그아웃의 전부다.
 */

const REFRESH_TOKEN_KEY = "sel.refreshToken";

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

// 새로고침하면 사라지는 것이 의도된 동작이다(복구는 reissue가 담당).
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * 메모리에 캐시하지 않고 매번 localStorage에서 읽는다. 다른 탭의 재발급이
 * rotation으로 값을 교체했을 때 이쪽 탭도 즉시 최신 refresh를 쓰기 위함이다.
 * 서버 렌더 중이거나 저장소 접근이 막힌 환경에서는 "로그인한 적 없음"과 같다.
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(pair: TokenPair): void {
  accessToken = pair.accessToken;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, pair.refreshToken);
  } catch {
    // 저장이 막혀도(시크릿 모드 등) 이번 세션은 메모리의 access로 동작한다.
    // 대가는 "새로고침하면 로그아웃"뿐이라 앱을 멈출 이유가 없다.
  }
}

export function clearTokens(): void {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // 지울 수 없는 환경이면 애초에 저장도 안 됐다.
  }
}
