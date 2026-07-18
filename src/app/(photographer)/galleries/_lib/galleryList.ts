/**
 * 작가 — 갤러리 목록 유틸
 * 위치: src/app/(photographer)/galleries/_lib/galleryList.ts
 *
 * 갤러리 목록 화면에서 쓰는 상태 필터와 표시용 헬퍼를 모은다.
 * 카드/필터 컴포넌트가 같은 표시 규칙을 공유하도록 한다.
 *
 * 주요 책임:
 * - 상태 필터 목록 정의
 * - 상태 점 색상 클래스 반환
 * - 날짜 표시와 마감일 색상 클래스 반환
 */

import {
  GALLERY_STAGES,
  type Gallery,
  getOverdueLabel,
} from "@/lib/galleries";

export const STATUS_FILTERS = [
  "전체",
  ...GALLERY_STAGES.slice(0, -1),
  "보정 요청 있음",
  GALLERY_STAGES[GALLERY_STAGES.length - 1],
];

export function toDotDate(isoDate: string) {
  return isoDate.replaceAll("-", ".");
}

export function statusDotColor(label: string) {
  if (label === "전달 완료") return "bg-ink";
  if (label === "보정 요청 있음") return "bg-accent-press";
  if (label === "셀렉 완료") return "bg-select";
  if (label === "셀렉 진행 중") return "bg-accent";
  if (label === "초대 전") return "bg-hold";
  if (label === "업로드 전") return "bg-ink-3";
  return "bg-ink";
}

export function dueDateTextClass(gallery: Gallery) {
  const overdueLabel = getOverdueLabel(gallery);
  if (!overdueLabel) return "text-ink-3";
  if (overdueLabel.includes("지연")) return "text-danger font-medium";
  if (overdueLabel === "오늘 마감") return "text-accent-press font-medium";
  return "text-ink-3";
}
