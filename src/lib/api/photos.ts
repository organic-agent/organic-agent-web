/**
 * 사진 업로드 API — 스웨거 [Photo] 계약의 타입화
 * 위치: src/lib/api/photos.ts
 *
 * 업로드는 3단계다: ① 발급(사진 행이 PENDING으로 생기고 서명 URL 수령)
 * ② 프론트가 S3에 직접 PUT(이미지 바이트는 서버를 거치지 않는다)
 * ③ 완료 통보(PENDING→UPLOADED). 통보가 없으면 사진은 PENDING에 머물고
 * 임베딩 대상이 되지 않는다.
 */

import { api } from "@/lib/api/client";

export type IssuedUpload = {
  photoId: number;
  storageKey: string;
  /** 이 URL로 S3에 직접 PUT — 발급 요청의 contentType을 그대로 보내야 한다. */
  uploadUrl: string;
};

export type IssueUploadUrlsResponse = {
  uploads: IssuedUpload[];
  /** uploadUrl이 살아 있는 시간(초). 이 안에 업로드를 마쳐야 한다. */
  uploadUrlTtlSeconds: number;
};

export type UploadFileRequest = {
  /** 원본 파일명 — 필수. 스웨거에선 보정 쪽 동명 스키마와 충돌해 가려져 있다(서버 DTO 확인). */
  fileName: string;
  contentType: string;
};

/**
 * 업로드 URL 일괄 발급. 파일 하나당 사진 행 하나가 PENDING으로 생긴다.
 * 실패: 400(fileName·contentType 누락, 개수 초과, 미지원 형식) · 403(담당 작가 아님).
 */
export function issueUploadUrls(
  galleryId: number,
  files: UploadFileRequest[],
): Promise<IssueUploadUrlsResponse> {
  return api(`/api/v1/galleries/${galleryId}/photos/upload-urls`, {
    method: "POST",
    body: { files },
  });
}

/**
 * 업로드 완료 통보 — S3 PUT을 마친 사진들을 UPLOADED로 옮긴다.
 * 멱등이라 여러 번 보내도 안전하다. 404: 이 갤러리에 없는 사진 id가 섞임.
 */
export function completePhotoUploads(
  galleryId: number,
  photoIds: number[],
): Promise<{ count: number }> {
  return api(`/api/v1/galleries/${galleryId}/photos/complete`, {
    method: "POST",
    body: { photoIds },
  });
}

/**
 * S3 직접 PUT. fetch 대신 XHR을 쓰는 이유는 업로드 진행률 이벤트 하나다.
 * Content-Type은 발급 요청 값과 같아야 한다 — 서명에 포함되어 있어
 * 다르면 S3가 SignatureDoesNotMatch로 거절한다.
 */
export function putToS3(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 업로드 실패 (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new Error("S3 업로드 네트워크 오류"));
    xhr.onabort = () => reject(new DOMException("업로드 중단", "AbortError"));
    if (signal) {
      if (signal.aborted) return reject(new DOMException("업로드 중단", "AbortError"));
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}
