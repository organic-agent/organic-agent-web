/**
 * 개인 갤러리 목표일 — 고를 수 있는 날짜 범위와 범위 밖 안내
 * 위치: src/lib/goalDateRange.ts
 *
 * 목표일(서버 필드 selectionDeadline)은 오늘부터 이용 기간 안에서만 정할 수 있다. 서버는 날짜로 비교해 이용 기간
 * 마지막 날(그날 23:59:59)까지 받는다(서버 PR 258). 달력은 이 범위만 고르게 막고(min · max), 손으로 적은 범위 밖 날짜는
 * 화면이 이유를 말한다(팀 노션 3번, 문구는 2026-10-04 수민 선택). 서버가 거절하면 코드로 이유를 나눠 같은 문구를 띄운다 —
 * 지난 날짜 GALLERY_400_2, 이용 기간 뒤 GALLERY_400_9.
 */

import type { Plan } from "@/lib/api/payments";

const KST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;

/** 그 순간의 한국 날짜(YYYY-MM-DD) — 브라우저 시간대와 무관하게 서버(KST)와 같은 날짜를 쓴다 */
function kstDate(ms: number): string {
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 날짜 칸의 min · max — max가 null이면 이용 기간을 모르는 것(상한 없음) */
export type GoalDateRange = { min: string; max: string | null };

/** 이용 기간이 끝나는 시각으로 고를 수 있는 범위를 구한다 — 마지막 날은 만료 시각의 한국 날짜. 만료 시각을 모르면 오늘 이후만 막는다 */
export function goalDateRange(expiresAt: string | number | null, now: number): GoalDateRange {
  const min = kstDate(now);
  if (expiresAt === null) return { min, max: null };
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return { min, max: null };
  return { min, max: kstDate(expiry) };
}

/**
 * 지금 갤러리를 만들면 이용 기간이 끝나는 시각 — 서버와 같은 달력 계산(개월 수를 더하되 그 달의 말일을 넘지 않는다).
 * 온보딩에서는 아직 갤러리가 없어 만료 시각을 서버가 주지 않으므로 플랜 값으로 어림한다.
 */
export function planExpiryFromNow(plan: Pick<Plan, "durationMonths" | "durationDays">, now: number): number | null {
  if (plan.durationMonths !== null) {
    // KST 벽시계를 UTC 필드로 읽는다
    const k = new Date(now + KST_OFFSET_MS);
    const total = k.getUTCMonth() + plan.durationMonths;
    const year = k.getUTCFullYear() + Math.floor(total / 12);
    const month = total % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return (
      Date.UTC(year, month, Math.min(k.getUTCDate(), lastDay), k.getUTCHours(), k.getUTCMinutes(), k.getUTCSeconds()) -
      KST_OFFSET_MS
    );
  }
  if (plan.durationDays !== null) return now + plan.durationDays * DAY_MS;
  return null;
}

/** past: 지난 날짜 · over: 이용 기간 뒤 · unreadable: 브라우저가 받아 주지 않은 입력(범위 밖 숫자 · 적다 만 날짜) */
export type GoalDateProblem = "past" | "over" | "unreadable";

/** value는 날짜 칸의 값("" 또는 YYYY-MM-DD), badInput은 칸에 뭔가 적혀 있는데 날짜로 읽히지 않는 상태 */
export function goalDateProblem(value: string, range: GoalDateRange, badInput: boolean): GoalDateProblem | null {
  if (!value) return badInput ? "unreadable" : null;
  if (value < range.min) return "past";
  if (range.max !== null && value > range.max) return "over";
  return null;
}

export const GOAL_DATE_PROBLEM_MESSAGE: Record<GoalDateProblem, string> = {
  past: "오늘 이후 날짜로 정해 주세요",
  over: "이용 기간 안의 날짜로 정해 주세요",
  unreadable: "이용 기간 안의 날짜로 정해 주세요",
};

/** 서버가 목표일을 거절한 코드 → 화면 문구. 목표일과 상관없는 코드면 null */
export function goalDateRejectedMessage(code: string): string | null {
  if (code === "GALLERY_400_2") return GOAL_DATE_PROBLEM_MESSAGE.past;
  if (code === "GALLERY_400_9") return GOAL_DATE_PROBLEM_MESSAGE.over;
  return null;
}
