/**
 * 사진 업로드 API — 스웨거 [Photo] 계약의 타입화
 * 위치: src/lib/api/photos.ts
 *
 * 업로드는 3단계다: ① 발급(사진 행이 PENDING으로 생기고 서명 URL 수령)
 * ② 프론트가 S3에 직접 PUT(이미지 바이트는 서버를 거치지 않는다)
 * ③ 완료 통보(PENDING→UPLOADED). 통보가 없어도 서버가 발급 1분 뒤부터 S3를 직접
 * 확인해 올라온 사진을 UPLOADED로 옮긴다 — 통보는 그보다 빠를 뿐이다.
 *
 * 발급은 리사이즈 뒤에 받는다. 서명에 Content-Length·Content-Type·x-amz-checksum-crc32c가
 * 들어가서, 발급 때 적은 크기와 다른 바이트를 올리면 S3가 거절한다.
 */

import { api } from "@/lib/api/client";

export type IssuedUpload = {
  photoId: number;
  storageKey: string;
  /** 이 URL로 S3에 직접 PUT — 발급 요청의 contentType·contentLength를 그대로 보내야 한다. */
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
  /** 실제로 PUT 할 바이트 수(리사이즈 결과). 서명에 들어가고, 상한(20MB)을 넘으면 400. */
  contentLength: number;
  /**
   * 올릴 바이트의 CRC32C(base64). 서버가 이 값을 서명에 넣고, PUT의 x-amz-checksum-crc32c
   * 헤더가 같아야 한다. S3는 받은 바이트로 다시 계산해 다르면 400(BadDigest)으로 거절한다.
   */
  crc32c: string;
};

/**
 * 업로드 URL 일괄 발급. 파일 하나당 사진 행 하나가 PENDING으로 생긴다. 한 번에 500장까지.
 * 실패: 400(필드 누락, 개수 초과 PHOTO_400_1, 미지원 형식 PHOTO_400_2, 크기 초과 PHOTO_400_7)
 * · 403(담당 작가 아님) · 409(플랜 장수 초과 GALLERY_409_3).
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
 * 업로드 URL 재발급 — 아직 올라오지 않은(PENDING) 사진에 새 PUT URL을 받는다. 사진 행은
 * 새로 생기지 않는다. URL이 만료됐거나 서명 불일치로 거절된 PUT을 같은 바이트로 다시
 * 시도할 때 쓴다. 하나라도 이미 UPLOADED면 전부 409(PHOTO_409_1).
 */
export function reissueUploadUrls(
  galleryId: number,
  photos: { photoId: number; contentLength: number; crc32c: string }[],
): Promise<IssueUploadUrlsResponse> {
  return api(`/api/v1/galleries/${galleryId}/photos/upload-urls/reissue`, {
    method: "POST",
    body: { photos },
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
  /** S3에 원본이 있는가. 분석 진행은 사진 요약(summary)의 카운트로 본다 */
  status: "PENDING" | "UPLOADED";
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
  /** 업로드 URL만 발급된 사진. S3에 아직 없을 수 있다 */
  pending: number;
  /** 원본이 S3에 있는 사진 */
  uploaded: number;
  /** 올라온 사진 중 임베딩(벡터·미리보기)까지 끝난 수 */
  embedded: number;
  /** 올라온 사진 중 점수까지 끝난 수 */
  scored: number;
  /** 올라온 사진 중 분류(백분위·그룹)까지 끝난 수 */
  categorized: number;
  /** 분석이 결정적으로 실패한 사진 수. 갤러리에는 보이지만 AI 대상에서 빠진다 */
  failed: number;
};

/**
 * 사진 상태 집계 — 임베딩·점수는 서버가 업로드된 사진을 알아서 밀므로(잡과 무관),
 * 진행 상황은 이 카운트로 본다.
 */
export function getPhotoSummary(
  galleryId: number,
): Promise<PhotoSummaryResponse> {
  return api(`/api/v1/galleries/${galleryId}/photos/summary`);
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
 * 목록·클러스터·폴더·선택 앨범·협업 화면 어디에도 보이지 않는다.
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

export type PutToS3Options = {
  /** 발급 요청의 contentType — 서명에 포함 */
  contentType: string;
  /**
   * blob의 CRC32C(base64) — 원본 사진 업로드는 서명에 포함되어 필수. 보정본 업로드처럼
   * 서버가 체크섬 없이 서명한 URL에는 **주면 안 된다** — 서명에 없는 x-amz-* 헤더는 AccessDenied다
   */
  crc32c?: string;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
};

/** S3가 돌려준 상태 코드를 들고 있는 실패 — 재시도·재발급 판단에 쓴다 */
export class S3PutError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "S3PutError";
  }
}

/**
 * S3 직접 PUT. fetch 대신 XHR을 쓰는 이유는 업로드 진행률 이벤트 하나다.
 * Content-Type·x-amz-checksum-crc32c는 발급 값과 같아야 하고 Content-Length는 XHR이
 * blob 크기로 붙인다 — 셋 다 서명에 있어 다르면 S3가 SignatureDoesNotMatch로 거절한다.
 * 그래서 발급에 넣은 blob 객체를 그대로 보내야 한다. 이 세 헤더 외에 x-amz-* 헤더를 더
 * 붙이면 안 된다 — SigV4는 서명되지 않은 x-amz-* 헤더가 있으면 AccessDenied다(2026-09-08
 * dev 버킷 실측).
 */
export function putToS3(
  uploadUrl: string,
  file: Blob,
  options: PutToS3Options,
): Promise<void> {
  const { contentType, crc32c, onProgress, signal } = options;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    // 멈춘 연결이 워커 자리를 영원히 붙들지 않게 — 2MB 안팎 한 장에 5분이면 넉넉하다
    xhr.timeout = 5 * 60_000;
    xhr.ontimeout = () => reject(new S3PutError(0, "S3 업로드 시간 초과"));
    xhr.setRequestHeader("Content-Type", contentType);
    if (crc32c) xhr.setRequestHeader("x-amz-checksum-crc32c", crc32c);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new S3PutError(xhr.status, `S3 업로드 실패 (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new S3PutError(0, "S3 업로드 네트워크 오류"));
    xhr.onabort = () => reject(new DOMException("업로드 중단", "AbortError"));
    if (signal) {
      if (signal.aborted) return reject(new DOMException("업로드 중단", "AbortError"));
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}
