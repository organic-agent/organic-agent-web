/**
 * identify에 실을 사용자 속성 만들기 — User 한 개에서 코호트 · 세그먼트에 쓸 값만 뽑는다
 * 위치: src/lib/analytics/userProps.ts
 *
 * 이메일 · 닉네임은 절대 넣지 않는다. 숫자 ID와 열거형 값, 가입 시각만 보낸다.
 */

import type { User, UserWorkspace } from "@/lib/api/auth";
import type { IdentifyProps } from "./types";

/** 소속 하나를 분석용 종류 이름으로 */
export function workspaceKind(space: UserWorkspace): string {
  if (space.kind === "STUDIO") return space.role === "OWNER" ? "studio_owner" : "studio_member";
  if (space.workspaceType === "PERSONAL") return space.role === "OWNER" ? "personal_owner" : "personal_partner";
  return "studio_client";
}

export function buildIdentifyProps(user: User): IdentifyProps {
  const kinds = Array.from(new Set(user.workspaces.map(workspaceKind))).sort();
  return {
    provider: user.provider,
    role: user.role,
    workspace_kinds: kinds,
    partner: kinds.includes("personal_partner"),
    signed_up_at: user.createdAt,
    signup_week: user.createdAt ? isoWeek(new Date(user.createdAt)) : null,
  };
}

/** ISO 8601 주차 — 목요일이 속한 해 기준. 예: 2026-10-16 → 2026-W42. 잘못된 날짜면 null */
export function isoWeek(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
