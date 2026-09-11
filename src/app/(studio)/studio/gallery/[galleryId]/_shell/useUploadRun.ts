"use client";

/**
 * 업로드 실행기 — 100장씩 리사이즈 → 발급 → S3 PUT ×6 → 50장마다 완료 통보
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/useUploadRun.ts
 *
 * 팀 test-web의 GalleryWorkspace.upload 루프를 훅으로 옮긴 것. 발급이 리사이즈 뒤인 이유는
 * 서명에 Content-Length · CRC32C가 들어가서다 — 줄인 결과의 크기를 알아야 URL을 받을 수 있다.
 * 묶음 k를 올리는 동안 k+1을 줄여 워커와 네트워크가 같이 일한다.
 *
 * 실패 규칙: 5xx · 네트워크는 같은 URL로 백오프 재시도(멱등), 4xx는 서명 · 체크섬 불일치라
 * 같은 바이트로 재발급 1회. 파일 하나의 실패는 그 파일만 실패로 남기고 나머지는 계속 올린다.
 * 완료 통보에 실패한 사진은 서버가 발급 1분 뒤부터 S3를 직접 확인해 옮기므로 "서버가 확인 중"으로만 센다.
 *
 * 이어 올리기(resume): 끊겼던 PENDING 사진을 같은 행에 새 URL로(재발급) — 사진이 두 번 생기지 않는다.
 * 실패분 다시 올리기도 발급이 끝난 파일은 이 길로 간다.
 *
 * 일시정지는 새 PUT을 시작하지 않는 것이다(진행 중인 전송은 끝까지). 취소는 진행 중 전송을 끊고,
 * 이미 올라간 사진은 서버에 남는다(발급만 된 사진은 기억에 남아 복구 배너의 대상이 된다).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  completePhotoUploads,
  issueUploadUrls,
  putToS3,
  reissueUploadUrls,
  S3PutError,
} from "@/lib/api/photos";
import type { PreparedFile } from "@/lib/upload/masterResize";
import {
  UPLOAD_COMPLETE_BATCH,
  UPLOAD_ISSUE_BATCH,
  UPLOAD_PUT_CONCURRENCY,
  UPLOAD_PUT_RETRY_MS,
} from "@/lib/upload/masterSpec";
import { forgetUploaded, rememberIssued } from "./uploadMemory";
import {
  chunk,
  describeUploadError,
  prepareCached,
  releasePrepared,
  uploadContentType,
} from "./uploadSupport";

export type UploadPhase = "idle" | "running" | "paused" | "finished";

export type UploadRun = {
  phase: UploadPhase;
  total: number;
  /** S3 PUT까지 끝난 수 */
  done: number;
  failed: number;
  /** 0~1 — 파일별 전송 비율의 평균 */
  ratio: number;
  /** 브라우저에서 긴 변 2048로 줄여 올린 수 */
  resized: number;
  /** S3에는 올라갔지만 완료 통보를 못 보낸 수 — 서버가 1분 뒤부터 직접 확인해 옮긴다 */
  pendingServerCheck: number;
  failedFiles: File[];
  etaSeconds: number | null;
  /** 묶음 단위 오류(발급 거절 등)의 마지막 문구 */
  error: string | null;
  aborted: boolean;
};

/** 끊겼던 PENDING 사진을 같은 행에 이어 올릴 때 — 파일과 처음 발급 때 받은 사진 번호 */
export type ResumeItem = { file: File; photoId: number };

type Callbacks = {
  /** 완료 통보가 성공한 사진 번호들 — 화면이 사진 목록을 조용히 다시 읽는 신호 */
  onBatchUploaded?: (photoIds: number[]) => void;
  onFinished?: (result: { done: number; failed: number; aborted: boolean }) => void;
};

type Issued = {
  file: File;
  prepared: PreparedFile;
  photoId: number;
  uploadUrl: string;
  contentType: string;
};

const IDLE: UploadRun = {
  phase: "idle",
  total: 0,
  done: 0,
  failed: 0,
  ratio: 0,
  resized: 0,
  pendingServerCheck: 0,
  failedFiles: [],
  etaSeconds: null,
  error: null,
  aborted: false,
};

const PUBLISH_THROTTLE_MS = 150;
const ETA_MIN_DONE = 3;
const ETA_MIN_ELAPSED_MS = 3000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useUploadRun(galleryId: number, callbacks: Callbacks = {}) {
  const [run, setRun] = useState<UploadRun>(IDLE);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const controllerRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const waitersRef = useRef<(() => void)[]>([]);
  /** 발급까지 끝났는데 PUT에 실패한 파일 — 다시 올리기는 재발급으로 같은 행에 */
  const failedIssuedRef = useRef(new Map<File, number>());
  const lastFailedRef = useRef<File[]>([]);

  const wake = useCallback(() => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const resolve of waiters) resolve();
  }, []);

  const start = useCallback(
    async (files: File[], resume: ResumeItem[] = []) => {
      if (runningRef.current) return;
      if (files.length === 0 && resume.length === 0) return;
      runningRef.current = true;
      pausedRef.current = false;
      const controller = new AbortController();
      controllerRef.current = controller;
      failedIssuedRef.current = new Map();

      const total = files.length + resume.length;
      const ratioByFile = new Map<File, number>();
      const failedFiles: File[] = [];
      const completedIds: number[] = [];
      let done = 0;
      let resized = 0;
      let pendingServerCheck = 0;
      let error: string | null = null;
      const startedAt = Date.now();
      let lastPublish = 0;

      function publish(force = false) {
        const now = Date.now();
        if (!force && now - lastPublish < PUBLISH_THROTTLE_MS) return;
        lastPublish = now;
        let sum = 0;
        for (const ratio of ratioByFile.values()) sum += ratio;
        const elapsed = now - startedAt;
        const etaSeconds =
          done >= ETA_MIN_DONE && elapsed >= ETA_MIN_ELAPSED_MS
            ? ((total - done) * (elapsed / done)) / 1000
            : null;
        setRun({
          phase: pausedRef.current ? "paused" : "running",
          total,
          done,
          failed: failedFiles.length,
          ratio: total ? sum / total : 0,
          resized,
          pendingServerCheck,
          failedFiles: [...failedFiles],
          etaSeconds,
          error,
          aborted: false,
        });
      }

      async function waitIfPaused() {
        while (pausedRef.current && !controller.signal.aborted) {
          await new Promise<void>((resolve) => waitersRef.current.push(resolve));
        }
      }

      function prepare(file: File): Promise<PreparedFile | null> {
        return prepareCached(file).catch((err: unknown) => {
          console.warn(`리사이즈 준비 실패: ${file.name}`, err);
          return null;
        });
      }

      /** 새 파일 묶음 — 줄이고 → 발급 → 인덱스로 짝짓기 */
      async function prepareFreshBatch(batch: File[]): Promise<Issued[]> {
        const prepared = await Promise.all(batch.map(prepare));
        if (controller.signal.aborted) return [];
        const ready: { file: File; prepared: PreparedFile }[] = [];
        batch.forEach((file, i) => {
          const item = prepared[i];
          if (item) ready.push({ file, prepared: item });
          else failedFiles.push(file);
        });
        if (ready.length === 0) return [];
        let res;
        try {
          res = await issueUploadUrls(
            galleryId,
            ready.map(({ file, prepared: item }) => ({
              fileName: file.name,
              contentType: uploadContentType(file),
              contentLength: item.blob.size,
              crc32c: item.crc32c,
            })),
          );
        } catch (err) {
          // 묶음 전체가 거절됐다(크기 · 형식 · 플랜 한도 등) — 이 묶음만 실패로
          for (const { file } of ready) failedFiles.push(file);
          error = describeUploadError(err);
          publish(true);
          return [];
        }
        const issued: Issued[] = [];
        ready.forEach(({ file, prepared: item }, i) => {
          const upload = res.uploads[i];
          if (upload)
            issued.push({
              file,
              prepared: item,
              photoId: upload.photoId,
              uploadUrl: upload.uploadUrl,
              contentType: uploadContentType(file),
            });
          else failedFiles.push(file);
        });
        rememberIssued(
          galleryId,
          issued.map((job) => ({
            photoId: job.photoId,
            fileName: job.file.name,
            size: job.file.size,
            contentType: job.contentType,
            issuedAt: startedAt,
          })),
        );
        return issued;
      }

      /** 이어 올리기 묶음 — 줄이고 → 재발급(같은 행) → 짝짓기 */
      async function prepareResumeBatch(batch: ResumeItem[]): Promise<Issued[]> {
        const prepared = await Promise.all(batch.map((item) => prepare(item.file)));
        if (controller.signal.aborted) return [];
        const ready: { item: ResumeItem; prepared: PreparedFile }[] = [];
        batch.forEach((item, i) => {
          const done = prepared[i];
          if (done) ready.push({ item, prepared: done });
          else failedFiles.push(item.file);
        });
        if (ready.length === 0) return [];
        let res;
        try {
          res = await reissueUploadUrls(
            galleryId,
            ready.map(({ item, prepared: done }) => ({
              photoId: item.photoId,
              contentLength: done.blob.size,
              crc32c: done.crc32c,
            })),
          );
        } catch (err) {
          for (const { item } of ready) failedFiles.push(item.file);
          error = describeUploadError(err);
          publish(true);
          return [];
        }
        const byId = new Map(res.uploads.map((upload) => [upload.photoId, upload.uploadUrl]));
        const issued: Issued[] = [];
        for (const { item, prepared: done } of ready) {
          const uploadUrl = byId.get(item.photoId);
          if (uploadUrl)
            issued.push({
              file: item.file,
              prepared: done,
              photoId: item.photoId,
              uploadUrl,
              contentType: uploadContentType(item.file),
            });
          else failedFiles.push(item.file);
        }
        return issued;
      }

      async function flushComplete(final = false) {
        if (completedIds.length === 0) return;
        const ids = completedIds.splice(0);
        try {
          await completePhotoUploads(galleryId, ids);
          forgetUploaded(galleryId, ids);
          callbacksRef.current.onBatchUploaded?.(ids);
        } catch {
          if (final) {
            // 서버가 발급 1분 뒤부터 직접 확인한다 — 버리지 않고 알려만 준다
            pendingServerCheck += ids.length;
            forgetUploaded(galleryId, ids);
            publish(true);
          } else completedIds.unshift(...ids);
        }
      }

      /** 네트워크 · 5xx는 같은 URL로 재시도(멱등). 4xx는 같은 바이트로 재발급 1회 */
      async function put(job: Issued): Promise<void> {
        let url = job.uploadUrl;
        let reissued = false;
        for (let attempt = 0; ; attempt += 1) {
          await waitIfPaused();
          if (controller.signal.aborted) throw new DOMException("업로드 중단", "AbortError");
          try {
            await putToS3(url, job.prepared.blob, {
              contentType: job.contentType,
              crc32c: job.prepared.crc32c,
              onProgress: (ratio) => {
                ratioByFile.set(job.file, ratio);
                publish();
              },
              signal: controller.signal,
            });
            return;
          } catch (err) {
            if (controller.signal.aborted) throw err;
            const status = err instanceof S3PutError ? err.status : 0;
            if (status >= 400 && status < 500) {
              if (reissued) throw err;
              reissued = true;
              const res = await reissueUploadUrls(galleryId, [
                {
                  photoId: job.photoId,
                  contentLength: job.prepared.blob.size,
                  crc32c: job.prepared.crc32c,
                },
              ]);
              url = res.uploads[0]?.uploadUrl ?? url;
              continue;
            }
            if (attempt >= UPLOAD_PUT_RETRY_MS.length) throw err;
            await sleep(UPLOAD_PUT_RETRY_MS[attempt]);
          }
        }
      }

      async function putAll(issued: Issued[]) {
        let cursor = 0;
        async function worker() {
          while (cursor < issued.length && !controller.signal.aborted) {
            await waitIfPaused();
            if (controller.signal.aborted) return;
            const job = issued[cursor++];
            if (job.prepared.resized) resized += 1;
            try {
              await put(job);
            } catch {
              if (controller.signal.aborted) return;
              failedFiles.push(job.file);
              failedIssuedRef.current.set(job.file, job.photoId);
              ratioByFile.set(job.file, 0);
              publish(true);
              continue;
            }
            releasePrepared(job.file);
            ratioByFile.set(job.file, 1);
            completedIds.push(job.photoId);
            done += 1;
            publish(true);
            if (completedIds.length >= UPLOAD_COMPLETE_BATCH) await flushComplete();
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(UPLOAD_PUT_CONCURRENCY, issued.length) }, worker),
        );
      }

      publish(true);
      try {
        // 이어 올리기 먼저, 그다음 새 파일 — 묶음 k를 올리는 동안 k+1을 줄인다(선행 깊이 1)
        const plan: (() => Promise<Issued[]>)[] = [
          ...chunk(resume, UPLOAD_ISSUE_BATCH).map((batch) => () => prepareResumeBatch(batch)),
          ...chunk(files, UPLOAD_ISSUE_BATCH).map((batch) => () => prepareFreshBatch(batch)),
        ];
        let next: Promise<Issued[]> | null = plan.length ? plan[0]() : null;
        for (let i = 0; next && !controller.signal.aborted; i += 1) {
          const issued = await next;
          next = i + 1 < plan.length ? plan[i + 1]() : null;
          if (controller.signal.aborted) break;
          await putAll(issued);
        }
        await flushComplete(true);
      } catch (err) {
        if (!controller.signal.aborted) error = describeUploadError(err);
      }

      // 이번 실행에서 들고 있던 리사이즈 결과는 놓는다(실패분은 다시 올리기를 위해 유지)
      const failedSet = new Set(failedFiles);
      for (const file of files) if (!failedSet.has(file)) releasePrepared(file);
      for (const item of resume) if (!failedSet.has(item.file)) releasePrepared(item.file);

      const aborted = controller.signal.aborted;
      lastFailedRef.current = failedFiles;
      runningRef.current = false;
      controllerRef.current = null;
      pausedRef.current = false;
      setRun({
        phase: "finished",
        total,
        done,
        failed: failedFiles.length,
        ratio: total ? done / total : 0,
        resized,
        pendingServerCheck,
        failedFiles,
        etaSeconds: null,
        error,
        aborted,
      });
      callbacksRef.current.onFinished?.({ done, failed: failedFiles.length, aborted });
    },
    [galleryId],
  );

  /** 진행 중 전송을 끊는다 — 이미 올라간 사진은 서버에 남는다 */
  const abort = useCallback(() => {
    controllerRef.current?.abort();
    pausedRef.current = false;
    wake();
  }, [wake]);

  /** 새 PUT을 시작하지 않는다(진행 중인 전송은 끝까지 간다) */
  const pause = useCallback(() => {
    if (!runningRef.current || pausedRef.current) return;
    pausedRef.current = true;
    setRun((prev) => (prev.phase === "running" ? { ...prev, phase: "paused" } : prev));
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setRun((prev) => (prev.phase === "paused" ? { ...prev, phase: "running" } : prev));
    wake();
  }, [wake]);

  /** 실패분 다시 올리기 — 발급이 끝났던 파일은 재발급으로 같은 행에, 나머지는 새 발급 */
  const retryFailed = useCallback(() => {
    const failed = lastFailedRef.current;
    if (failed.length === 0) return;
    const issued = failedIssuedRef.current;
    const resumeItems: ResumeItem[] = [];
    const fresh: File[] = [];
    for (const file of failed) {
      const photoId = issued.get(file);
      if (photoId !== undefined) resumeItems.push({ file, photoId });
      else fresh.push(file);
    }
    void start(fresh, resumeItems);
  }, [start]);

  /** 끝난 실행의 표시를 지운다(하단 바를 평소 상태로) */
  const reset = useCallback(() => {
    if (runningRef.current) return;
    setRun(IDLE);
  }, []);

  // 화면을 떠나면 진행 중 전송을 끊는다
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return { run, start, abort, pause, resume, retryFailed, reset };
}
