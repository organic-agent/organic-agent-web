/**
 * 테마 부팅 스크립트 — 서버 컴포넌트(layout.tsx)에서 <head>에 인라인으로 넣는다.
 * 위치: src/lib/theme-bootstrap.ts  ("use client" 없음 — 서버에서 문자열로 써야 하므로 theme.ts와 분리)
 *
 * hydration 전에 실행되어 첫 페인트부터 저장된 테마가 적용되게 한다(라이트 → 다크 깜빡임 방지).
 * 우선순위: ?theme=dark|light 파라미터(저장까지) → localStorage `sel.theme` → 라이트.
 * 시스템 설정 감지는 일부러 없다 — C1 토글·설정 화면과 함께 켠다.
 */

export const THEME_STORAGE_KEY = "sel.theme";

export const THEME_BOOTSTRAP_SCRIPT = `(function(){var k="${THEME_STORAGE_KEY}",d=document.documentElement,t=null;try{var q=new URLSearchParams(location.search).get("theme");if(q==="dark"||q==="light"){t=q;try{localStorage.setItem(k,t)}catch(e){}}else{var s=localStorage.getItem(k);if(s==="dark"||s==="light")t=s}}catch(e){}d.dataset.theme=t||"light"})();`;
