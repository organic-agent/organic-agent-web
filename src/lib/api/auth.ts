/**
 * 인증 API — 스웨거 [OAuth]·[Auth]·[User] 계약의 타입화
 * 위치: src/lib/api/auth.ts
 *
 * 타입은 백엔드 응답 스키마(LoginResponse 등)를 그대로 옮긴 것이다.
 * 계약이 바뀌면 여기만 고치면 화면까지 타입 에러로 전파된다.
 */

import { api } from "@/lib/api/client";

export type OAuthProvider = "google" | "naver" | "kakao";

export type LoginUrlResponse = {
  loginUrl: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  /** 초대 링크 경유 로그인이면 방금 들어간 갤러리 id, 일반 로그인이면 null. */
  galleryId: number | null;
};

export type User = {
  id: number;
  provider: OAuthProvider;
  nickname: string;
  email: string | null;
  role: "USER" | "ADMIN";
  userType: "PHOTOGRAPHER" | "CLIENT" | null;
  createdAt: string | null;
};

/**
 * provider 인가 페이지 주소를 받는다. redirect_uri는 서버가 요청 Origin으로
 * 정하므로 우리는 받은 URL로 이동시키기만 하면 된다.
 */
export function getLoginUrl(
  provider: OAuthProvider,
  inviteToken?: string,
): Promise<LoginUrlResponse> {
  const query = inviteToken
    ? `?inviteToken=${encodeURIComponent(inviteToken)}`
    : "";
  return api(`/api/v1/oauth/login-url/${provider}${query}`, { auth: false });
}

/**
 * 콜백으로 받은 인가 코드를 우리 토큰으로 교환한다. state는 콜백 쿼리의
 * 값을 해석 없이 그대로 되돌려준다(서버가 저장·검증한다).
 */
export function login(
  provider: OAuthProvider,
  body: { code: string; state: string | null },
): Promise<LoginResponse> {
  return api(`/api/v1/oauth/${provider}`, {
    method: "POST",
    body,
    auth: false,
  });
}

// 토큰 재발급은 여기 없다 — 관문을 거치면 안 되는 특수 요청이라
// src/lib/auth/refreshTokens.ts 가 전담한다.

/** access token 주체의 사용자 정보. 로그인 상태 복구의 마지막 단계에서 쓴다. */
export function getMe(): Promise<User> {
  return api("/api/v1/users/me");
}
