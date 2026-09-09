/**
 * 작가 — 갤러리 서버 상태 표시 규칙
 * 위치: src/app/(studio)/_lib/galleryStatus.ts
 *
 * 서버 status(DRAFT/OPEN/CLOSED)와 선택 마감 기한을 화면 문구로 바꾼다.
 * 칩 문법은 기존과 동일 — "상태 · D-day" 한 덩어리에 색만 바뀐다.
 * D-day는 OPEN에만 붙는다: DRAFT는 열기 전이라, CLOSED는 끝난 뒤라
 * 마감을 따질 대상이 아니다.
 */

import type { GalleryResponse } from "@/lib/api/galleries";

export type GalleryStatus = GalleryResponse["status"];

export const STATUS_LABEL: Record<GalleryStatus, string> = {
  DRAFT: "준비 중",
  OPEN: "진행 중",
  CLOSED: "마감",
};

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

/** 상태 칩 문구·톤. 기본 muted → 오늘 마감 warning → 지연 critical, 마감은 기본색. */
export function galleryChip(
  gallery: Pick<GalleryResponse, "status" | "selectionDeadline">,
): { text: string; tone: ChipTone } {
  if (gallery.status === "DRAFT") return { text: "준비 중", tone: "muted" };
  if (gallery.status === "CLOSED") return { text: "마감", tone: "strong" };

  const offset = deadlineOffset(gallery.selectionDeadline);
  if (offset === null) return { text: "진행 중", tone: "muted" };
  if (offset > 0) return { text: `진행 중 · ${offset}일 지연`, tone: "critical" };
  if (offset === 0) return { text: "진행 중 · 오늘 마감", tone: "warning" };
  return { text: `진행 중 · D-${-offset}`, tone: "muted" };
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
