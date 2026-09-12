/**
 * AI 셀렉 추천 API — 스웨거 [AI Recommendation] 계약의 타입화
 * 위치: src/lib/api/recommendations.ts
 *
 * 추천은 "라운드" 단위 잡이다. POST가 큐에 넣으면 AI 워커가 최신 AI 폴더 세트의 자식 폴더마다 계약 장수에 비례한
 * n장(폴더당 최소 1장, 폴더의 절반 이하)을 점수순으로 고른다(연사는 대표 1장). GET은 사진마다 가장 최근 추천을
 * 돌려주므로 **이번 라운드의 답만** 보려면 photos[].round === job.round인 항목을 쓴다. 이유 문장은 잡이 DONE이 된 뒤에도
 * reasonReady=false일 수 있어 잠시 폴링한다.
 */

import { api } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";

export type AiSelectionJob = {
  jobId: number;
  selectionId: number;
  /** DRAFT(첫 라운드) · REFINE(담기 · 거절을 반영한 다음 라운드) */
  mode: "DRAFT" | "REFINE";
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  folderSetJobId: number | null;
  detailFolderId: number | null;
  round: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  createdAt: string | null;
  prompt: string | null;
  targetCount: number | null;
  recommendedCount: number | null;
  shortfallCount: number | null;
};

export type AiRecommendation = {
  /** 사진이 지금 든 세부 폴더 id(미분류면 null) — 추천 당시가 아니라 현재 배정 */
  folderId: number | null;
  /** 폴더 안 순위, 1이 대표 */
  rank: number;
  reason: string | null;
  reasonReady: boolean;
  /** 지금 선택 앨범에 담겨 있는지 */
  selected: boolean;
  photo: PhotoResponse;
  round: number | null;
};

export type AiRecommendationList = {
  /** 이 응답이 담은 라운드 — 추천이 한 번도 없었으면 null */
  round: number | null;
  job: AiSelectionJob | null;
  photos: AiRecommendation[];
  viewUrlTtlSeconds: number;
};

/** 가장 최근 추천 조회 — folderId를 주면 그 세부 폴더의 추천만 */
export function getRecommendations(galleryId: number, folderId?: number): Promise<AiRecommendationList> {
  const query = folderId !== undefined ? `?folderId=${folderId}` : "";
  return api(`/api/v1/galleries/${galleryId}/photo-selection/recommendations${query}`);
}

/**
 * 추천 한 라운드 요청 — 본문 없이 보내면 계약 장수 기준으로 모든 자식 폴더에서 고른다.
 * detailFolderId를 주면 그 폴더만. 실패: 409(진행 중인 잡) · 400(폴더 없음 등).
 */
export function requestRecommendations(
  galleryId: number,
  body: { detailFolderId?: number | null; targetCount?: number | null } = {},
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/photo-selection/recommendations`, { method: "POST", body });
}
