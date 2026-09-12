"use client";

/**
 * AI 추천 진행 — 요청 → 잡 폴링(3초) → 이번 라운드 결과 · 이유 준비까지
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useAiRecommendations.ts
 *
 * 처음 들어오면 지난 추천이 있는지 한 번 읽는다. "AI 추천"을 누르면 POST 뒤 GET을 3초마다 읽어 잡이 끝나고
 * 이번 라운드 사진의 이유가 다 채워지면(또는 90초가 지나면) 멈춘다. 결과는 photos 중 round가 이번 라운드인 것만.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { type AiRecommendation, type AiRecommendationList, getRecommendations, requestRecommendations } from "@/lib/api/recommendations";

const POLL_MS = 3_000;
const REASON_WAIT_MS = 90_000;

export type AiPhase = "idle" | "requesting" | "running" | "done" | "failed";

export function useAiRecommendations(galleryId: number) {
  const [list, setList] = useState<AiRecommendationList | null>(null);
  const [phase, setPhase] = useState<AiPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(0);
  // 타이머가 늘 최신 poll을 부르도록(자기 참조 useCallback은 React Compiler가 메모를 못 지킨다)
  const pollRef = useRef<() => Promise<void>>(async () => {});

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }
  function later(ms: number) {
    timerRef.current = setTimeout(() => void pollRef.current(), ms);
  }

  async function poll() {
    timerRef.current = null;
    try {
      const next = await getRecommendations(galleryId);
      setList(next);
      const job = next.job;
      const round = job?.round ?? next.round;
      const current = round === null ? [] : next.photos.filter((p) => p.round === round);
      const reasonsPending = current.some((p) => !p.reasonReady);
      if (job?.status === "FAILED") {
        setPhase("failed");
        setError(job.error ?? "AI 추천을 만들지 못했어요 · 다시 시도해 주세요");
        return;
      }
      const running = job?.status === "PENDING" || job?.status === "RUNNING";
      const waitedTooLong = Date.now() - startedRef.current > REASON_WAIT_MS;
      if (running || (reasonsPending && !waitedTooLong)) {
        setPhase("running");
        later(POLL_MS);
        return;
      }
      setPhase(current.length > 0 ? "done" : "idle");
    } catch {
      // 다음 폴링에서 다시 — 진행 중이면 계속 돈다
      later(POLL_MS);
    }
  }
  useEffect(() => {
    pollRef.current = poll;
  });

  // 처음 한 번 — 지난 추천이 있으면 보여 주고, 진행 중인 잡이 있으면 이어서 폴링
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getRecommendations(galleryId);
        if (cancelled) return;
        setList(next);
        const job = next.job;
        if (job && (job.status === "PENDING" || job.status === "RUNNING")) {
          startedRef.current = Date.now();
          setPhase("running");
          timerRef.current = setTimeout(() => void pollRef.current(), POLL_MS);
        } else if (next.round !== null && next.photos.some((p) => p.round === (job?.round ?? next.round))) {
          setPhase("done");
        }
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
    setPhase("requesting");
    startedRef.current = Date.now();
    try {
      await requestRecommendations(galleryId, detailFolderId ? { detailFolderId } : {});
      setPhase("running");
      later(1_500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // 이미 도는 잡이 있다 — 그 잡을 따라간다
        setPhase("running");
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

  return { list, current, byPhotoId, phase, error, request, clearError: () => setError(null) };
}
