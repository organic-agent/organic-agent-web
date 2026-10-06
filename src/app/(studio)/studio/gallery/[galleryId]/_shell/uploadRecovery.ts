/**
 * 끊김 복구 — 서버의 PENDING 사진 중 "다 올라오지 못한 것"을 고르고, 다시 고른 파일을 짝지어
 * "이어 올릴 것"과 "새로 올릴 것"으로 나눈다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/uploadRecovery.ts
 *
 * 짝짓기 근거는 둘이다. ① 발급 때 브라우저에 기억해 둔 (파일명, 크기) — 가장 확실.
 * ② 서버 PENDING 행의 원본 파일명 — 기억이 없을 때(다른 브라우저 · 저장소 초기화) 이름이 하나뿐이면 믿는다.
 * 짝이 없는 파일 가운데 이미 올라온(UPLOADED) 사진과 이름이 같은 것은 건너뛴다 — 끊긴 뒤 원래 폴더를 통째로
 * 다시 고르면 올라간 사진까지 새로 올라가 중복되던 것(QA 2026-09-29 · 이슈 84). 업로드 모달과 같은 규칙이고,
 * 서버 사진 응답에 크기가 없어 이름만 본다. 같은 이름을 일부러 또 올리려면 업로드 모달의 "그래도 올리기"로.
 * 나머지 짝 없는 파일은 새 업로드로 간다(사용자가 올리려고 고른 파일을 버리지 않는다).
 * 순수 함수 — 화면 · 저장소 · 시계에 기대지 않는다(시각은 인자로 받는다).
 */

import type { PhotoResponse } from "@/lib/api/photos";
import type { RememberedUpload } from "./uploadMemory";
import type { ResumeItem } from "./useUploadRun";

/** 이 시간보다 어린 PENDING은 다른 탭이 지금 올리는 중일 수 있어 복구 대상에서 뺀다(이 브라우저가 발급한 것은 예외) */
export const RECOVERY_MIN_AGE_MS = 60_000;

/**
 * 배너가 뜬 뒤 사진 목록을 한 번 다시 읽기까지의 시간. 탭을 닫거나 새로고침해서 끊기면 S3에는 올라갔지만 완료 통보만
 * 못 보낸 사진이 PENDING으로 남는다 — 서버가 발급 1분 뒤 직접 확인해 옮기므로 그 뒤에 읽어야 맞는다.
 */
export const RECOVERY_RECHECK_MS = 70_000;

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

export type RecoveryMatch = {
  /** 끊긴(PENDING) 사진과 짝이 맞아 이어 올릴 것 */
  resume: ResumeItem[];
  /** 짝도 없고 올라온 적도 없어 새로 올릴 것 */
  fresh: File[];
  /** 이미 올라온 사진과 이름이 같아 건너뛴 것 */
  skipped: File[];
};

export function matchRecoveryFiles(
  files: File[],
  pending: PhotoResponse[],
  remembered: RememberedUpload[],
  /** 이미 올라온(UPLOADED) 사진의 원본 파일명 */
  existingNames: ReadonlySet<string>,
): RecoveryMatch {
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
  const skipped: File[] = [];
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
    } else if (existingNames.has(file.name)) skipped.push(file);
    else fresh.push(file);
  }
  return { resume, fresh, skipped };
}

/** 복구 결과를 하단 바 한 줄로 — 이어 올리기만 있고 건너뛴 것도 없으면 말하지 않는다(null) */
export function recoveryNotice({ resume, fresh, skipped }: RecoveryMatch): string | null {
  const skip = skipped.length > 0 ? `${skipped.length}장은 이미 있어 건너뛰었어요` : null;
  if (resume.length === 0 && fresh.length === 0) {
    return skip ? "고른 사진은 모두 이미 올라와 있어요" : null;
  }
  const upload =
    resume.length === 0
      ? "끊긴 사진과 같은 파일이 없어 새 사진으로 올려요"
      : fresh.length > 0
        ? `${resume.length}장은 이어서, ${fresh.length}장은 새로 올려요`
        : skip
          ? `${resume.length}장은 이어서 올려요`
          : null;
  return [upload, skip].filter(Boolean).join(" · ") || null;
}
