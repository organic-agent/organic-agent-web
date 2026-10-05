/**
 * 지난 방문의 사용자 요약 — 로그인 확인이 끝나기 전에 상단바를 먼저 그리는 데 쓴다 (팀 노션 60번)
 * 위치: src/lib/auth/lastUser.ts
 *
 * 로그인 확인(토큰 재발급 → 내 정보 조회)은 요청 두 번을 차례로 기다린다. 그동안 랜딩 상단바는 회색 자리만 보였다.
 * 확인에 성공할 때마다 이름과 소속만 localStorage에 적어 두고, 다음 방문의 첫 화면을 그것으로 먼저 그린다.
 * 화면을 그리는 데만 쓴다 — 권한 판단이나 API 호출의 근거는 authStore의 authenticated뿐이다.
 * 적고 지우는 일은 AuthBootstrap이 인증 상태를 따라가며 한다(로그아웃 · 로그인이 풀리면 지움).
 * refresh token이 없는데 남아 있는 기록(다른 탭에서 로그아웃한 직후 등)은 읽지 않는다.
 */

import { useSyncExternalStore } from "react";
import type { User } from "@/lib/api/auth";
import { getRefreshToken } from "@/lib/auth/tokenStore";
import { createLocalStore } from "@/lib/localStore";

export type LastUser = Pick<User, "nickname" | "workspaces">;

const store = createLocalStore<LastUser | null>("sel.lastUser", null);

export function rememberLastUser(user: User): void {
  store.set({ nickname: user.nickname, workspaces: user.workspaces });
}

export function forgetLastUser(): void {
  if (store.get() !== null) store.set(null);
}

/** 값이 안 바뀌었으면 같은 참조를 돌려준다(useSyncExternalStore의 조건) — 모양이 다른 옛 기록은 없는 것으로 본다 */
function read(): LastUser | null {
  if (!getRefreshToken()) return null;
  const saved = store.get();
  return saved && typeof saved.nickname === "string" && Array.isArray(saved.workspaces) ? saved : null;
}

/** 서버 렌더와 첫 클라이언트 렌더는 null — 하이드레이션 뒤에 보관한 값으로 다시 그린다 */
export function useLastUser(): LastUser | null {
  return useSyncExternalStore(store.subscribe, read, store.getServerSnapshot);
}
