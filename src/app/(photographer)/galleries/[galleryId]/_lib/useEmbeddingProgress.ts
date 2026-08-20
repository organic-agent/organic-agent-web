/**
 * 작가 — 사진 분석(임베딩) 자동 실행·진행 폴링 훅
 * 위치: src/app/(photographer)/galleries/[galleryId]/_lib/useEmbeddingProgress.ts
 *
 * 시안 v5 확정: 전용 UI 없음. 하는 일은 세 가지다 —
 * ① 진입·업로드 완료 시 미분석 사진(UPLOADED)이 있으면 임베딩 실행을
 *    자동 호출한다(서버는 남은 것만 이어서 처리 — 멱등에 가까움).
 * ② 집계(summary)를 폴링해 embedded가 늘면 onProgress를 불러 화면이
 *    준비 중 셀을 실사진으로 갈아끼우게 한다.
 * ③ 실패는 조용히 다룬다 — 502(호출 실패)는 다음 주기에 재실행,
 *    503(임베딩 환경 미설정 — 로컬 정상)은 이 세션에서 폴링을 멈춘다.
 *    사용자를 막는 오류 UI는 없다.
 */

import { useEffect, useRef } from "react";
import { ApiError } from "@/lib/api/client";
import { getPhotoSummary, runEmbedding } from "@/lib/api/photos";

const POLL_START_MS = 4_000;
const POLL_MAX_MS = 12_000;

export function useEmbeddingProgress(
  rawId: string,
  onProgress: () => void,
) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;

  const timerRef = useRef<number | null>(null);
  const disabledRef = useRef(false); // 503 — 이 세션에선 다시 시도하지 않음
  const activeRef = useRef(false); // 폴링 루프 중복 방지
  const prevEmbeddedRef = useRef<number | null>(null);
  const delayRef = useRef(POLL_START_MS);
  const onProgressRef = useRef(onProgress);
  const startRef = useRef<() => void>(() => {});

  // onProgress는 매 렌더 새로 만들어질 수 있어 ref로 최신본만 유지
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    disabledRef.current = false;

    async function tryRun() {
      try {
        await runEmbedding(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          disabledRef.current = true; // 환경 미설정 — 조용히 종료
        }
        // 502·네트워크 등은 다음 폴링 주기의 재실행에 맡긴다
      }
    }

    async function tick() {
      if (cancelled || disabledRef.current) {
        activeRef.current = false;
        return;
      }
      try {
        const summary = await getPhotoSummary(id);
        if (cancelled) return;

        if (
          prevEmbeddedRef.current !== null &&
          summary.embedded > prevEmbeddedRef.current
        ) {
          onProgressRef.current(); // 새로 분석된 사진 — 목록 조용히 갱신
          delayRef.current = POLL_START_MS; // 진행 중이면 촘촘하게
        } else {
          delayRef.current = Math.min(delayRef.current * 1.5, POLL_MAX_MS);
        }
        prevEmbeddedRef.current = summary.embedded;

        if (summary.uploaded === 0) {
          activeRef.current = false; // 분석할 것이 없다 — 폴링 종료
          return;
        }
        await tryRun(); // 남은 분이 있는데 실행이 죽었을 수 있다 — 재실행(멱등)
      } catch {
        // 집계 실패 — 다음 주기에 재시도
        delayRef.current = Math.min(delayRef.current * 1.5, POLL_MAX_MS);
      }
      if (cancelled || disabledRef.current) {
        activeRef.current = false;
        return;
      }
      timerRef.current = window.setTimeout(() => void tick(), delayRef.current);
    }

    function startLoop() {
      if (activeRef.current || disabledRef.current) return;
      activeRef.current = true;
      delayRef.current = POLL_START_MS;
      void tick();
    }

    startRef.current = startLoop;
    startLoop();

    return () => {
      cancelled = true;
      activeRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [id, validId]);

  /** 업로드 완료 직후 호출 — 실행·폴링을 다시 깨운다. */
  function notifyUploaded() {
    startRef.current();
  }

  return { notifyUploaded };
}
