/**
 * 작가 — 갤러리 목록 유틸
 * 위치: src/app/(photographer)/galleries/_lib/galleryList.ts
 *
 * 목록 화면 표시용 헬퍼. 상태 필터 목록은 StudioHeader가,
 * 상태별 색은 GalleryStatusChip이 각자 소유하도록 옮겨져 날짜 변환만 남았다.
 */

export function toDotDate(isoDate: string) {
  return isoDate.replaceAll("-", ".");
}
