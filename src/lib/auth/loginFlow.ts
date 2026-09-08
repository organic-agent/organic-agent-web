/**
 * 로그인 플로우 — 시작(소셜 버튼)과 종착(콜백)이 공유하는 로직
 * 위치: src/lib/auth/loginFlow.ts
 *
 * OAuth 왕복 동안 서버 state가 보존해주는 것은 inviteToken뿐이다. 목적지
 * 결정에 필요한 intent(부부/스튜디오)는 우리가 직접 날라야 해서
 * sessionStorage에 담는다 — 로그인 왕복 한 사이클짜리 임시 데이터라
 * 탭을 닫으면 사라지는 저장소가 맞다. 취소 후 재시도 시 inviteToken이
 * 유실되지 않는 것(WES-83)도 이 컨텍스트가 담당한다.
 */

import { getLoginUrl, type OAuthProvider, type User } from "@/lib/api/auth";

/**
 * couple: 초대받은 클라이언트(초대 링크 경유·일반 로그인)
 * studio: 스튜디오 개설
 * personal: 개인 클라이언트(내 갤러리 만들기) — 목적지는 진입 흐름 PR에서 연결. 그 전까지는 couple과 같다
 * signup: 역할을 아직 정하지 않은 회원가입 — 목적지는 진입 흐름 PR의 역할 선택. 그 전까지는 couple과 같다
 */
export type LoginIntent = "couple" | "studio" | "personal" | "signup";

export type LoginContext = {
  intent: LoginIntent;
  inviteToken: string | null;
};

const CONTEXT_KEY = "sel.loginContext";

export function saveLoginContext(ctx: LoginContext): void {
  try {
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // 저장이 막혀도 로그인 자체는 진행한다. 대가는 콜백에서 intent를
    // 몰라 기본 목적지로 보내는 것뿐이다.
  }
}

export function readLoginContext(): LoginContext | null {
  try {
    const raw = sessionStorage.getItem(CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as LoginContext) : null;
  } catch {
    return null;
  }
}

/**
 * 소셜 버튼 클릭 → 컨텍스트 저장 → provider 인가 화면으로 이동.
 * 성공하면 페이지가 통째로 떠나므로 resolve 이후는 없다고 봐야 한다.
 * 실패(네트워크 등)는 throw되니 호출부가 로딩 해제·안내를 맡는다.
 */
export async function startLogin(
  provider: OAuthProvider,
  ctx: LoginContext,
): Promise<void> {
  saveLoginContext(ctx);
  const { loginUrl } = await getLoginUrl(provider, ctx.inviteToken ?? undefined);
  window.location.assign(loginUrl);
}

/**
 * 로그인 완료 후 목적지.
 * galleryId가 있으면 초대 경유 — 서버가 수락까지 끝냈으니 바로 갤러리로.
 * 신규 가입자(userType null)만 intent로 가른다.
 */
export function resolveDestination(
  galleryId: number | null,
  user: User,
  intent: LoginIntent,
): string {
  if (galleryId !== null) return "/gallery";
  if (user.userType === "PHOTOGRAPHER") return "/galleries";
  if (user.userType === "CLIENT") return "/gallery";
  // 부부 정책: 갤러리 참여는 작가의 초대 링크로만 가능하다. 초대 없이 온
  // 신규 부부는 갤러리 대신 초대 안내(/invite)로 보낸다.
  return intent === "studio" ? "/onboarding/studio" : "/invite";
}

// provider 취소(access_denied)와 스웨거에서 확인한 백엔드 코드만 매핑한다.
// 모르는 코드는 일반 문구로 — 없는 코드를 지어내지 않는다.
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "로그인이 취소됐어요. 다시 시도해주세요.",
  AUTH_400_1: "지원하지 않는 로그인 방식이에요.",
  AUTH_400_2: "로그인 유효 시간이 지났어요. 다시 시도해주세요.",
};

export function loginErrorMessage(code: string): string {
  return (
    ERROR_MESSAGES[code] ?? "로그인에 실패했어요. 잠시 후 다시 시도해주세요."
  );
}
