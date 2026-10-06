"use client";

/**
 * AI 추천 진행 — 요청 → 잡 폴링 → 이번 라운드 사진이 뜨면 로딩 끝
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useAiRecommendations.ts
 *
 * 서버 잡은 사진을 골라 추천 행을 저장하고 라운드를 확정(job.round가 생긴다)한 뒤 DONE이 된다. 화면은 이번 라운드
 * 사진이 보이는 순간 로딩을 끝내고(phase "done"), 잡이 DONE이 될 때까지는 뒤에서 느슨하게 따라간다 — 잡이 도는 동안
 * 새 요청은 409라 jobActive로 요청 버튼을 끈다(따라가기는 10분 상한). 처음 들어오면 지난 추천이 있는지 한 번 읽고,
 * 도는 잡이 있으면 같은 규칙으로 따라간다. 결과는 photos 중 round가 이번 라운드인 것만.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { type AiRecommendation, type AiRecommendationList, getRecommendations, requestRecommendations } from "@/lib/api/recommendations";

/** 사진을 고르는 동안(라운드 확정 전) */
const POLL_MS = 3_000;
/** 사진이 뜬 뒤 잡이 끝나기를 기다리는 동안 — 화면을 막지 않으니 느슨하게 */
const SETTLE_POLL_MS = 5_000;
/** 잡 따라가기 상한 — 넘으면 멈추고 요청 버튼을 다시 연다 */
const SETTLE_WAIT_MS = 10 * 60_000;

export type AiPhase = "idle" | "requesting" | "running" | "done" | "failed";

export function useAiRecommendations(galleryId: number) {
  const [list, setList] = useState<AiRecommendationList | null>(null);
  const [phase, setPhase] = useState<AiPhase>("idle");
  /** 서버 잡이 아직 도는 중 — 새 요청은 409 */
  const [jobActive, setJobActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(0);
  // 타이머 · 첫 로드가 늘 최신 함수를 부르도록(자기 참조 useCallback은 React Compiler가 메모를 못 지킨다)
  const pollRef = useRef<() => Promise<void>>(async () => {});
  const settleRef = useRef<(next: AiRecommendationList, initial: boolean) => number | null>(() => null);

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }
  function later(ms: number) {
    timerRef.current = setTimeout(() => void pollRef.current(), ms);
  }

  /**
   * 응답 하나를 화면 상태로 옮기고 다음 폴링까지의 간격(ms)을 돌려준다. null이면 폴링을 멈춘다.
   * initial = 화면에 들어와 처음 읽은 것 — 지난 실패를 지금의 오류로 띄우지 않는다.
   */
  function settle(next: AiRecommendationList, initial: boolean): number | null {
    setList(next);
    const job = next.job;
    const active = job?.status === "PENDING" || job?.status === "RUNNING";
    // ① 고르는 중 — 잡이 도는데 아직 라운드가 확정되지 않았다(추천 행이 없다). 지난 라운드 사진은 그대로 보인다
    if (job && active && job.round === null) {
      setJobActive(true);
      setPhase("running");
      return POLL_MS;
    }
    const round = job?.round ?? next.round;
    const current = round === null ? [] : next.photos.filter((p) => p.round === round);
    if (current.length > 0) {
      // ② 사진이 떴다 — 로딩은 끝. 잡이 아직 돌면 DONE이 될 때까지 뒤에서 따라간다
      const waitedTooLong = Date.now() - startedRef.current > SETTLE_WAIT_MS;
      setJobActive(active && !waitedTooLong);
      setPhase("done");
      return active && !waitedTooLong ? SETTLE_POLL_MS : null;
    }
    setJobActive(active);
    if (job?.status === "FAILED" && !initial) {
      setPhase("failed");
      // 서버가 남긴 오류 글은 사용자용 문장이 아니라 보여 주지 않는다(문구 점검 C27)
      setError("AI 추천을 만들지 못했어요 · 다시 시도해 주세요");
      return null;
    }
    if (active) {
      // 라운드는 확정됐는데 이 응답에 사진이 없다 — 잡이 끝날 때까지 따라간다
      setPhase("running");
      return POLL_MS;
    }
    setPhase("idle");
    return null;
  }

  async function poll() {
    timerRef.current = null;
    try {
      const delay = settle(await getRecommendations(galleryId), false);
      if (delay !== null) later(delay);
    } catch {
      // 다음 폴링에서 다시 — 진행 중이면 계속 돈다
      later(POLL_MS);
    }
  }
  useEffect(() => {
    pollRef.current = poll;
    settleRef.current = settle;
  });

  // 처음 한 번 — 지난 추천이 있으면 보여 주고, 진행 중인 잡이 있으면 이어서 폴링
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getRecommendations(galleryId);
        if (cancelled) return;
        const job = next.job;
        if (job && (job.status === "PENDING" || job.status === "RUNNING")) startedRef.current = Date.now();
        const delay = settleRef.current(next, true);
        if (delay !== null) timerRef.current = setTimeout(() => void pollRef.current(), delay);
      } catch {
        // 추천이 없거나 못 읽음 — 버튼만 남는다
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [galleryId]);

  /** 한 라운드 요청 — detailFolderId가 있으면 그 폴더만 */
  async function request(detailFolderId?: number | null) {
    stop();
    setError(null);
    const before = phase;
    setPhase("requesting");
    startedRef.current = Date.now();
    try {
      await requestRecommendations(galleryId, detailFolderId ? { detailFolderId } : {});
      setJobActive(true);
      setPhase("running");
      later(1_500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // 이미 도는 잡이 있다 — 그 잡을 따라간다. 사진이 떠 있었으면 로딩으로 되돌리지 않는다
        setJobActive(true);
        setPhase(before === "done" ? "done" : "running");
        later(1_000);
        return;
      }
      setPhase(list && list.round !== null ? "done" : "idle");
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요");
    }
  }

  /** 이번 라운드의 추천만 */
  const current = useMemo<AiRecommendation[]>(() => {
    if (!list) return [];
    const round = list.job?.round ?? list.round;
    if (round === null) return [];
    return list.photos.filter((p) => p.round === round).sort((a, b) => a.rank - b.rank);
  }, [list]);

  const byPhotoId = useMemo(() => new Map(current.map((r) => [r.photo.photoId, r])), [current]);

  return { list, current, byPhotoId, phase, jobActive, error, request, clearError: () => setError(null) };
}
