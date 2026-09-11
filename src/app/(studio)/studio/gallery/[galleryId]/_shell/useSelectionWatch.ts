"use client";

/**
 * 선택 앨범 자동 갱신 — 클라이언트가 담으면 스튜디오 화면에 곧 반영되게
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/useSelectionWatch.ts
 *
 * 서버 푸시가 없어 탭이 보이는 동안 10초마다 다시 읽고, 창으로 돌아올 때 즉시 읽는다.
 * 선택 앨범이 아직 없으면(404 등) null. 함께 이 갤러리의 안 읽은 장수 상향 요청 알림도 받는다.
 */

import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  type UserNotificationResponse,
} from "@/lib/api/notifications";
import { getPhotoSelection, type PhotoSelectionResponse } from "@/lib/api/selection";

const INTERVAL_MS = 10_000;

export function useSelectionWatch(galleryId: number, enabled: boolean) {
  const [selection, setSelection] = useState<PhotoSelectionResponse | null>(null);
  const [quotaRequest, setQuotaRequest] = useState<UserNotificationResponse | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await getPhotoSelection(galleryId);
        if (!cancelled) setSelection(res);
      } catch {
        if (!cancelled) setSelection(null);
      }
      try {
        const list = await listNotifications({ scope: "GALLERY", scopeId: galleryId });
        if (cancelled) return;
        const pending = list.find(
          (n) => n.type === "SELECTION_INCREASE_REQUESTED" && n.readAt === null,
        );
        setQuotaRequest(pending ?? null);
      } catch {
        // 알림 실패는 조용히 — 선택 앨범이 더 중요하다
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [galleryId, enabled, nonce]);

  return { selection, quotaRequest, reload };
}
