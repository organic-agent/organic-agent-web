/**
 * 고를 장수 — 개인 갤러리에서 적을 수 있는 상한
 * 위치: src/lib/selectableCount.ts
 *
 * 개인 갤러리의 고를 장수는 1~200장이다(2026-10-04 수민 결정, QA BUG-77). 칸을 비우면 장수를 정하지 않는다.
 * 서버는 1 이상인지만 검사하므로 상한은 화면이 지킨다 — 서버에도 같은 상한을 넣는 것은 백엔드 몫으로 남아 있다.
 */

export const MAX_SELECTABLE_COUNT = 200;

/** 장수 칸에 적은 글자를 숫자만 남기고 1~200으로 맞춘다 — 0과 숫자가 아닌 글자는 지우고, 200을 넘으면 200 */
export function clampSelectableCountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return Number(digits) > MAX_SELECTABLE_COUNT ? String(MAX_SELECTABLE_COUNT) : digits;
}
