/**
 * 앨범 편집기 플래그(이슈 168)
 * 위치: src/lib/album/flag.ts
 *
 * 서버 계약 전(1단계)이라 로컬에서만 켠다 — .env.local에 NEXT_PUBLIC_ALBUM_EDITOR=1(개발 서버를 다시 켜야 반영).
 * PR 프리뷰 배포가 없고 main 머지는 운영(production 환경변수)으로만 나가므로, 운영 환경변수에 넣지 않는 한 머지해도 안 보인다.
 * 꺼져 있으면 사이드바 행 · 하단 버튼 · /album 주소가 모두 없다. 서버가 붙는 PR ④에서 지운다.
 */

export const ALBUM_EDITOR_ENABLED = process.env.NEXT_PUBLIC_ALBUM_EDITOR === "1";
