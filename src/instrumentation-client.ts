/**
 * 클라이언트 계측 진입점 — HTML 로드 뒤, 하이드레이션 전에 한 번 실행된다(Next.js 15.3+ 파일 규약)
 * 위치: src/instrumentation-client.ts
 *
 * 분석 래퍼를 초기화하고, 첫 로드 1회 + 라우터 이동마다 page_view를 보낸다. 주소는 safeUrl이 가려서
 * 초대 · 협업 토큰과 OAuth code가 분석 도구로 나가지 않는다. 화면 코드는 건드리지 않는다(#133).
 * Next.js는 이 파일의 실행이 16ms를 넘기면 개발 모드에서 경고하므로 가볍게 유지한다.
 */

import { init, pageView } from "@/lib/analytics";

init();
pageView(window.location.href);

/** 라우터 이동이 시작될 때 Next.js가 부른다. 리다이렉트되면 그 이동도 한 번 더 들어온다 */
export function onRouterTransitionStart(url: string): void {
  pageView(url);
}
