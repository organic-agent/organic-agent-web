"use client";

/**
 * 보정 결과 업로드 실행기 — URL 발급 → S3 PUT(4병렬) → 완료 기록 (작가 3단계)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/useResultUpload.ts
 *
 * 결과 파일은 원본 업로드와 달리 리사이즈 · 체크섬 없이 그대로 올린다(서버가 체크섬 없이 서명 — x-amz-checksum을 붙이면 거절).
 * 발급 · 완료는 20장씩 묶고, 실패한 장은 남겨 다시 올릴 수 있게 한다. 첫 발급에 갤러리 stage가 RETOUCH로 바뀐다.
 */

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { putToS3, S3PutError } from "@/lib/api/photos";
import { completeRetouchResults, issueResultUploadUrls } from "@/lib/api/retouch";

export type ResultAssignment = { file: File; photoId: number };
export type ResultUploadState = {
  running: boolean;
  total: number;
  done: number;
  /** 실패한 파일 이름 → 이유 */
  failed: { file: File; photoId: number; reason: string }[];
};

const BATCH = 20;
const PARALLEL = 4;

export function useResultUpload(galleryId: number, roundNo: number | null, onSettled: () => void) {
  const [state, setState] = useState<ResultUploadState>({ running: false, total: 0, done: 0, failed: [] });
  const abortRef = useRef<AbortController | null>(null);

  async function run(assignments: ResultAssignment[]) {
    if (roundNo === null || assignments.length === 0 || state.running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ running: true, total: assignments.length, done: 0, failed: [] });
    const failed: ResultUploadState["failed"] = [];
    let done = 0;
    try {
      for (let i = 0; i < assignments.length; i += BATCH) {
        if (controller.signal.aborted) break;
        const batch = assignments.slice(i, i + BATCH);
        let issued: { photoId: number; resultKey: string; uploadUrl: string }[];
        try {
          const res = await issueResultUploadUrls(
            galleryId,
            roundNo,
            batch.map((a) => ({ photoId: a.photoId, contentType: a.file.type || "image/jpeg" })),
          );
          issued = res.uploads;
        } catch (err) {
          const reason = err instanceof ApiError ? err.message : "업로드 URL을 받지 못했어요";
          for (const a of batch) failed.push({ ...a, reason });
          done += batch.length;
          setState({ running: true, total: assignments.length, done, failed: [...failed] });
          continue;
        }
        const byPhoto = new Map(issued.map((u) => [u.photoId, u]));
        const completed: { photoId: number; resultKey: string; contentType: string }[] = [];
        // 4병렬 PUT
        let cursor = 0;
        async function worker() {
          while (cursor < batch.length && !controller.signal.aborted) {
            const a = batch[cursor++];
            const u = byPhoto.get(a.photoId);
            if (!u) {
              failed.push({ ...a, reason: "이 회차에 없는 사진이에요" });
            } else {
              try {
                await putToS3(u.uploadUrl, a.file, { contentType: a.file.type || "image/jpeg", signal: controller.signal });
                completed.push({ photoId: a.photoId, resultKey: u.resultKey, contentType: a.file.type || "image/jpeg" });
              } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                failed.push({ ...a, reason: err instanceof S3PutError ? err.message : "S3 업로드 실패" });
              }
            }
            done++;
            setState({ running: true, total: assignments.length, done, failed: [...failed] });
          }
        }
        await Promise.all(Array.from({ length: Math.min(PARALLEL, batch.length) }, worker));
        if (completed.length > 0) {
          try {
            await completeRetouchResults(galleryId, roundNo, completed);
          } catch (err) {
            const reason = err instanceof ApiError ? err.message : "결과 기록에 실패했어요";
            for (const c of completed) {
              const a = batch.find((b) => b.photoId === c.photoId);
              if (a) failed.push({ ...a, reason });
            }
          }
        }
      }
    } finally {
      abortRef.current = null;
      setState({ running: false, total: assignments.length, done, failed });
      onSettled();
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }
  function clearFailed() {
    setState((s) => ({ ...s, failed: [] }));
  }

  return { state, run, cancel, clearFailed };
}
