/**
 * 부부 — 도메인 저장소 공개 API
 * 위치: src/lib/couple.ts
 *
 * 부부 화면에서 사용하는 목업 저장소와 유틸을 도메인별 파일에서 모아 내보낸다.
 * 기존 화면들은 `@/lib/couple` 경로를 그대로 사용한다.
 */

export * from "./couple/photos";
export * from "./couple/galleryFolders";
export * from "./couple/photoNotes";
export * from "./couple/photoReactions";
export * from "./couple/shareDesign";
