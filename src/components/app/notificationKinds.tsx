/**
 * 알림 유형별 아이콘 · 색과 시간 표기 — 알림 목록(NotificationBell)과 벨 아래 카드(NotificationPeek)가 같이 쓴다
 * 위치: src/components/app/notificationKinds.tsx
 */

import type { ReactNode } from "react";
import {
  BrushIcon,
  CheckCircleIcon,
  GroupIcon,
  PhotoIcon,
  ScheduleIcon,
  SparkleIcon,
} from "@/components/icons";
import type { NotificationType } from "@/lib/api/notifications";

type Kind = "selection" | "retouch" | "member" | "deadline" | "ai" | "gallery";

const KIND_OF: Record<NotificationType, Kind> = {
  SELECTION_SUBMITTED: "selection",
  SELECTION_REOPENED: "selection",
  SELECTION_INCREASE_REQUESTED: "selection",
  SELECTION_INCREASE_APPROVED: "selection",
  RETOUCH_REQUESTED: "retouch",
  RETOUCH_COMPLETED: "retouch",
  RETOUCH_CONFIRMED: "retouch",
  INVITE_ACCEPTED: "member",
  WORKSPACE_MEMBER_LEFT: "member",
  GALLERY_MEMBER_LEFT: "member",
  MEMBERSHIP_REMOVED: "member",
  WORKSPACE_DELETED: "member",
  DEADLINE_REMINDER: "deadline",
  PLAN_EXPIRY_REMINDER: "deadline",
  PLAN_EXPIRED: "deadline",
  ANALYSIS_COMPLETED: "ai",
  GALLERY_OPENED: "gallery",
  GALLERY_REOPENED: "gallery",
};

const KIND_STYLE: Record<Kind, { icon: ReactNode; className: string }> = {
  selection: {
    icon: <CheckCircleIcon size={18} />,
    className: "bg-brand-secondary-background text-brand-secondary-dark",
  },
  retouch: {
    icon: <BrushIcon size={18} />,
    className: "bg-function-info-background text-function-info-default",
  },
  member: {
    icon: <GroupIcon size={18} />,
    className: "bg-function-success-background text-function-success-default",
  },
  deadline: {
    icon: <ScheduleIcon size={18} />,
    className: "bg-function-warning-background text-function-warning-default",
  },
  ai: {
    icon: <SparkleIcon size={18} />,
    className: "bg-surface-default-light text-contents-light-bgd-default",
  },
  gallery: {
    icon: <PhotoIcon size={18} />,
    className: "bg-surface-default-light text-contents-light-bgd-sub",
  },
};

/** 유형 아이콘과 그 바탕 · 글자색. 모르는 유형은 갤러리 모양으로 */
export function kindStyleOf(type: NotificationType): { icon: ReactNode; className: string } {
  return KIND_STYLE[KIND_OF[type] ?? "gallery"];
}

export function relativeTime(iso: string | null, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const minutes = Math.floor((now - t) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  const d = new Date(t);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}
