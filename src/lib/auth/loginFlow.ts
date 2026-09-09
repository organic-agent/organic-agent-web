/**
 * 로그인 플로우 — 시작(소셜 버튼)과 종착(콜백)이 공유하는 로직
 * 위치: src/lib/auth/loginFlow.ts
 *
 * OAuth 왕복 동안 서버 state가 보존해주는 것은 inviteToken뿐이다. 목적지
 * 결정에 필요한 intent(스튜디오/개인/역할 미정)는 우리가 직접 날라야 해서
 * sessionStorage에 담는다 — 로그인 왕복 한 사이클짜리 임시 데이터라
 * 탭을 닫으면 사라지는 저장소가 맞다. 취소 후 재시도 시 inviteToken이
 * 유실되지 않는 것(WES-83)도 이 컨텍스트가 담당한다.
 */

import {
  getLoginUrl,
  type OAuthProvider,
  type User,
  type UserWorkspace,
} from "@/lib/api/auth";

/**
 * 로그인 뒤 목적지를 정하는 값. 모달 문구(로그인/회원가입)는 LoginModal의 mode가 따로 정한다.
 * couple: 초대받은 클라이언트(초대 링크 경유·일반 로그인·역할 미정 회원가입)
 * studio: 스튜디오 개설
 * personal: 개인 클라이언트(내 갤러리 만들기) — 목적지는 진입 흐름 PR에서 연결. 그 전까지는 couple과 같다
 */
export type LoginIntent = "couple" | "studio" | "personal";

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

export function clearLoginContext(): void {
  try {
    sessionStorage.removeItem(CONTEXT_KEY);
  } catch {
    // 지울 수 없는 환경이면 애초에 저장도 안 됐다.
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

/** 소속 하나가 가리키는 주소 — 스튜디오면 스튜디오 홈, 갤러리면 그 갤러리 */
export function workspacePath(space: UserWorkspace): string {
  if (space.kind === "STUDIO") return `/studio/${space.workspaceId}`;
  return space.galleryId !== null ? `/gallery/${space.galleryId}` : "/gallery";
}

/** 최근 활동순 정렬 — 소속이 여럿일 때 먼저 보여줄 공간을 고르는 기준 */
export function sortByRecentActivity(spaces: UserWorkspace[]): UserWorkspace[] {
  return [...spaces].sort((a, b) =>
    (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""),
  );
}

/** 랜딩 nav의 소속 칩 — 최근 활동 공간 하나를 이름·꼬리표·링크로 */
export type SpaceChip = { label: string; tag: string | null; href: string };

export function spaceChip(user: User): SpaceChip {
  const spaces = sortByRecentActivity(user.workspaces ?? []);
  if (spaces.length === 0) {
    return { label: "시작하기", tag: null, href: "/onboarding/role" };
  }
  const first = spaces[0];
  const tag =
    spaces.length > 1
      ? `외 ${spaces.length - 1}`
      : first.kind === "STUDIO"
        ? "스튜디오"
        : "갤러리";
  return { label: first.name, tag, href: workspacePath(first) };
}

export type DestinationInput = {
  /** 로그인 응답의 초대 토큰 — 초대 링크로 시작한 로그인이면 있다 */
  inviteToken: string | null;
  user: User;
  /** 모달을 연 곳이 넘긴 목적지 의도. nav처럼 역할을 모르는 곳은 couple */
  intent: LoginIntent;
};

/**
 * 로그인 완료 후 목적지 — 소속 규칙.
 *  - 초대 토큰이 있으면 초대 수락 페이지. 서버는 자동 수락하지 않으니 사용자가 확인한다.
 *  - 소속 0개(신규): 의도가 있으면 그 온보딩으로, 없으면 역할 선택으로.
 *  - 소속 1개: 그 공간으로.
 *  - 소속 2개 이상: 고르는 화면(워크스페이스 목록)이 생기기 전까지 최근 활동 공간으로.
 */
export function resolveDestination({
  inviteToken,
  user,
  intent,
}: DestinationInput): string {
  if (inviteToken) return `/invite/${encodeURIComponent(inviteToken)}`;
  const spaces = sortByRecentActivity(user.workspaces ?? []);
  if (spaces.length === 0) {
    if (intent === "studio") return "/onboarding/studio";
    if (intent === "personal") return "/onboarding/personal";
    return "/onboarding/role";
  }
  return workspacePath(spaces[0]);
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
