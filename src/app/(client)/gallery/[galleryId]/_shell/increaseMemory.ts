/**
 * 장수 추가 요청 기억 — 응답(작가가 장수를 바꿈) 전까지 "요청함"으로 보이게 (sel.increase.{galleryId})
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/increaseMemory.ts
 *
 * 서버에 요청 상태 조회가 없어 브라우저에 { 요청한 장수, 요청 당시 계약 장수 }를 둔다.
 * 갤러리의 계약 장수가 요청 당시와 달라지면(작가가 바꿈) 기억을 지운다.
 */

import { createRecordStore } from "./clientMemory";

export type IncreaseRequest = { requestedCount: number; maxAtRequest: number | null; at: string };

function isRequest(v: unknown): v is IncreaseRequest {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.requestedCount === "number" && typeof r.at === "string";
}

export const increaseStore = createRecordStore<IncreaseRequest>("sel.increase", isRequest);

export function readIncreaseRequest(galleryId: number): IncreaseRequest | null {
  return increaseStore.parse(increaseStore.readRaw(galleryId)).pending ?? null;
}
export function writeIncreaseRequest(galleryId: number, req: IncreaseRequest | null) {
  increaseStore.write(galleryId, req ? { pending: req } : {});
}
