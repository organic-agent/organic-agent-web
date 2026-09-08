/**
 * 테마(라이트/다크) 인프라 — 디자인 시스템 v2 다크 모드
 * 위치: src/lib/theme.ts
 *
 * 저장: localStorage `sel.theme` = "light" | "dark". 저장값이 없으면 라이트.
 *       (시스템 설정 감지는 C1 프로필 메뉴 토글·설정 '화면 테마' 행과 함께 켠다 — 토글 없이 감지만 켜면
 *        다크 OS 사용자가 라이트로 돌아올 방법이 없어서.)
 * 적용: <html data-theme="..."> — tokens.generated.css의 [data-theme="dark"] 블록이 변수를 덮어쓴다.
 *       color-scheme은 globals.css에서 data-theme을 따라간다.
 * 첫 페인트: layout.tsx <head>의 인라인 스크립트(THEME_BOOTSTRAP_SCRIPT)가 hydration 전에 적용해 깜빡임을 막는다.
 * QA: 주소에 ?theme=dark 또는 ?theme=light를 붙이면 그 값으로 전환·저장한다 (토글 UI가 생기기 전 확인용).
 *
 * UI 연결: C1 07 프로필 메뉴에서 `const { theme, toggle } = useTheme()` 로 항목 하나만 붙이면 된다.
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-bootstrap";

export type Theme = "light" | "dark";

export { THEME_STORAGE_KEY };
const THEME_EVENT = "sel:theme";
const DEFAULT_THEME: Theme = "light";

const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark";

/** localStorage에 저장된 테마. 없거나 접근 불가면 null. */
export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** 현재 문서에 적용된 테마 (SSR·부팅 전에는 기본값). */
export function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : DEFAULT_THEME;
}

/** 문서에 테마를 적용한다 (저장하지 않음). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/** 테마를 저장하고 적용한 뒤, 구독 중인 훅에 알린다. */
export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 프라이빗 모드 등 — 저장 실패해도 이번 세션에는 적용한다
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    // 다른 탭에서 바꾼 경우 — 이 탭 문서에도 반영
    if (e.key === THEME_STORAGE_KEY && isTheme(e.newValue)) {
      applyTheme(e.newValue);
      onChange();
    }
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * 현재 테마와 전환 함수. 서버 렌더에서는 기본값(라이트)을 돌려주고,
 * 클라이언트에서는 부팅 스크립트가 적용한 data-theme을 그대로 읽는다.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getCurrentTheme, () => DEFAULT_THEME);
  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme]);
  return { theme, setTheme, toggle };
}
