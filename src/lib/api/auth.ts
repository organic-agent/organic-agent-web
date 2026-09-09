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
  /** 서버는 로그인 시 초대를 자동 수락하지 않는다. 일반 로그인과 수락 전 로그인은 null. */
  galleryId: number | null;
  /** 초대 링크로 시작한 로그인이면 미리보기·수락에 쓸 초대 토큰. 없으면 null. */
  inviteToken: string | null;
};

/** 내가 드나들 수 있는 공간 하나 — 스튜디오 작업공간 또는 (초대받았거나 내가 만든) 갤러리 */
export type UserWorkspace = {
  id: number;
  kind: "STUDIO" | "GALLERY";
  /** 스튜디오면 /studio/[workspaceId]에 쓰는 값 */
  workspaceId: number;
  /** 갤러리면 /gallery/[galleryId]에 쓰는 값. 스튜디오는 null */
  galleryId: number | null;
  name: string;
  role: "OWNER" | "MEMBER";
  lastActivityAt: string | null;
  workspaceType: "PERSONAL" | "STUDIO" | null;
};

export type User = {
  id: number;
  provider: OAuthProvider;
  nickname: string;
  email: string | null;
  role: "USER" | "ADMIN";
  createdAt: string | null;
  /** 소속 목록. 비어 있으면 아직 역할을 정하지 않은 신규 사용자다 */
  workspaces: UserWorkspace[];
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

/**
 * 서버 로그아웃 — 저장된 refresh token을 폐기한다. 현재 access token은 만료까지 유효하므로
 * 로컬 삭제(clearTokens)와 함께 써야 진짜 로그아웃이다. 본문 없음, bearer 필요.
 */
export function logoutOnServer(): Promise<void> {
  return api("/api/v1/auth/logout", { method: "POST" });
}

/** access token 주체의 사용자 정보. 로그인 상태 복구의 마지막 단계에서 쓴다. */
export function getMe(): Promise<User> {
  return api("/api/v1/users/me");
}
