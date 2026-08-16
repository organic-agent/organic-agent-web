/**
 * 토큰 재발급 전담 — 관문(client.ts)을 거치지 않는 유일한 API 호출
 * 위치: src/lib/auth/refreshTokens.ts
 *
 * 관문을 안 거치는 이유: 관문의 401 처리는 "재발급 후 재시도"인데, 재발급
 * 요청 자체가 그 처리를 타면 재발급이 재발급을 부르는 루프가 된다. 그래서
 * 여기만 날 fetch를 쓰고, 부팅 복구와 401 재시도가 이 모듈 하나를 공유한다.
 *
 * single-flight: 동시에 여러 요청이 만료를 만나도 재발급은 한 번만 나간다.
 * 백엔드 rotation(쓴 refresh 즉시 무효) 때문에 두 번 나가면 서로를 무효화한다.
 *
 * 결과가 셋인 이유 — 실패에도 종류가 있다:
 *  - dead: 서버가 401로 사망 확정 → 토큰 삭제 + guest 전환 (어느 문맥이든 정답)
 *  - unavailable: 네트워크 등으로 생사 불명 → 아무것도 안 바꿈.
 *    30분째 쓰던 사용자를 와이파이가 끊겼다고 로그아웃시키면 안 된다.
 */

import { baseUrl } from "@/lib/api/baseUrl";
import { setGuest } from "@/lib/auth/authStore";
import {
  clearTokens,
  getRefreshToken,
  setTokens,
  type TokenPair,
} from "@/lib/auth/tokenStore";

export type RefreshResult = "refreshed" | "dead" | "unavailable";

let inFlight: Promise<RefreshResult> | null = null;

export function refreshTokens(): Promise<RefreshResult> {
  // 진행 중이면 새로 시작하지 않고 같은 promise를 기다린다(single-flight).
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(): Promise<RefreshResult> {
  const refresh = getRefreshToken();
  if (!refresh) {
    setGuest();
    return "dead";
  }

  const first = await postReissue(refresh);
  if (first.kind === "refreshed") {
    setTokens(first.pair);
    return "refreshed";
  }
  if (first.kind === "unavailable") return "unavailable";

  // 401을 받았다. 사망 선고 전에 한 가지 가능성을 확인한다: 다른 탭이 방금
  // rotation으로 refresh를 교체해서, 우리가 낡은 값을 쓴 경우다.
  const latest = getRefreshToken();
  if (latest && latest !== refresh) {
    const second = await postReissue(latest);
    if (second.kind === "refreshed") {
      setTokens(second.pair);
      return "refreshed";
    }
    if (second.kind === "unavailable") return "unavailable";
  }

  clearTokens();
  setGuest();
  return "dead";
}

type ReissueOutcome =
  | { kind: "refreshed"; pair: TokenPair }
  | { kind: "dead" }
  | { kind: "unavailable" };

async function postReissue(refreshToken: string): Promise<ReissueOutcome> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api/v1/auth/reissue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (!res.ok) {
    return res.status === 401 ? { kind: "dead" } : { kind: "unavailable" };
  }

  try {
    return { kind: "refreshed", pair: (await res.json()) as TokenPair };
  } catch {
    return { kind: "unavailable" };
  }
}
