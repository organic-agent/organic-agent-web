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

export type PhotoResponse = {
  photoId: number;
  storageKey: string;
  originalFileName: string;
  contentType: string;
  status: "PENDING" | "UPLOADED" | "EMBEDDED";
  displayOrder: number;
  createdAt: string | null;
  /**
   * 서명된 조회 URL — 그대로 img src에 넣는다(버킷 비공개라 이것 없이는
   * 못 띄운다). PENDING이면 null. previewReady가 true면 파생 JPEG를,
   * false면 원본을 가리킨다.
   */
  viewUrl: string | null;
  /** false면 원본 그대로라 형식(HEIC 등)에 따라 브라우저가 못 그릴 수 있다. */
  previewReady: boolean;
  /** 별점(1~5). 없으면 null. */
  score: number | null;
};

export type PhotoPageResponse = {
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
  contents: PhotoResponse[];
  /** viewUrl이 살아 있는 시간(초) — 만료 전에 목록을 다시 불러야 한다. */
  viewUrlTtlSeconds: number;
};

export type PhotoSummaryResponse = {
  total: number;
  pending: number;
  uploaded: number;
  /** 임베딩까지 끝난 수 — total과 같아지면 분석 완료(클러스터링 가능). */
  embedded: number;
};

/**
 * 사진 상태 집계 — 임베딩은 비동기라 진행 상황을 이 값으로 확인한다.
 * embedded가 늘어나는 것이 유일한 진행 신호다.
 */
export function getPhotoSummary(
  galleryId: number,
): Promise<PhotoSummaryResponse> {
  return api(`/api/v1/galleries/${galleryId}/photos/summary`);
}

export type EmbeddingRunResponse = {
  galleryId: number;
  /** 이번 실행이 채우려는 사진 수 — 접수이지 완료가 아니다. */
  targets: number;
};

/**
 * 갤러리 임베딩 실행 — 202 접수 후 비동기로 돈다. 기본값은 임베딩 없는
 * 사진만 처리하므로 재호출하면 남은 것만 이어서 한다(멱등에 가까움).
 *
 * 실패: 502(Lambda 호출 실패 — 계산 실패가 아니라 재시도하면 됨) ·
 * 503(임베딩 함수 미설정 — 로컬·테스트 정상) · 403(담당 작가 아님).
 */
export function runEmbedding(galleryId: number): Promise<EmbeddingRunResponse> {
  return api(`/api/v1/galleries/${galleryId}/embeddings/run`, {
    method: "POST",
  });
}

/** 사진 목록 한 페이지. 담당 작가와 초대받은 부부가 함께 쓴다. */
export function listPhotos(
  galleryId: number,
  page = 0,
  size = 200,
): Promise<PhotoPageResponse> {
  return api(
    `/api/v1/galleries/${galleryId}/photos?page=${page}&size=${size}`,
  );
}

/**
 * 사진 휴지통 이동 — 담당 작가만, 한 장을 지워도 배치로. 휴지통의 사진은
 * 목록·카테고리·셀렉·협업 화면 어디에도 보이지 않는다.
 * **전부-아니면-404**: 이미 휴지통이거나 이 갤러리 사진이 아닌 id가 섞이면
 * 한 장도 옮기지 않는다 — 화면이 낡았다는 신호라 재조회로 푼다.
 */
export function deletePhotos(
  galleryId: number,
  photoIds: number[],
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/photos`, {
    method: "DELETE",
    body: { photoIds },
  });
}

export type TrashedPhotoResponse = {
  photoId: number;
  originalFileName: string;
  deletedAt: string;
  /** 이 시각이 지나면 자동으로 물리 삭제된다. */
  expiresAt: string;
  /** 휴지통 화면에 그릴 서명 URL. 올리다 만(PENDING) 사진은 null. */
  viewUrl: string | null;
};

export type TrashedPhotoListResponse = {
  photos: TrashedPhotoResponse[];
  /** viewUrl 남은 수명(초) — 지나면 다시 불러 새 URL을 받는다. */
  viewUrlTtlSeconds: number;
};

/** 휴지통 사진 목록. 갤러리 자체가 휴지통이면 404(갤러리 휴지통의 몫). */
export function listTrashedPhotos(
  galleryId: number,
): Promise<TrashedPhotoListResponse> {
  return api(`/api/v1/galleries/${galleryId}/photos/trash`);
}

/**
 * 휴지통 사진 복원 — 목록·클러스터에 다시 나타난다.
 * 전부-아니면-404: 휴지통에 없는 id가 섞이면 한 장도 되살리지 않는다.
 */
export function restoreTrashedPhotos(
  galleryId: number,
  photoIds: number[],
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/photos/trash/restore`, {
    method: "POST",
    body: { photoIds },
  });
}

/**
 * 휴지통 사진 완전 삭제 — 보관 기간을 기다리지 않고 지금 물리 삭제한다.
 * 원본·미리보기가 함께 사라지며 **복구할 수 없다**. 전부-아니면-404.
 */
export function eraseTrashedPhotos(
  galleryId: number,
  photoIds: number[],
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/photos/trash`, {
    method: "DELETE",
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
