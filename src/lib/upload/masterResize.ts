/**
 * 리사이즈 워커 풀 — 업로드가 파일마다 prepareMaster를 부르고, 놀고 있는 워커에 차례로 준다
 * 위치: src/lib/upload/masterResize.ts
 *
 * 워커는 탭이 살아 있는 동안 유지된다 — 배치마다 띄우고 죽이면 그 비용이 리사이즈 자체와
 * 맞먹는다. JPEG가 아닌 파일은 줄이지 않는다. PNG·HEIC는 브라우저 디코드가 형식·브라우저마다
 * 갈려서(HEIC는 Safari뿐) 결과를 믿을 수 없다 — 원본을 올리고 서버 쪽 임베더가 처리한다.
 * 그래도 워커에는 보낸다 — 올릴 바이트의 CRC32C는 어느 파일이든 필요하다.
 *
 * 결과의 blob 크기와 CRC가 곧 발급 요청의 contentLength·PUT 헤더다. 둘 다 서명에 들어가므로
 * PUT은 이 blob 객체를 그대로 보내야 한다.
 */

import type {
  MasterResizeRequest,
  MasterResizeResponse,
} from "./masterResize.worker";
import { crc32cOfBlob } from "./crc32c";
import { MASTER_RESIZE_WORKERS_MAX } from "./masterSpec";

export type PreparedFile = {
  /** S3에 올릴 바이트. 줄이지 않았으면 원본 File 그대로 */
  blob: Blob;
  /** 실제로 줄였는지. 긴 변이 이미 규격 이하였거나 JPEG가 아니면 false */
  resized: boolean;
  /** blob의 CRC32C(base64) — `x-amz-checksum-crc32c` 헤더 값 */
  crc32c: string;
};

export async function prepareMaster(file: File): Promise<PreparedFile> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    return { blob: file, resized: false, crc32c: await crc32cOfBlob(file) };
  }
  return getPool().run(file);
}

type Pending = {
  resolve: (value: PreparedFile) => void;
  reject: (reason: Error) => void;
};
type Slot = { worker: Worker; busy: boolean };

class MasterResizePool {
  private readonly slots: Slot[] = [];
  private readonly queue: { id: number; file: File }[] = [];
  private readonly pending = new Map<number, Pending>();
  private readonly byWorker = new Map<Worker, number>();
  private nextId = 1;

  constructor(size: number) {
    for (let index = 0; index < size; index += 1) {
      const worker = new Worker(
        new URL("./masterResize.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (event: MessageEvent<MasterResizeResponse>) =>
        this.onDone(worker, event.data);
      worker.onerror = (event) => this.onCrash(worker, event.message);
      this.slots.push({ worker, busy: false });
    }
  }

  run(file: File): Promise<PreparedFile> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<PreparedFile>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.queue.push({ id, file });
      this.pump();
    });
  }

  private pump() {
    for (const slot of this.slots) {
      if (slot.busy) continue;
      const task = this.queue.shift();
      if (!task) return;
      slot.busy = true;
      this.byWorker.set(slot.worker, task.id);
      const request: MasterResizeRequest = task;
      slot.worker.postMessage(request);
    }
  }

  private onDone(worker: Worker, response: MasterResizeResponse) {
    const pending = this.pending.get(response.id);
    this.pending.delete(response.id);
    this.release(worker);
    if (!pending) return;
    if (response.ok)
      pending.resolve({
        blob: response.blob,
        resized: response.resized,
        crc32c: response.crc32c,
      });
    else pending.reject(new Error(response.error));
    this.pump();
  }

  /** 워커 자체가 죽은 경우(스크립트 로드 실패 등). 그 워커가 들고 있던 한 장만 실패시킨다 */
  private onCrash(worker: Worker, message: string) {
    const id = this.byWorker.get(worker);
    this.release(worker);
    if (id !== undefined) {
      const pending = this.pending.get(id);
      this.pending.delete(id);
      pending?.reject(new Error(message || "리사이즈 워커가 중단됐어요"));
    }
    this.pump();
  }

  private release(worker: Worker) {
    this.byWorker.delete(worker);
    const slot = this.slots.find((entry) => entry.worker === worker);
    if (slot) slot.busy = false;
  }
}

let pool: MasterResizePool | null = null;

function getPool(): MasterResizePool {
  if (pool === null) {
    const cores = navigator.hardwareConcurrency ?? 4;
    pool = new MasterResizePool(
      Math.max(1, Math.min(MASTER_RESIZE_WORKERS_MAX, cores - 1)),
    );
  }
  return pool;
}
