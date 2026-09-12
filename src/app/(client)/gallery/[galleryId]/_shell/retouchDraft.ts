/**
 * 보정 요청 초안 — 전달하기 전까지 브라우저에 (sel.retouchDraft.{galleryId})
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/retouchDraft.ts
 *
 * 첫 보정 요청은 셀렉 제출에 실려 가므로 그 전에는 서버에 둘 곳이 없다. 사진 id → { 전체 요청, 점[] }.
 * 신랑 · 신부가 다른 기기면 서로 안 보이는 한계(노션 ② — 제출 전 저장 API 확인 요청).
 * 점은 화면용 id를 가지고, 서버로 보낼 때 RetouchPoint 모양으로 바꾼다(toRequestItems).
 */

import type { RetouchPoint, RetouchRequestItem } from "@/lib/api/retouch";
import { createRecordStore } from "./clientMemory";

export type DraftPoint = RetouchPoint & { id: string };
export type PhotoDraft = { requestText: string; points: DraftPoint[] };

function isDraft(v: unknown): v is PhotoDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return typeof d.requestText === "string" && Array.isArray(d.points);
}

export const retouchDraftStore = createRecordStore<PhotoDraft>("sel.retouchDraft", isDraft);

export function readDrafts(galleryId: number): Record<string, PhotoDraft> {
  return retouchDraftStore.parse(retouchDraftStore.readRaw(galleryId));
}

/** 빈 초안(문장 없음 · 점 없음)은 지운다 */
export function writeDraft(galleryId: number, photoId: number, next: PhotoDraft | null) {
  const all = readDrafts(galleryId);
  const empty = !next || (!next.requestText.trim() && next.points.length === 0);
  if (empty) delete all[String(photoId)];
  else all[String(photoId)] = next;
  retouchDraftStore.write(galleryId, all);
}

export function draftOf(all: Record<string, PhotoDraft>, photoId: number): PhotoDraft {
  return all[String(photoId)] ?? { requestText: "", points: [] };
}

/** 내용이 있는 초안 수(하단 문구 · 전달 확인) */
export function countDrafts(all: Record<string, PhotoDraft>): { photos: number; points: number } {
  let photos = 0;
  let points = 0;
  for (const d of Object.values(all)) {
    if (!d.requestText.trim() && d.points.length === 0) continue;
    photos++;
    points += d.points.length;
  }
  return { photos, points };
}

/** 전달하기 본문 — 고른 사진의 초안만(선택되지 않은 사진의 요청은 서버가 받지 않는다) */
export function toRequestItems(all: Record<string, PhotoDraft>, pickedIds: ReadonlySet<number>): RetouchRequestItem[] {
  const items: RetouchRequestItem[] = [];
  for (const [key, d] of Object.entries(all)) {
    const photoId = Number(key);
    if (!pickedIds.has(photoId)) continue;
    const points = d.points
      .filter((p) => p.text.trim())
      .map(({ x, y, text, refinedText, useRefinedText }) => ({ x, y, text, refinedText, useRefinedText }));
    const requestText = d.requestText.trim() || null;
    if (!requestText && points.length === 0) continue;
    items.push({ photoId, requestText, annotationKey: null, points });
  }
  return items;
}

export const newPointId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
