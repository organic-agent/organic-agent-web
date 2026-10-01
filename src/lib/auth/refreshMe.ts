/**
 * 내 정보 다시 받기 + 소속에서 빠진 뒤 갈 곳
 * 위치: src/lib/auth/refreshMe.ts (settings/_lib에서 옮김 — 설정 밖 화면도 쓴다)
 *
 * refreshMe: 소속이 바뀌는 동작(초대 수락 · 갤러리 생성 · 나가기 · 삭제) 뒤에 인증 상태의 소속 목록을 맞춘다.
 * destinationAfterLeaving: 나가기 · 삭제 · 내보내짐(들어갔더니 403 · 404) 뒤 공통 규칙 —
 *   소속을 다시 읽고 남은 소속이 있으면 워크스페이스 목록, 없으면 랜딩 (2026-10-01 수민 결정).
 */

import { getMe } from "@/lib/api/auth";
import { getAuthState, setAuthenticated } from "@/lib/auth/authStore";

export async function refreshMe(): Promise<void> {
  try {
    setAuthenticated(await getMe());
  } catch {
    // 다음 복구 때 맞춰진다 — 화면 이동을 막지 않는다
  }
}

export async function destinationAfterLeaving(): Promise<"/workspace" | "/"> {
  await refreshMe();
  const user = getAuthState().user;
  return user && user.workspaces.length > 0 ? "/workspace" : "/";
}
