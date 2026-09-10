/**
 * 작가 — 갤러리 서버 상태 표시 규칙
 * 위치: src/app/(studio)/_lib/galleryStatus.ts
 *
 * 서버의 6단계 stage(업로드 → 셀렉 진행 → 셀렉 완료 → 보정 → 전달 → 보관)와
 * 선택 마감 기한을 화면 문구로 바꾼다. 칩 문법은 "단계 · D-day" 한 덩어리에
 * 색만 바뀐다. D-day는 셀렉 진행에만 붙는다 — 그 앞뒤 단계는 마감을 따질 대상이 아니다.
 * 홈 목록은 보관(ARCHIVED)을 숨기고 필터 "보관됨"에서만 보여준다.
 */

import type {
  GalleryResponse,
  GalleryStage,
  ShootType,
} from "@/lib/api/galleries";

export type GalleryStatus = GalleryResponse["status"];

export const STATUS_LABEL: Record<GalleryStatus, string> = {
  DRAFT: "준비 중",
  OPEN: "진행 중",
  CLOSED: "마감",
};

export const STAGE_LABEL: Record<GalleryStage, string> = {
  UPLOAD: "업로드",
  SELECTION_IN_PROGRESS: "셀렉 진행",
  SELECTION_COMPLETED: "셀렉 완료",
  RETOUCH: "보정",
  DELIVERY: "전달",
  ARCHIVED: "보관됨",
};

/** 홈 목록에 보이는 단계 — 보관은 빠지고 필터로만 본다 */
export const ACTIVE_STAGES: GalleryStage[] = [
  "UPLOAD",
  "SELECTION_IN_PROGRESS",
  "SELECTION_COMPLETED",
  "RETOUCH",
  "DELIVERY",
];

export const SHOOT_TYPE_LABEL: Record<ShootType, string> = {
  REHEARSAL: "리허설",
  CEREMONY: "본식",
  OTHER: "기타",
};

/** 홈 필터 — 전체(보관 제외) 또는 단계 하나 */
export type StageFilter = "ALL" | GalleryStage;

export const stageFilterLabel = (filter: StageFilter) =>
  filter === "ALL" ? "전체" : STAGE_LABEL[filter];

/**
 * 마감 기한까지 지난 일수(부호 있음). 양수면 기한을 지났고, 0이면 오늘
 * 마감, 음수면 남았다(-n = D-n). 기한이 없으면 null.
 */
export function deadlineOffset(deadline: string | null): number | null {
  if (!deadline) return null;
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - endDay.getTime()) / 86_400_000);
}

export type ChipTone = "muted" | "warning" | "critical" | "strong";

/**
 * 상태 칩 문구·톤. 업로드·보관은 muted, 셀렉 진행은 D-day에 따라
 * muted → 오늘 마감 warning → 지연 critical, 그 뒤 단계는 기본색(strong).
 */
export function galleryChip(
  gallery: Pick<GalleryResponse, "stage" | "selectionDeadline">,
): { text: string; tone: ChipTone } {
  const label = STAGE_LABEL[gallery.stage] ?? gallery.stage;
  if (gallery.stage === "UPLOAD" || gallery.stage === "ARCHIVED") {
    return { text: label, tone: "muted" };
  }
  if (gallery.stage !== "SELECTION_IN_PROGRESS") {
    return { text: label, tone: "strong" };
  }

  const offset = deadlineOffset(gallery.selectionDeadline);
  if (offset === null) return { text: label, tone: "muted" };
  if (offset > 0) return { text: `${label} · ${offset}일 지연`, tone: "critical" };
  if (offset === 0) return { text: `${label} · 오늘 마감`, tone: "warning" };
  return { text: `${label} · D-${-offset}`, tone: "muted" };
}

/** 마감 일시 → 카드 표시용 날짜(2026.08.30). 기한 없으면 null. */
export function deadlineDateLabel(deadline: string | null): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd}`;
}
