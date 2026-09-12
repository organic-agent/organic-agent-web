/**
 * 선택 앨범(셀렉) API — 스웨거 [Selection] 계약의 타입화
 * 위치: src/lib/api/selection.ts
 *
 * 담기는 초대받은 부부만(작가는 조회만). 중복이 하나라도 섞이거나 계약
 * 장수를 넘기면 **한 장도 담기지 않고 통째로 거절**된다 — 겹침(409)은
 * 신랑·신부가 동시에 고르다 생긴 "화면이 낡았다"는 신호라 재조회로 푼다.
 * 제출(submit) 뒤에는 담기·빼기가 잠기고, 되돌리기(withdraw)는 담당
 * 작가만 할 수 있다.
 */

import { baseUrl } from "@/lib/api/baseUrl";
import { api, ApiError } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";
import type { RetouchRequestItem } from "@/lib/api/retouch";
import { getAccessToken } from "@/lib/auth/tokenStore";

export type SelectedPhotoResponse = {
  /** 담은 컷의 원본 사진 — 보정본으로 담았어도 원본 정보가 실린다 */
  photo: PhotoResponse;
  /** 보정본으로 담았으면 그 보정 항목 id, 원본이면 null */
  retouchPhotoId: number | null;
  /** 보정본의 서명 URL — 원본으로 담은 항목은 null(그때는 photo.viewUrl로 그린다) */
  resultUrl: string | null;
};

export type PhotoSelectionResponse = {
  /** 고르는 중이면 SELECTING, 작가에게 넘어갔으면 SUBMITTED */
  status: "SELECTING" | "SUBMITTED";
  maxSelectablePhotoCount: number | null;
  selectedCount: number;
  /** 더 고를 수 있는 장수 — 제한 없으면 null, 계약 축소로 이미 넘겼으면 0 */
  remainingCount: number | null;
  submittedAt: string | null;
  /** 고른 항목 — 갤러리 노출 순서 */
  photos: SelectedPhotoResponse[];
  /** 서명 URL 남은 수명(초) */
  viewUrlTtlSeconds: number;
};

/** 선택 앨범 조회 — 갤러리를 볼 수 있는 누구나(작가는 마감 뒤에도). */
export function getPhotoSelection(
  galleryId: number,
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection`);
}

/**
 * 사진 담기 — 부부만. 실패: 409(이미 담긴 사진 섞임) ·
 * 400(계약 장수 초과·빈 목록·PENDING 사진) — 모두 통째 거절.
 */
export function selectPhotos(
  galleryId: number,
  photoIds: number[],
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/photos`, {
    method: "POST",
    body: { photoIds, retouchPhotos: [] },
  });
}

/** 여러 장 빼기 — 앨범에 없는 id가 섞여도 나머지는 빠진다. */
export function deselectPhotos(
  galleryId: number,
  photoIds: number[],
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/photos`, {
    method: "DELETE",
    body: { photoIds },
  });
}

/** 한 장 빼기 — 앨범에 없으면 404(조용히 넘어가지 않는다). */
export function deselectPhoto(
  galleryId: number,
  photoId: number,
): Promise<void> {
  return api(
    `/api/v1/galleries/${galleryId}/photo-selection/photos/${photoId}`,
    { method: "DELETE" },
  );
}

/**
 * 제출(작가에게 전달) — 부부만. 이후 담기·빼기가 잠긴다(409). 계약 장수를 **정확히** 채워야 한다
 * (미달·초과 SELECTION_400_7, 빈 선택 SELECTION_400_6). 선택된 사진은 모두 보정 대상이고 requests에
 * 사진별 전체 문장·점 주석을 동봉한다 — 선택 제출과 첫 보정 요청이 한 트랜잭션으로 저장된다.
 */
export function submitSelection(
  galleryId: number,
  requests: RetouchRequestItem[] = [],
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/submit`, {
    method: "POST",
    body: { requests },
  });
}

/** 계약 장수 상향 요청 — 스튜디오 초대 클라이언트만. 작가가 장수를 바꾸면 알림으로 돌아온다. */
export function requestSelectionIncrease(
  galleryId: number,
  requestedCount: number,
  message: string | null,
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/max-selectable-increase-request`, {
    method: "POST",
    body: { requestedCount, message: message?.trim() ? message.trim() : null },
  });
}

/**
 * 선택 목록 + 보정 요청서 CSV(UTF-8 BOM, 컬럼 photo_id · filename · request · point_requests).
 * api()는 JSON만 다루므로 직접 받아 Blob으로 돌려준다. 계약 장수를 채운 뒤에만 내려받을 수 있다.
 */
export async function downloadSelectionCsv(galleryId: number): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl()}/api/v1/galleries/${galleryId}/photo-selection/export`, { headers });
  if (!res.ok) {
    let code = "UNKNOWN";
    let message = `요청이 실패했습니다 (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { code?: unknown; message?: unknown };
      if (typeof body.code === "string") code = body.code;
      if (typeof body.message === "string") message = body.message;
    } catch {
      // JSON이 아닌 실패
    }
    throw new ApiError(res.status, code, message);
  }
  return res.blob();
}

/** 제출 취소(선택 다시 열기) — 담당 작가만. 부부가 다시 고를 수 있게 된다. */
export function withdrawSelection(
  galleryId: number,
): Promise<PhotoSelectionResponse> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/withdraw`, {
    method: "POST",
  });
}
