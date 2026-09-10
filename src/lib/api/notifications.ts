/**
 * 알림 API — 스웨거 [Notification] 계약의 타입화
 * 위치: src/lib/api/notifications.ts
 *
 * 목록은 최근 30일을 최신순으로 준다. 읽지 않음 수는 readAt이 null인 항목 수로 화면이 센다.
 * 알림 드롭다운(NotificationBell)이 쓰고, 수신 설정(이메일·브라우저)은 설정 화면에서 붙인다.
 */

import { api } from "@/lib/api/client";

export type NotificationType =
  | "WORKSPACE_DELETED"
  | "WORKSPACE_MEMBER_LEFT"
  | "GALLERY_MEMBER_LEFT"
  | "MEMBERSHIP_REMOVED"
  | "INVITE_ACCEPTED"
  | "GALLERY_OPENED"
  | "GALLERY_REOPENED"
  | "SELECTION_INCREASE_REQUESTED"
  | "SELECTION_INCREASE_APPROVED"
  | "PLAN_EXPIRED"
  | "DEADLINE_REMINDER"
  | "PLAN_EXPIRY_REMINDER"
  | "ANALYSIS_COMPLETED"
  | "RETOUCH_CONFIRMED"
  | "SELECTION_REOPENED"
  | "SELECTION_SUBMITTED"
  | "RETOUCH_REQUESTED"
  | "RETOUCH_COMPLETED";

export type NotificationScope = "GLOBAL" | "STUDIO" | "GALLERY";

export type UserNotificationResponse = {
  id: number;
  type: NotificationType;
  scope: NotificationScope;
  /** STUDIO면 workspaceId, GALLERY면 galleryId. GLOBAL은 null */
  scopeId: number | null;
  title: string;
  message: string;
  /** null이면 아직 읽지 않음 */
  readAt: string | null;
  createdAt: string | null;
};

/** 내 알림 목록 — 범위를 주지 않으면 전체의 최근 30일 */
export function listNotifications(params?: {
  scope?: NotificationScope;
  scopeId?: number;
}): Promise<UserNotificationResponse[]> {
  const query = new URLSearchParams();
  if (params?.scope) query.set("scope", params.scope);
  if (params?.scopeId !== undefined) query.set("scopeId", String(params.scopeId));
  const qs = query.toString();
  return api(`/api/v1/notifications${qs ? `?${qs}` : ""}`);
}

export type ReadNotificationsRequest = {
  /** 읽을 알림 id. all과 함께 줄 수 없다 */
  notificationIds?: number[];
  /** true면 범위의 최근 30일 알림을 모두 읽는다 */
  all?: boolean;
  scope?: NotificationScope | null;
  scopeId?: number | null;
};

export type ReadNotificationsResponse = {
  updatedCount: number;
  unreadCount: number;
};

/** 알림 읽음 처리 — 본인 알림만. 다른 사용자의 id가 섞이면 전체를 거절한다 */
export function markNotificationsRead(
  request: ReadNotificationsRequest,
): Promise<ReadNotificationsResponse> {
  return api("/api/v1/notifications/read", { method: "PATCH", body: request });
}
