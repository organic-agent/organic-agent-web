/**
 * 앨범 편집기 플래그(이슈 168)
 * 위치: src/lib/album/flag.ts
 *
 * 서버 계약 전(1단계)이라 프리뷰 배포에서만 켠다 — 버셀 Preview 환경변수 NEXT_PUBLIC_ALBUM_EDITOR=1.
 * 꺼져 있으면 사이드바 행 · 하단 버튼 · /album 주소가 모두 없다. 서버가 붙는 PR ④에서 지운다.
 */

export const ALBUM_EDITOR_ENABLED = process.env.NEXT_PUBLIC_ALBUM_EDITOR === "1";
