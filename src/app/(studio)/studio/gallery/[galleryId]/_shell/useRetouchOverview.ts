"use client";

/**
 * 보정 회차 감시 — 회차 목록 · 진행 중 회차의 항목 · 남은 횟수 (작가 3단계)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/useRetouchOverview.ts
 *
 * 서버 푸시가 없어 탭이 보이는 동안 15초마다 다시 읽고 창으로 돌아올 때 즉시 읽는다(2차 요청 · 확정을 따라간다).
 * 끝난 회차(COMPLETED)의 항목 · 결과 URL은 GET rounds/{n}으로 따로 읽는다(전/후 비교 · 지난 회차 보기).
 */

import { useCallback, useEffect, useState } from "react";
import { getRetouchOverview, getRetouchRound, type RetouchOverviewResponse, type RetouchRoundDetailResponse } from "@/lib/api/retouch";

const INTERVAL_MS = 15_000;

export function useRetouchOverview(galleryId: number, enabled: boolean) {
  const [overview, setOverview] = useState<RetouchOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await getRetouchOverview(galleryId);
        if (!cancelled) {
          setOverview(res);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("보정 회차를 불러오지 못했어요");
      }
    }
    void tick();
    const timer = setInterval(() => void tick(), INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") void tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [galleryId, enabled, nonce]);

  return { overview, error, reload };
}

/** 회차 하나의 상세(결과 URL 포함) — roundNo가 바뀌거나 nonce가 오르면 다시 읽는다 */
export function useRetouchRoundDetail(galleryId: number, roundNo: number | null, nonce: number) {
  const [detail, setDetail] = useState<RetouchRoundDetailResponse | null>(null);
  useEffect(() => {
    if (roundNo === null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getRetouchRound(galleryId, roundNo);
        if (!cancelled) setDetail(res);
      } catch {
        if (!cancelled) setDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, roundNo, nonce]);
  return detail;
}
