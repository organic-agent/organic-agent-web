/**
 * 클라이언트 화면의 알림 주소 — 앨범 알림(보냄 · 확정, 이슈 168)은 앨범 화면, 나머지 갤러리 알림은 갤러리
 * 위치: src/app/(client)/gallery/_lib/notificationHref.ts
 */

import type { UserNotificationResponse } from "@/lib/api/notifications";

export function clientNotificationHref(n: UserNotificationResponse): string | null {
  if (n.scope !== "GALLERY" || n.scopeId === null) return null;
  return n.type.startsWith("ALBUM_") ? `/gallery/${n.scopeId}/album` : `/gallery/${n.scopeId}`;
}
