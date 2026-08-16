/**
 * 인증 상태 스토어 — "지금 로그인돼 있는가"의 앱 전역 단일 출처
 * 위치: src/lib/auth/authStore.ts
 *
 * Context가 아니라 모듈 스토어인 이유: 상태를 바꾸는 쪽이 React만이 아니다.
 * 재발급 실패 시 로그아웃 전환은 API 계층(순수 모듈)이 일으켜야 하는데,
 * Context 값은 React 바깥에서 바꿀 수 없다. localStore.ts와 같은
 * useSyncExternalStore 패턴이면 모듈도 전환할 수 있고 화면도 구독할 수 있다.
 *
 * loading이 별도 상태인 이유: 복구가 끝나기 전을 guest로 취급하면
 * "로그인돼 있는데 잠깐 로그아웃 화면이 번쩍"이는 깜빡임이 생긴다.
 */

import { useSyncExternalStore } from "react";
import type { User } from "@/lib/api/auth";

export type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "guest"; user: null };

const LOADING: AuthState = { status: "loading", user: null };
const GUEST: AuthState = { status: "guest", user: null };

let state: AuthState = LOADING;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getAuthState(): AuthState {
  return state;
}

/** 복구·로그인 성공 시. 사용자 정보와 함께 로그인 상태로 전환한다. */
export function setAuthenticated(user: User): void {
  state = { status: "authenticated", user };
  emit();
}

/** 복구 실패·로그아웃·재발급 불능 시. */
export function setGuest(): void {
  state = GUEST;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 화면에서 인증 상태를 구독한다.
 * 서버 스냅샷은 항상 loading — 복구는 브라우저에서만 일어나므로 서버 렌더와
 * 클라이언트 첫 렌더가 loading으로 일치해야 하이드레이션이 안 깨진다.
 */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getAuthState, () => LOADING);
}
