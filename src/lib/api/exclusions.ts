/**
 * 셀렉 휴지통(제외 폴더) API — 스웨거 [Photo Exclusion] 계약의 타입화(서버 PR 365, 웹 이슈 160)
 * 위치: src/lib/api/exclusions.ts
 *
 * "휴지통"은 사진을 지우지 않고 셀렉 일반 목록 · 폴더 · 추천 · 기존 게스트 공유에서 숨겨 두는 제외 상태다. 원본 · 업로드 용량 ·
 * 별점 · 메모 · 폴더 배정 · 공유 반응은 그대로이고 보관 만료도 없다. 실제 삭제(/photos DELETE · /photos/trash)와는 별개의 흐름이다.
 * - 제외하면 서버가 같은 트랜잭션에서 선택 목록에서도 뺀다. 복원해도 선택에 자동으로 담기지 않는다.
 * - 개인 · 스튜디오 부부 참여자만 제외 · 복원한다(선택 중에만). 작가는 목록 조회만, 게스트는 못 본다.
 * - 확정 · 요청서 내보내기 뒤에는 409(PHOTO_409_2) — 기존 재선택 절차(개인: 내보내기 취소)를 먼저 거친다.
 * - 변경은 selection-sync의 exclusionRevision으로 알 수 있다(개인 갤러리 부부의 3초 동기화, useSelectionSync).
 */

import { api } from "@/lib/api/client";
import type { PhotoPageResponse, PhotoResponse } from "@/lib/api/photos";

/** 한 요청에 보낼 수 있는 최대 id 수(서버 상한) — 넘으면 나눠 보낸다 */
export const EXCLUSION_BATCH = 500;
/** 목록 한 페이지 최대 */
export const EXCLUSION_PAGE = 200;
/** 확정 · 내보내기 뒤 잠금 */
export const EXCLUSION_LOCKED = "PHOTO_409_2";

export type ExclusionCountResponse = {
  /** 실제로 새로 제외(또는 복원)한 장수 — 이미 그 상태였던 사진은 세지 않는다. 0도 정상 */
  count: number;
};

/** 제외 사진 한 페이지 — 사진 순서 · id 순, 기존 PhotoPageResponse 모양(썸네일 URL 포함). 작가에게는 별점 · 메모가 가려진다 */
export function listExcludedPhotos(galleryId: number, page = 0, size = EXCLUSION_PAGE): Promise<PhotoPageResponse> {
  return api(`/api/v1/galleries/${galleryId}/photos/exclusions?page=${page}&size=${size}`);
}

/** 제외 사진 전부 — 200장씩 끝까지 읽는다(휴지통은 보통 몇십 장) */
export async function listAllExcludedPhotos(galleryId: number): Promise<{ photos: PhotoResponse[]; totalCount: number }> {
  const photos: PhotoResponse[] = [];
  let page = 0;
  let totalCount = 0;
  for (;;) {
    const res = await listExcludedPhotos(galleryId, page, EXCLUSION_PAGE);
    photos.push(...res.contents);
    totalCount = res.totalCount;
    if (!res.hasNext || res.contents.length === 0) break;
    page += 1;
  }
  return { photos, totalCount };
}

/** 중복을 없애고 서버 상한대로 자른다 */
function batches(photoIds: number[]): number[][] {
  const ids = [...new Set(photoIds)];
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += EXCLUSION_BATCH) out.push(ids.slice(i, i + EXCLUSION_BATCH));
  return out;
}

/**
 * 사진을 셀렉에서 일괄 제외(휴지통으로) — 1~500개씩, 넘으면 나눠 보내고 실제로 새로 제외한 장수의 합을 돌려준다.
 * 배치마다 원자적이라 중간에 실패하면 앞 배치는 이미 반영돼 있을 수 있다 — 호출한 쪽은 실패해도 서버 목록을 다시 읽어 맞춘다.
 * 400(빈 목록 · 상한 · 업로드 미완료) · 403(권한 · 쓰기 기한) · 404(다른 갤러리 · 실제 삭제된 사진이 하나라도) · 409(확정 뒤).
 */
export async function excludePhotos(galleryId: number, photoIds: number[]): Promise<number> {
  let count = 0;
  for (const ids of batches(photoIds)) {
    const res = await api<ExclusionCountResponse>(`/api/v1/galleries/${galleryId}/photos/exclusions`, { method: "PUT", body: { photoIds: ids } });
    count += res.count;
  }
  return count;
}

/**
 * 제외 해제(복원) — 원래 폴더 · 기존 공유에 다시 보이고 선택 목록에는 자동으로 담기지 않는다. 폴더가 삭제됐으면 미분류.
 * 파일 삭제가 아니다(실제 삭제용 /photos/trash와 다르다). 규칙 · 오류는 excludePhotos와 같다.
 */
export async function restoreExcludedPhotos(galleryId: number, photoIds: number[]): Promise<number> {
  let count = 0;
  for (const ids of batches(photoIds)) {
    const res = await api<ExclusionCountResponse>(`/api/v1/galleries/${galleryId}/photos/exclusions`, { method: "DELETE", body: { photoIds: ids } });
    count += res.count;
  }
  return count;
}
