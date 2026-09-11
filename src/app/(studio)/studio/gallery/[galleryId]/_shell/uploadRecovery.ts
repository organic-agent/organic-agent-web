/**
 * 끊김 복구 — 서버의 PENDING 사진 중 "다 올라오지 못한 것"을 고르고, 다시 고른 파일을 짝지어
 * "이어 올릴 것"과 "새로 올릴 것"으로 나눈다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/uploadRecovery.ts
 *
 * 짝짓기 근거는 둘이다. ① 발급 때 브라우저에 기억해 둔 (파일명, 크기) — 가장 확실.
 * ② 서버 PENDING 행의 원본 파일명 — 기억이 없을 때(다른 브라우저 · 저장소 초기화) 이름이 하나뿐이면 믿는다.
 * 짝이 없는 파일은 새 업로드로 간다(같은 사진이 두 번 생길 수 있어도, 사용자가 올리려고 고른 파일을 버리지 않는다).
 * 순수 함수 — 화면 · 저장소 · 시계에 기대지 않는다(시각은 인자로 받는다).
 */

import type { PhotoResponse } from "@/lib/api/photos";
import type { RememberedUpload } from "./uploadMemory";
import type { ResumeItem } from "./useUploadRun";

/** 이 시간보다 어린 PENDING은 다른 탭이 지금 올리는 중일 수 있어 복구 대상에서 뺀다(이 브라우저가 발급한 것은 예외) */
export const RECOVERY_MIN_AGE_MS = 60_000;

/**
 * 복구 대상 PENDING. 이 브라우저가 발급한(기억에 있는) 사진은 나이와 무관하게 — 방금 취소한 업로드를 바로
 * 이어 올릴 수 있게. 기억에 없는 사진은 목록을 읽은 시각 기준 1분 이상 지난 것만.
 */
export function recoverablePending(
  photos: PhotoResponse[],
  remembered: RememberedUpload[],
  loadedAt: number,
): PhotoResponse[] {
  const mine = new Set(remembered.map((item) => item.photoId));
  return photos.filter((p) => {
    if (p.status !== "PENDING") return false;
    if (mine.has(p.photoId)) return true;
    if (!p.createdAt) return true;
    const created = new Date(p.createdAt).getTime();
    return !Number.isFinite(created) || loadedAt - created >= RECOVERY_MIN_AGE_MS;
  });
}

export function matchRecoveryFiles(
  files: File[],
  pending: PhotoResponse[],
  remembered: RememberedUpload[],
): { resume: ResumeItem[]; fresh: File[] } {
  const pendingIds = new Set(pending.map((p) => p.photoId));
  // ① 기억: (이름, 크기) → 사진 번호 (아직 PENDING인 것만)
  const byNameSize = new Map<string, number[]>();
  for (const item of remembered) {
    if (!pendingIds.has(item.photoId)) continue;
    const key = `${item.fileName}::${item.size}`;
    byNameSize.set(key, [...(byNameSize.get(key) ?? []), item.photoId]);
  }
  // ② 서버 파일명 → 사진 번호 (이름이 하나뿐일 때만 믿는다)
  const byName = new Map<string, number[]>();
  for (const p of pending) byName.set(p.originalFileName, [...(byName.get(p.originalFileName) ?? []), p.photoId]);

  const used = new Set<number>();
  const resume: ResumeItem[] = [];
  const fresh: File[] = [];
  for (const file of files) {
    const exact = (byNameSize.get(`${file.name}::${file.size}`) ?? []).find((id) => !used.has(id));
    let photoId = exact;
    if (photoId === undefined) {
      const candidates = (byName.get(file.name) ?? []).filter((id) => !used.has(id));
      if (candidates.length === 1) photoId = candidates[0];
    }
    if (photoId !== undefined) {
      used.add(photoId);
      resume.push({ file, photoId });
    } else fresh.push(file);
  }
  return { resume, fresh };
}
