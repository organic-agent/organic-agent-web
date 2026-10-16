import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// 타입스크립트 소스를 새 테스트 실행기 의존성 없이 직접 검증한다(split-zip.test.mjs와 같은 방식).
const load = async (path) => {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
};
const { safeUrl } = await load("../src/lib/analytics/safeUrl.ts");
const { isoWeek } = await load("../src/lib/analytics/userProps.ts");
const origin = "https://www.easyselect.kr";

test("초대 · 협업 토큰은 :token으로 가린다", () => {
  assert.equal(safeUrl("/invite/WES-abc123XYZ", origin), "/invite/:token");
  assert.equal(safeUrl("https://www.easyselect.kr/collab/tok_9f8e7d?tab=all", origin), "/collab/:token?tab=all");
});

test("OAuth 콜백의 code · state는 지우고 나머지 쿼리는 남긴다", () => {
  assert.equal(safeUrl("/login/oauth2/code/kakao?code=AAA&state=BBB", origin), "/login/oauth2/code/kakao");
  assert.equal(safeUrl("/login/oauth2/code/google?iss=https%3A%2F%2Faccounts.google.com&scope=email+profile&authuser=1&code=A&state=B", origin), "/login/oauth2/code/google");
  assert.equal(safeUrl("/invite/tok?code=AAA&ref=x", origin), "/invite/:token?ref=x");
  assert.equal(safeUrl("/onboarding/personal/gallery?plan=pro&coupon=12", origin), "/onboarding/personal/gallery?plan=pro&coupon=12");
});

test("# 조각(쿠폰 코드)과 도메인은 보내지 않는다", () => {
  assert.equal(safeUrl("https://www.easyselect.kr/onboarding/personal#code=WES-secret", origin), "/onboarding/personal");
  assert.equal(safeUrl("/gallery/12", origin), "/gallery/12");
});

test("깨진 주소는 /로", () => {
  assert.equal(safeUrl("http://", origin), "/");
});

test("ISO 주차 — 연초 · 연말 경계 포함", () => {
  assert.equal(isoWeek(new Date(2026, 9, 16)), "2026-W42");
  assert.equal(isoWeek(new Date(2026, 0, 1)), "2026-W01");
  assert.equal(isoWeek(new Date(2024, 11, 30)), "2025-W01");
  assert.equal(isoWeek(new Date("not a date")), null);
});
