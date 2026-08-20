/**
 * 작가 — 사진 업로드 큐 훅 (발급 → S3 직접 PUT → 완료 통보)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_lib/useUploadQueue.ts
 *
 * 시안 v5의 "선택 즉시 업로드"를 담당한다. 파일이 들어오면 검증 후 바로
 * 발급·업로드가 시작되고, S3 성공분은 짧은 디바운스로 모아 일괄 통보한다
 * (통보는 멱등). 부분 실패 시 성공분은 이미 서버에 남고, 실패분만 재시도한다
 * — S3까지 갔는데 통보만 실패한 파일은 재시도 때 통보만 다시 보낸다.
 *
 * 동시 업로드는 3개 병렬(브라우저 연결 제한 고려), 중단 시 진행 중인
 * XHR을 abort한다. 성공분은 이미 통보돼 서버에 남는다.
 */

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  completePhotoUploads,
  issueUploadUrls,
  putToS3,
} from "@/lib/api/photos";

export type UploadEntryStatus =
  | "waiting"
  | "uploading"
  | "done"
  | "failed"
  | "excluded";

export type UploadEntry = {
  id: string;
  fileName: string;
  size: number;
  /** 로컬 미리보기(objectURL). 제외 파일은 null. */
  previewUrl: string | null;
  contentType: string;
  status: UploadEntryStatus;
  /** 0~1. uploading에서만 의미 있다. */
  progress: number;
  photoId: number | null;
  /** S3 PUT까지는 성공 — 실패했다면 통보만 남은 상태. */
  uploadedToS3: boolean;
  /** 발급·통보 실패의 서버 메시지 (있으면 표시용). */
  errorMessage: string | null;
};

const CONCURRENCY = 3;
const NOTIFY_DEBOUNCE_MS = 400;

let seq = 0;
function nextId() {
  seq += 1;
  return `up-${seq}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useUploadQueue(galleryId: number) {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const filesRef = useRef(new Map<string, File>());
  const uploadUrlRef = useRef(new Map<string, string>());
  const queueRef = useRef<string[]>([]);
  const runningRef = useRef(0);
  const notifyRef = useRef(new Map<string, number>()); // entryId → photoId
  const notifyTimerRef = useRef<number | null>(null);
  const abortRef = useRef(new AbortController());
  const photoIdsRef = useRef(new Map<string, number>());
  const previewUrlsRef = useRef<string[]>([]);

  function patch(id: string, changes: Partial<UploadEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    );
  }

  // 통보 — 디바운스 일괄, 실패 시 1회 자동 재시도 후 failed로
  async function flushNotify() {
    notifyTimerRef.current = null;
    const batch = [...notifyRef.current.entries()];
    if (batch.length === 0) return;
    notifyRef.current.clear();
    const photoIds = batch.map(([, photoId]) => photoId);

    async function notify(): Promise<void> {
      await completePhotoUploads(galleryId, photoIds);
    }
    try {
      try {
        await notify();
      } catch {
        await new Promise((r) => setTimeout(r, 800));
        await notify();
      }
      for (const [entryId] of batch) patch(entryId, { status: "done", progress: 1 });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "완료 처리에 실패했어요.";
      for (const [entryId] of batch)
        patch(entryId, { status: "failed", errorMessage: message });
    }
  }

  function scheduleNotify(entryId: string, photoId: number) {
    notifyRef.current.set(entryId, photoId);
    if (notifyTimerRef.current !== null)
      window.clearTimeout(notifyTimerRef.current);
    notifyTimerRef.current = window.setTimeout(() => void flushNotify(), NOTIFY_DEBOUNCE_MS);
  }

  function pump() {
    while (runningRef.current < CONCURRENCY && queueRef.current.length > 0) {
      const id = queueRef.current.shift()!;
      const file = filesRef.current.get(id);
      const url = uploadUrlRef.current.get(id);
      if (!file || !url) continue;
      runningRef.current += 1;

      patch(id, { status: "uploading", progress: 0, errorMessage: null });
      (async () => {
        try {
          await putToS3(
            url,
            file,
            file.type,
            (ratio) => patch(id, { progress: ratio }),
            abortRef.current.signal,
          );
          patch(id, { uploadedToS3: true, progress: 1 });
          const entryPhotoId = photoIdsRef.current.get(id);
          if (entryPhotoId !== undefined) scheduleNotify(id, entryPhotoId);
        } catch (err) {
          patch(id, {
            status: "failed",
            errorMessage:
              err instanceof DOMException && err.name === "AbortError"
                ? "업로드가 중단됐어요."
                : "네트워크가 불안정했어요.",
          });
        } finally {
          runningRef.current -= 1;
          pump();
        }
      })();
    }
  }

  /** 발급 → 큐 투입. 발급 실패 시 해당 파일들을 failed로. */
  async function issueAndEnqueue(ids: string[]) {
      if (ids.length === 0) return;
      try {
        const contentTypes = ids.map((id) => filesRef.current.get(id)!.type);
        const issued = await issueUploadUrls(galleryId, contentTypes);
        issued.uploads.forEach((upload, i) => {
          const id = ids[i];
          uploadUrlRef.current.set(id, upload.uploadUrl);
          photoIdsRef.current.set(id, upload.photoId);
          patch(id, { photoId: upload.photoId });
        });
        queueRef.current.push(...ids);
        pump();
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "업로드 준비에 실패했어요. 네트워크를 확인해 주세요.";
        for (const id of ids)
          patch(id, { status: "failed", errorMessage: message });
      }
  }

  /** 파일 추가 — 검증 후 즉시 업로드 시작. 업로드 중에도 이어 붙는다. */
  function addFiles(files: Iterable<File>) {
      const valid: string[] = [];
      const added: UploadEntry[] = [];
      for (const file of files) {
        const id = nextId();
        const isImage = file.type.startsWith("image/");
        if (isImage) {
          filesRef.current.set(id, file);
          valid.push(id);
        }
        const previewUrl = isImage ? URL.createObjectURL(file) : null;
        if (previewUrl) previewUrlsRef.current.push(previewUrl);
        added.push({
          id,
          fileName: file.name,
          size: file.size,
          previewUrl,
          contentType: file.type,
          status: isImage ? "waiting" : "excluded",
          progress: 0,
          photoId: null,
          uploadedToS3: false,
          errorMessage: null,
        });
      }
    if (added.length === 0) return;
    setEntries((prev) => [...prev, ...added]);
    void issueAndEnqueue(valid);
  }

  /** 실패분 재시도 — 통보만 남은 파일은 통보만, 나머지는 발급부터 다시. */
  function retryFailed() {
    const failed = entries.filter((e) => e.status === "failed");
    const notifyOnly = failed.filter((e) => e.uploadedToS3 && e.photoId !== null);
    const reupload = failed.filter((e) => !e.uploadedToS3);

    for (const e of notifyOnly) {
      patch(e.id, { status: "uploading", progress: 1, errorMessage: null });
      scheduleNotify(e.id, e.photoId!);
    }
    for (const e of reupload) patch(e.id, { status: "waiting", errorMessage: null });
    void issueAndEnqueue(reupload.map((e) => e.id));
  }

  /** 진행 중 업로드 전부 중단 — 성공분은 이미 통보돼 서버에 남는다. */
  function abortAll() {
    abortRef.current.abort();
    abortRef.current = new AbortController();
    queueRef.current = [];
  }

  // 언마운트 시 진행 중 업로드 중단 + objectURL 해제.
  // StrictMode는 마운트→클린업→재마운트를 거치는데 ref의 컨트롤러는 살아남아
  // 이미 abort된 상태가 된다 — 재마운트 시 새 컨트롤러로 교체해야 한다.
  useEffect(() => {
    if (abortRef.current.signal.aborted) abortRef.current = new AbortController();
    const previewUrls = previewUrlsRef.current;
    return () => {
      abortRef.current.abort();
      for (const url of previewUrls) URL.revokeObjectURL(url);
    };
  }, []);

  return { entries, addFiles, retryFailed, abortAll };
}
