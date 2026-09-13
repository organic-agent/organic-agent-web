"use client";

/**
 * 게스트 신원 보관 — 링크(세션)마다 받은 guestToken · 이름을 브라우저에 둔다
 * 위치: src/app/(guest)/collab/[token]/_shell/guestMemory.ts
 *
 * 키 `sel.guest.{collabToken}`. 잃으면 다시 입장해 새 사람이 되므로 지우지 않는다. 앨범 여러 개(includeAllAlbums)면
 * 앨범(세션)마다 토큰이 따로라 앨범 토큰마다 한 칸씩. 읽기는 useSyncExternalStore로(같은 탭의 변경 이벤트 + 다른 탭의 storage).
 */

import { useMemo, useSyncExternalStore } from "react";

export type StoredGuest = { guestToken: string; nickname: string; participantId: number };

const PREFIX = "sel.guest.";
const CHANGE = "sel.guest.change";
const keyOf = (token: string) => `${PREFIX}${token}`;

function isStoredGuest(v: unknown): v is StoredGuest {
  return typeof v === "object" && v !== null && typeof (v as StoredGuest).guestToken === "string" && typeof (v as StoredGuest).nickname === "string";
}

export function readGuestRaw(token: string): string {
  try {
    return window.localStorage.getItem(keyOf(token)) ?? "";
  } catch {
    return "";
  }
}
export function parseGuest(raw: string): StoredGuest | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return isStoredGuest(v) ? v : null;
  } catch {
    return null;
  }
}
export function writeGuest(token: string, guest: StoredGuest | null) {
  try {
    if (guest) window.localStorage.setItem(keyOf(token), JSON.stringify(guest));
    else window.localStorage.removeItem(keyOf(token));
  } catch {
    // 저장 못 해도 이번 방문은 메모리 상태로 이어진다
  }
  window.dispatchEvent(new Event(CHANGE));
}
export function subscribeGuest(onChange: () => void): () => void {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}
/** 이 링크(세션)의 보관된 신원. 서버 렌더에서는 null */
export function useStoredGuest(token: string): StoredGuest | null {
  const raw = useSyncExternalStore(subscribeGuest, () => readGuestRaw(token), () => "");
  return parseGuest(raw);
}

const SEP = "\u0000";
/** 여러 앨범(세션) 토큰의 보관된 신원 — 앨범마다 토큰이 따로라 한 번에 읽는다 */
export function useStoredGuests(tokens: readonly string[]): ReadonlyMap<string, StoredGuest> {
  const key = tokens.join(SEP);
  const raw = useSyncExternalStore(
    subscribeGuest,
    () => tokens.map(readGuestRaw).join(SEP),
    () => "",
  );
  return useMemo(() => {
    const map = new Map<string, StoredGuest>();
    const list = key ? key.split(SEP) : [];
    const raws = raw.split(SEP);
    list.forEach((t, i) => {
      const g = parseGuest(raws[i] ?? "");
      if (g) map.set(t, g);
    });
    return map;
  }, [key, raw]);
}
