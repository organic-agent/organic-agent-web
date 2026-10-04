/**
 * 원본 지문 — 같은 사진을 다시 올려도 서버가 한 장으로 다루게 하는 값(서버 #211)
 * 위치: src/lib/upload/sourceHash.ts
 *
 * 형식은 `{원본 바이트 크기}-{원본 앞 64KB 의 CRC32C 를 소문자 hex 8자로}`(예: 18432000-c1d44383).
 * 리사이즈 전의 원본에서 계산한다 — 리사이즈 결과는 브라우저 · 워커마다 바이트가 달라질 수 있어서다.
 * 앞 64KB만 읽으므로 수천 장도 몇 초 안이다. 같은 File은 한 번만 계산한다.
 */

import { crc32c } from "./crc32c";

const HEAD_BYTES = 64 * 1024;
const CONCURRENCY = 16;

const cache = new WeakMap<File, Promise<string>>();

async function compute(file: File): Promise<string> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
  return `${file.size}-${crc32c(head).toString(16).padStart(8, "0")}`;
}

export function sourceHashOf(file: File): Promise<string> {
  let pending = cache.get(file);
  if (!pending) {
    pending = compute(file);
    cache.set(file, pending);
    pending.catch(() => cache.delete(file));
  }
  return pending;
}

/** 파일들의 지문 — 순서대로. 읽지 못한 파일은 null(지문 없이 올라가 서버가 새 사진으로 받는다) */
export async function sourceHashesOf(files: File[]): Promise<(string | null)[]> {
  const out: (string | null)[] = new Array(files.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const index = cursor++;
      out[index] = await sourceHashOf(files[index]).catch(() => null);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
  return out;
}
