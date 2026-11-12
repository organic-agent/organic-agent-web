/**
 * 앨범 편집기 플래그(이슈 168)
 * 위치: src/lib/album/flag.ts
 *
 * 앨범 API(서버 이슈 397)가 운영 서버에 올라가기 전이라 로컬에서만 켠다 — 실행할 때 NEXT_PUBLIC_ALBUM_EDITOR=1
 * (API 주소도 개발 서버로: NEXT_PUBLIC_API_BASE_URL=https://dev.api.easyselect.kr). 켜고 끄면 개발 서버를 다시 켜야 반영된다.
 * PR 프리뷰 배포가 없고 main 머지는 운영(production 환경변수)으로만 나가므로, 운영 환경변수에 넣지 않는 한 머지해도 안 보인다.
 * 꺼져 있으면 사이드바 행 · 하단 버튼 · /album 주소 · 클라이언트 "앨범 구성" 칸이 모두 없다. 운영 서버에 앨범이 올라가고 출시를 정하면 지운다.
 */

export const ALBUM_EDITOR_ENABLED = process.env.NEXT_PUBLIC_ALBUM_EDITOR === "1";
