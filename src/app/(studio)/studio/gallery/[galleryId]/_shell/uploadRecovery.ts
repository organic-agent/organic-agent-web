/**
 * 끊김 복구 — 서버의 PENDING 사진 중 "다 올라오지 못한 것"을 고르고, 다시 고른 파일을 짝지어
 * "이어 올릴 것"과 "새로 올릴 것"으로 나눈다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/uploadRecovery.ts
 *
 * 짝짓기 근거는 원본 지문(sourceHash)의 조회 결과다(서버 #211). 다시 고른 파일마다 지문을 물어
 * ① UPLOADED · TRASHED — 이미 올라왔거나 휴지통에 있는 원본이라 건너뛴다. 끊긴 뒤 원래 폴더를 통째로 다시 골라도
 *   중복이 생기지 않는다(QA 2026-09-29 · 이슈 84). 이름이 아니라 내용으로 보므로 이름이 같은 다른 사진은 막지 않는다.
 * ② PENDING — 서버가 알려 준 그 사진 번호로 이어 올린다(재발급, 같은 행).
 * ③ NEW · 조회 실패 — 지문이 생기기 전에 발급된 PENDING일 수 있어, 발급 때 브라우저에 기억해 둔 (파일명, 크기)로
 *   한 번 더 짝을 찾는다. 그래도 없으면 새 업로드로 간다(사용자가 올리려고 고른 파일을 버리지 않는다).
 * 순수 함수 — 화면 · 저장소 · 시계에 기대지 않는다(시각은 인자로 받는다).
 */

import type { PhotoResponse, UploadCheckResult } from "@/lib/api/photos";
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

export type RecoveryMatch = {
  /** 끊긴(PENDING) 사진과 짝이 맞아 이어 올릴 것 */
  resume: ResumeItem[];
  /** 짝도 없고 올라온 적도 없어 새로 올릴 것 */
  fresh: File[];
  /** 이미 올라왔거나 휴지통에 있는 원본이라 건너뛴 것 */
  skipped: File[];
};

export function matchRecoveryFiles(
  files: File[],
  pending: PhotoResponse[],
  remembered: RememberedUpload[],
  /** 파일별 지문 조회 결과. 지문을 못 읽었거나 조회가 실패하면 null */
  checks: (UploadCheckResult | null)[],
): RecoveryMatch {
  const pendingIds = new Set(pending.map((p) => p.photoId));
  // 지문이 생기기 전에 발급된 PENDING — 기억해 둔 (이름, 크기) → 사진 번호
  const byNameSize = new Map<string, number[]>();
  for (const item of remembered) {
    if (!pendingIds.has(item.photoId)) continue;
    const key = `${item.fileName}::${item.size}`;
    byNameSize.set(key, [...(byNameSize.get(key) ?? []), item.photoId]);
  }

  const used = new Set<number>();
  const resume: ResumeItem[] = [];
  const fresh: File[] = [];
  const skipped: File[] = [];
  files.forEach((file, i) => {
    const check = checks[i];
    if (check?.state === "UPLOADED" || check?.state === "TRASHED") {
      skipped.push(file);
      return;
    }
    let photoId: number | undefined;
    if (check?.state === "PENDING" && check.photoId !== null) {
      // 같은 원본이 두 번 골라졌으면 한 번만 이어 올린다
      if (used.has(check.photoId)) {
        skipped.push(file);
        return;
      }
      photoId = check.photoId;
    } else photoId = (byNameSize.get(`${file.name}::${file.size}`) ?? []).find((id) => !used.has(id));
    if (photoId !== undefined) {
      used.add(photoId);
      resume.push({ file, photoId });
    } else fresh.push(file);
  });
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
      ? "짝이 맞는 파일이 없어 새 사진으로 올려요"
      : fresh.length > 0
        ? `${resume.length}장은 이어서, ${fresh.length}장은 새로 올려요`
        : skip
          ? `${resume.length}장은 이어서 올려요`
          : null;
  return [upload, skip].filter(Boolean).join(" · ") || null;
}
