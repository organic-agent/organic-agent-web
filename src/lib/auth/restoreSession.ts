/**
 * 부팅 시 세션 복구 — 보관된 refresh token으로 로그인 상태를 되살린다
 * 위치: src/lib/auth/restoreSession.ts
 *
 * 재발급의 실제 수행(rotation·사망 판정·single-flight)은 refreshTokens가
 * 담당한다. 이 파일의 몫은 부팅이라는 문맥의 결정뿐이다: 시도할지 말지,
 * 성공하면 사용자 정보까지 채울지.
 */

import { getMe } from "@/lib/api/auth";
import { setAuthenticated, setGuest } from "@/lib/auth/authStore";
import { refreshTokens } from "@/lib/auth/refreshTokens";
import { getRefreshToken } from "@/lib/auth/tokenStore";

// React StrictMode(개발 모드)는 effect를 일부러 두 번 실행한다. 재발급 자체는
// single-flight가 지켜주지만, 복구 절차 전체도 한 번만 도는 게 맞다.
let started = false;

export async function restoreSession(): Promise<void> {
  if (started) return;
  started = true;

  if (!getRefreshToken()) {
    // 로그인한 적 없는 방문자 — API 호출 없이 즉시 확정한다.
    setGuest();
    return;
  }

  if ((await refreshTokens()) !== "refreshed") {
    // dead면 refreshTokens가 이미 토큰 삭제와 guest 전환까지 끝냈다.
    // unavailable이면 토큰은 남긴 채 이번 부팅만 guest로 확정한다(다음에 재시도).
    setGuest();
    return;
  }

  try {
    const user = await getMe();
    setAuthenticated(user);
  } catch {
    // 방금 받은 access가 거부될 일은 드물다 — 대부분 네트워크다. 토큰은 남긴다.
    setGuest();
  }
}
