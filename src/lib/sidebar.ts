/**
 * 사이드바 접힘 상태 공용 상수·헬퍼
 * 위치: src/lib/sidebar.ts
 *
 * 서버 레이아웃과 클라이언트 SidebarProvider가 함께 쓰는 순수 모듈("use client" 없음).
 */

// ⚠️ 이 파일엔 "use client"를 넣지 않는다.
//    서버 레이아웃((client)/layout.tsx 등)과 클라이언트 SidebarProvider가 둘 다 이 값을 쓰는데,
//    "use client" 모듈에 두면 서버가 클라이언트 함수를 호출하는 꼴이 되어
//    ("invoke a client function from the server") 레이아웃이 깨지고 그 아래 라우트가 전부 404가 된다.

/** 사이드바 접힘 여부를 저장하는 쿠키 이름. */
export const SIDEBAR_COOKIE = "sel.sidebar.collapsed";

/** 서버가 읽은 쿠키 문자열("1"/"0"/없음)을 접힘 여부(boolean)로 바꾼다. */
export function parseCollapsedCookie(raw: string | undefined): boolean {
  return raw === "1";
}
