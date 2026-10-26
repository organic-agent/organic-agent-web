/**
 * 체험 페이지 — 실제 개인 갤러리 화면 그대로. 데이터는 체험 레이아웃이 켠 가짜 서버가 준다(이슈 144)
 * 위치: src/app/(demo)/demo/[galleryId]/page.tsx
 *
 * 주소는 /demo(next.config의 리라이트가 /demo/999로 보낸다). 갤러리 번호는 가짜 서버가 보지 않는다.
 */
export { default } from "@/app/(client)/gallery/[galleryId]/page";
