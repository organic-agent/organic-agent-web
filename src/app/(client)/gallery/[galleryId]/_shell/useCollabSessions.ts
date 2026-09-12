"use client";

/**
 * 공유폴더 목록 상태 — 사이드바 공유 탭 · 게스트 초대 모달이 같이 쓴다
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useCollabSessions.ts
 *
 * 처음 한 번 읽고, 만들기 · 이름 바꾸기 · 폐기 · 재발행 뒤에는 목록을 다시 읽는다(만들기 응답에 본문이 없다).
 */

import { useCallback, useEffect, useState } from "react";
import { listCollabSessions, type CollabSessionResponse } from "@/lib/api/collab";

export type CollabSessions = {
  /** null = 아직 안 읽음 */
  sessions: CollabSessionResponse[] | null;
  error: boolean;
  reload: () => Promise<CollabSessionResponse[] | null>;
};

export function useCollabSessions(galleryId: number, enabled: boolean): CollabSessions {
  const [sessions, setSessions] = useState<CollabSessionResponse[] | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await listCollabSessions(galleryId);
      setSessions(list);
      setError(false);
      return list;
    } catch {
      setError(true);
      return null;
    }
  }, [galleryId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listCollabSessions(galleryId);
        if (!cancelled) {
          setSessions(list);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, enabled]);

  return { sessions, error, reload };
}

/** 남은 기간 문구 — 폐기 · 만료 · n일 남음 · 오늘 만료 */
export function sessionTermLabel(s: CollabSessionResponse): { text: string; live: boolean } {
  if (s.revoked) return { text: "폐기됨", live: false };
  if (!s.expiresAt) return { text: "기한 없음", live: true };
  const days = Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return { text: "", live: true };
  if (days < 0) return { text: "만료됨", live: false };
  if (days === 0) return { text: "오늘 만료", live: true };
  return { text: `${days}일 남음`, live: true };
}

export const isLiveSession = (s: CollabSessionResponse) => sessionTermLabel(s).live;

/** 화면에는 프로토콜을 뺀 주소만 — 복사는 전체 URL */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, "");
