"use client";

/**
 * 사진 주소(viewUrl) 갈아 주기 — 서버가 준 주소는 15분 뒤 만료된다(view-url-ttl)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/usePhotoUrlRefresh.ts
 *
 * 목록을 한 번 읽고 오래 머물면 아직 안 그려 본 사진의 주소가 죽어, 크게 보기로 넘기다 사진이 더 뜨지 않았다(2차 QA).
 * 만료 3분 전(읽은 지 12분)에 목록을 다시 읽어 새 주소로 바꾼다 — 탭이 보일 때만, 숨어 있었으면 돌아왔을 때.
 * 그래도 사진이 안 그려지면(절전에서 깨어난 직후 등) 돌려준 함수를 불러 바로 한 번 더 읽는다.
 * 이미 그려진 사진은 새 주소가 다 받아질 때까지 그대로 보인다(브라우저 동작).
 */

import { useCallback, useEffect, useRef } from "react";

const REFRESH_AFTER_MS = 12 * 60_000;
const CHECK_EVERY_MS = 60_000;
/** 다시 읽기를 연달아 부르지 않는 간격 */
const RETRY_GAP_MS = 30_000;

export function usePhotoUrlRefresh(enabled: boolean, loadedAt: number, refresh: () => Promise<void>): () => void {
  const busyRef = useRef(false);
  const lastTryRef = useRef(0);

  const run = useCallback(async () => {
    if (busyRef.current || Date.now() - lastTryRef.current < RETRY_GAP_MS) return;
    busyRef.current = true;
    lastTryRef.current = Date.now();
    try {
      await refresh();
    } finally {
      busyRef.current = false;
    }
  }, [refresh]);

  useEffect(() => {
    if (!enabled || loadedAt === 0) return;
    function check() {
      if (document.visibilityState === "visible" && Date.now() - loadedAt >= REFRESH_AFTER_MS) void run();
    }
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled, loadedAt, run]);

  return useCallback(() => {
    if (enabled) void run();
  }, [enabled, run]);
}
