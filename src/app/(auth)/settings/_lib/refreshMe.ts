/**
 * 내 정보 다시 받기 — 소속이 바뀌는 동작(스튜디오 삭제 · 나가기) 뒤에 인증 상태를 맞춘다
 * 위치: src/app/(auth)/settings/_lib/refreshMe.ts
 */

import { getMe } from "@/lib/api/auth";
import { setAuthenticated } from "@/lib/auth/authStore";

export async function refreshMe(): Promise<void> {
  try {
    setAuthenticated(await getMe());
  } catch {
    // 다음 복구 때 맞춰진다 — 화면 이동을 막지 않는다
  }
}
