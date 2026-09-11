/**
 * 업로드 보조 — 형식 판별 · 묶음 · 표시 문구 · 리사이즈 결과 캐시 · 오류 문구
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/uploadSupport.ts
 *
 * 순수 함수만. 실행기(useUploadRun) · 모달(UploadModal) · 복구(stage 4)가 함께 쓴다.
 */

import { ApiError } from "@/lib/api/client";
import { prepareMaster, type PreparedFile } from "@/lib/upload/masterResize";

/** 서버가 받아주는 형식(PhotoService.ALLOWED_CONTENT_TYPES). 소문자로 보낸다 */
export const UPLOAD_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/** 원본 한 장 상한(app.storage.max-upload-bytes = 20MB). 2048로 줄인 JPEG는 보통 1~2MB */
export const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

/** 파일 선택창의 accept — 브라우저가 HEIC의 MIME을 비우는 경우가 있어 확장자도 같이 */
export const UPLOAD_ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif";

/**
 * 발급 · PUT에 쓸 Content-Type. 서명에 들어가 발급 값과 PUT 헤더가 같아야 하고, 서버가
 * 소문자로 비교 · 서명하므로 소문자로 맞춘다. 브라우저가 MIME을 못 알아낸 파일은 확장자로.
 */
export function uploadContentType(file: File): string {
  const typed = file.type.toLowerCase();
  if (typed) return typed;
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

export function isAcceptedUpload(file: File): boolean {
  return (UPLOAD_ACCEPTED_TYPES as readonly string[]).includes(uploadContentType(file));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

/** 남은 시간 문구. 1분 미만은 초, 그 이상은 분 단위 반올림 */
export function formatEta(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds < 60) return `약 ${Math.max(5, Math.round(seconds / 5) * 5)}초`;
  return `약 ${Math.max(1, Math.round(seconds / 60))}분`;
}

/**
 * 리사이즈 결과 캐시 — 모달이 담긴 파일의 첫 묶음을 미리 줄여 두면 "업로드하기"를 누른 즉시
 * 첫 PUT이 나간다. 결과 blob이 메모리를 차지하므로 실행기가 PUT을 끝낸 파일은 바로 놓는다
 * (수천 장을 전부 들고 있으면 GB 단위가 된다 — 100장 묶음 단위 원칙은 그대로).
 */
const preparedCache = new WeakMap<File, Promise<PreparedFile>>();

export function prepareCached(file: File): Promise<PreparedFile> {
  let pending = preparedCache.get(file);
  if (!pending) {
    pending = prepareMaster(file);
    preparedCache.set(file, pending);
    pending.catch(() => preparedCache.delete(file));
  }
  return pending;
}

export function releasePrepared(file: File) {
  preparedCache.delete(file);
}

const UPLOAD_MESSAGE: Record<string, string> = {
  PHOTO_400_1: "한 번에 올릴 수 있는 장수를 넘었어요. 나눠서 올려 주세요.",
  PHOTO_400_2: "지원하지 않는 형식이 있어요. JPG · PNG · WebP · HEIC만 올릴 수 있어요.",
  PHOTO_400_7: "사진 한 장의 크기가 20MB를 넘었어요. 줄여서 다시 올려 주세요.",
  PHOTO_400_8: "사진 검증값이 올바르지 않아요. 다시 시도해 주세요.",
  PHOTO_409_1: "이미 올라간 사진이 섞여 있어요. 목록을 새로 불러 주세요.",
  GALLERY_409_3: "플랜에서 올릴 수 있는 사진 수를 넘었어요.",
  GALLERY_403_1: "이 갤러리에 사진을 올릴 권한이 없어요.",
  GALLERY_403_6: "보관된 갤러리라 더 올릴 수 없어요.",
  RECOMMENDATION_409_2: "업로드가 끝난 사진이 없어 AI 정리를 시작할 수 없어요.",
  PHOTO_503_1: "이 서버에는 AI 정리 실행기가 아직 설정되지 않았어요.",
};

export function describeUploadError(error: unknown): string {
  if (error instanceof ApiError) return UPLOAD_MESSAGE[error.code] ?? error.message;
  return error instanceof Error ? error.message : "요청을 처리하지 못했어요. 다시 시도해 주세요.";
}
