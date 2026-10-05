/**
 * 벨 아래 카드로 어디까지 알렸는지 기억 — 같은 알림을 두 번 띄우지 않게
 * 위치: src/components/app/notificationMemory.ts
 *
 * 알림 벨은 화면마다 새로 만들어진다(상단바가 page 안에 있다). 부품 안에만 기억하면 화면을 옮길 때마다 처음 온 것처럼
 * 되어, 이미 알린 알림이 다시 뜨거나 옮기는 사이에 온 알림을 놓친다. 그래서 "카드로 알린 가장 큰 알림 id"를 브라우저에
 * 적어 둔다 — 사이트를 닫았다 열어도 이어져서, 닫아 둔 동안 온 알림을 들어왔을 때 한 번 알릴 수 있다.
 * 한 브라우저를 여러 계정이 쓸 수 있어 사용자마다 키를 나눈다. 저장소를 못 쓰면 이번 방문 동안만 기억한다.
 */

import type { UserNotificationResponse } from "@/lib/api/notifications";

const keyOf = (userId: number) => `sel.notification.announced.${userId}`;

/** 저장소를 못 쓸 때(사생활 보호 모드 등) 이번 방문 동안의 기억 */
const fallback = new Map<number, number>();

/** 카드로 알린 가장 큰 알림 id. 이 브라우저에서 한 번도 적은 적이 없으면 null */
export function readAnnouncedId(userId: number): number | null {
  try {
    const raw = window.localStorage.getItem(keyOf(userId));
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch {
    // 저장소 불가 — 아래 기억으로
  }
  return fallback.get(userId) ?? null;
}

export function writeAnnouncedId(userId: number, id: number) {
  fallback.set(userId, id);
  try {
    window.localStorage.setItem(keyOf(userId), String(id));
  } catch {
    // 저장소 불가 — 이번 방문 동안만 기억한다
  }
}

/** 아직 카드로 알리지 않은, 안 읽은 알림 — 새 것부터. 다른 기기에서 이미 읽은 알림은 빠진다 */
export function pickUnannounced(
  list: UserNotificationResponse[],
  announcedId: number,
): UserNotificationResponse[] {
  return list.filter((n) => n.readAt === null && n.id > announcedId).sort((a, b) => b.id - a.id);
}
