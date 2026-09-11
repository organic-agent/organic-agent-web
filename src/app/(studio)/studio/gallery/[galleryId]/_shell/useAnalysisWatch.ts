"use client";

/**
 * AI 분석 진행 감시 — 사진 요약(카운트)과 분석 잡을 함께 폴링해 진행 · 완료 · 실패를 알린다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/useAnalysisWatch.ts
 *
 * 임베딩(미리보기 · 벡터)과 점수는 서버가 업로드된 사진을 잡과 무관하게 밀고, 카운트로 드러난다.
 * 폴더는 잡 안에서만 생긴다(ANALYZING → CATEGORIZING → DONE). 그래서 앞 두 칸은 카운트가,
 * 뒤 칸은 잡 상태가 진실이다. 카운트는 잡 progress와 사진 요약 어느 쪽이든 같은 프로젝션이다.
 *
 * 폴링 간격: 카운트가 움직이는 동안 3초, 마지막 변화 뒤 1분이 지나면 10초, 탭이 숨겨져 있으면 15초.
 * 5분 동안 그대로면 "멈춘 것 같다"고만 알린다(실패 판정 아님 — 서버가 10분 · 20분에 재시도한다).
 *
 * 잡 요청은 프론트 몫이다. 업로드가 끝나면 request()를 부르고, 이미 도는 잡이 있으면(409) 그 잡이
 * 새 사진을 흡수한다 — 단 이미 분류(CATEGORIZING)에 들어간 잡은 흡수하지 못해 끝난 뒤 한 번 더 요청한다.
 * 탭이 닫혀 요청을 못 보낸 갤러리(올라온 사진은 있는데 잡이 없거나, 점수가 났는데 분류가 안 된 사진이
 * 있는 경우)는 화면에 들어왔을 때 한 번 자동으로 요청한다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANALYSIS_JOB_ALREADY_ACTIVE,
  getLatestAnalysis,
  isAnalysisActive,
  requestAnalysis,
  type AnalysisJobResponse,
} from "@/lib/api/analysis";
import { ApiError } from "@/lib/api/client";
import { materializeAiFolders } from "@/lib/api/conceptFolders";
import { getPhotoSummary, type PhotoSummaryResponse } from "@/lib/api/photos";
import { describeUploadError } from "./uploadSupport";

const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 10_000;
const POLL_HIDDEN_MS = 15_000;
const POLL_ERROR_MS = 12_000;
const FAST_WINDOW_MS = 60_000;
/** 이만큼 진행이 그대로면 "멈춘 것 같다"고 알린다 */
export const STALL_AFTER_MS = 5 * 60_000;

type Callbacks = {
  /** 잡이 DONE으로 바뀐 순간(잡마다 한 번) — 폴더 · 사진 목록을 다시 읽는 신호 */
  onDone?: (job: AnalysisJobResponse) => void;
  /** 임베딩 끝난 수가 늘었다 — 회색 자리를 미리보기로 바꾸는 신호 */
  onEmbeddedChange?: () => void;
};

/** 화면이 그릴 카운트 — 분모(expected)에서 결정적 실패는 뺀다(아니면 100%에 못 닿는다) */
export function analysisCounts(job: AnalysisJobResponse | null, summary: PhotoSummaryResponse | null) {
  if (job?.progress) return job.progress;
  if (summary)
    return {
      expected: Math.max(0, summary.uploaded - summary.failed),
      embedded: summary.embedded,
      scored: summary.scored,
      categorized: summary.categorized,
      failed: summary.failed,
    };
  return null;
}

function signatureOf(job: AnalysisJobResponse | null, summary: PhotoSummaryResponse | null) {
  const counts = analysisCounts(job, summary);
  return [
    job?.jobId ?? "-",
    job?.status ?? "-",
    summary?.uploaded ?? "-",
    counts?.embedded ?? "-",
    counts?.scored ?? "-",
    counts?.categorized ?? "-",
    counts?.failed ?? "-",
  ].join("/");
}

export function useAnalysisWatch(
  galleryId: number,
  { enabled, uploading }: { enabled: boolean; uploading: boolean },
  callbacks: Callbacks = {},
) {
  const [job, setJob] = useState<AnalysisJobResponse | null>(null);
  const [summary, setSummary] = useState<PhotoSummaryResponse | null>(null);
  const [stalled, setStalled] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  const queuedRef = useRef(false);
  const finishedJobsRef = useRef(new Set<number>());
  const signatureRef = useRef("");
  const changedAtRef = useRef(0);
  const embeddedRef = useRef(-1);
  const autoRequestedRef = useRef(false);
  /** 첫 폴링 — 들어왔을 때 이미 끝나 있던 잡은 "완료됨" 신호를 다시 보내지 않는다 */
  const firstPollRef = useRef(true);

  /** 분석 잡 요청. 이미 도는 잡이 있으면 그 잡이 흡수(CATEGORIZING이면 끝난 뒤 한 번 더) */
  const request = useCallback(async () => {
    setError(null);
    try {
      const created = await requestAnalysis(galleryId);
      setJob(created);
      setNonce((n) => n + 1);
    } catch (err) {
      if (err instanceof ApiError && err.code === ANALYSIS_JOB_ALREADY_ACTIVE) {
        const running = await getLatestAnalysis(galleryId).catch(() => null);
        setJob(running);
        if (running?.status === "CATEGORIZING") {
          queuedRef.current = true;
          setQueued(true);
        }
        setNonce((n) => n + 1);
        return;
      }
      setError(describeUploadError(err));
    }
  }, [galleryId]);

  /** 수동 폴백 — 잡이 FAILED로 끝났는데 분류까지는 끝난 경우 폴더만 만든다 */
  const materialize = useCallback(async () => {
    setError(null);
    try {
      await materializeAiFolders(galleryId);
      const latest = await getLatestAnalysis(galleryId).catch(() => null);
      if (latest) {
        finishedJobsRef.current.add(latest.jobId);
        callbacksRef.current.onDone?.(latest);
      }
      setNonce((n) => n + 1);
    } catch (err) {
      setError(describeUploadError(err));
    }
  }, [galleryId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: number | undefined;
    let inFlight = false;

    function schedule(ms: number) {
      if (cancelled) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void poll(), ms);
    }

    async function poll() {
      if (cancelled || inFlight) return;
      if (document.visibilityState !== "visible") {
        schedule(POLL_HIDDEN_MS);
        return;
      }
      inFlight = true;
      try {
        const [latest, latestSummary] = await Promise.all([
          getLatestAnalysis(galleryId),
          getPhotoSummary(galleryId).catch(() => null),
        ]);
        if (cancelled) return;
        setJob(latest);
        if (latestSummary) setSummary(latestSummary);

        const now = Date.now();
        const signature = signatureOf(latest, latestSummary);
        if (signature !== signatureRef.current) {
          signatureRef.current = signature;
          changedAtRef.current = now;
          setStalled(false);
        }

        if (latestSummary && latestSummary.embedded !== embeddedRef.current) {
          const previous = embeddedRef.current;
          embeddedRef.current = latestSummary.embedded;
          if (previous >= 0) callbacksRef.current.onEmbeddedChange?.();
        }

        if (latest && (latest.status === "DONE" || latest.status === "FAILED") && firstPollRef.current) {
          // 들어왔을 때 이미 끝나 있던 잡 — 첫 로드가 폴더 · 사진을 읽었으니 다시 읽지 않는다
          finishedJobsRef.current.add(latest.jobId);
        }
        firstPollRef.current = false;
        if (latest?.status === "DONE" && !finishedJobsRef.current.has(latest.jobId)) {
          finishedJobsRef.current.add(latest.jobId);
          callbacksRef.current.onDone?.(latest);
        }
        if ((latest?.status === "DONE" || latest?.status === "FAILED") && queuedRef.current) {
          // 분류에 들어간 뒤 올린 사진이 있어 예약해 둔 요청 — 끝났으니 이어서
          queuedRef.current = false;
          setQueued(false);
          await request();
          schedule(POLL_FAST_MS); // 요청이 실패해도 폴링은 이어 간다
          return;
        }

        // 탭이 닫혀 요청을 못 보낸 갤러리 — 올라온 사진은 있는데 잡이 없거나, 점수는 났는데 분류가 안 됐다
        const counts = analysisCounts(latest, latestSummary);
        const needsJob =
          latestSummary !== null &&
          counts !== null &&
          !uploading &&
          !isAnalysisActive(latest) &&
          latestSummary.pending === 0 &&
          (latest === null ? counts.expected > 0 : counts.scored > counts.categorized);
        if (needsJob && !autoRequestedRef.current) {
          autoRequestedRef.current = true;
          await request();
          schedule(POLL_FAST_MS);
          return;
        }

        // 서버가 사진을 밀고 있는 동안(카운트가 덜 찼음) · 잡이 도는 동안 · 올리는 동안 계속 본다
        const busyCounts =
          latestSummary !== null &&
          latestSummary.pending + latestSummary.failed + latestSummary.categorized < latestSummary.total;
        const active = isAnalysisActive(latest);
        if (active || uploading || busyCounts) {
          if (now - changedAtRef.current > STALL_AFTER_MS) setStalled(true);
          schedule(now - changedAtRef.current < FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS);
        }
      } catch {
        schedule(POLL_ERROR_MS);
      } finally {
        inFlight = false;
      }
    }

    schedule(100);
    const onVisible = () => {
      // 요청이 진행 중이면 그 요청이 다음 차례를 잡는다 — 폴링 사슬이 둘로 갈라지지 않게
      if (document.visibilityState === "visible" && !inFlight) schedule(50);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [galleryId, enabled, uploading, nonce, request]);

  return { job, summary, stalled, queued, error, request, materialize };
}
