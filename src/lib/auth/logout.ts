/**
 * 로그아웃 — 서버 폐기 → 로컬 정리 → 게스트 전환
 * 위치: src/lib/auth/logout.ts
 *
 * 순서가 중요하다. 서버 폐기(POST /auth/logout)는 bearer가 필요해서 토큰을 지우기 전에
 * 불러야 한다. 서버가 실패해도(네트워크·이미 만료) 로컬은 반드시 지운다 — 사용자가
 * "로그아웃"을 눌렀는데 로그인 상태로 남는 것이 최악이다. 남은 refresh token은 14일 뒤
 * 스스로 만료된다.
 *
 * 화면 이동은 호출부가 한다(보통 랜딩으로). 인증 가드가 걸린 화면에서 부르면
 * setGuest만으로도 가드가 랜딩으로 보낸다.
 */

import { logoutOnServer } from "@/lib/api/auth";
import { setGuest } from "@/lib/auth/authStore";
import { clearLoginContext } from "@/lib/auth/loginFlow";
import { clearTokens, getAccessToken } from "@/lib/auth/tokenStore";

export async function logout(): Promise<void> {
  if (getAccessToken()) {
    try {
      await logoutOnServer();
    } catch {
      // 서버 폐기 실패는 로컬 로그아웃을 막지 않는다.
    }
  }
  clearTokens();
  clearLoginContext();
  setGuest();
}
