/**
 * 보정 요청 API — 스웨거 [Retouch] 중 클라이언트 셀렉 단계에서 쓰는 부분
 * 위치: src/lib/api/retouch.ts
 *
 * 첫 보정 요청은 셀렉 제출(photo-selection/submit)에 requests[]로 실려 한 트랜잭션으로 저장된다.
 * 선택된 모든 사진이 기본 보정 대상이고, requests는 사진별 전체 문장 · 점(x, y 비율 + 문장) 주석이다.
 * AI 정제(refine)는 원문을 바꾸지 않고 제안만 돌려준다 — LLM이 꺼진 환경은 available=false.
 */

import { api } from "@/lib/api/client";

export type RetouchPoint = {
  /** 사진 폭 · 높이에 대한 0~1 비율 */
  x: number;
  y: number;
  text: string;
  /** AI 제안 문장. 받은 적 없으면 null */
  refinedText: string | null;
  /** true면 작가에게 refinedText가 요청 문장으로 보인다 */
  useRefinedText: boolean;
};

export type RetouchRequestItem = {
  photoId: number;
  /** 사진 전체 요청(선택) */
  requestText: string | null;
  /** 주석 이미지 키 — 화면에서는 아직 안 쓴다 */
  annotationKey: string | null;
  points: RetouchPoint[];
};

export type RefineRetouchResponse = {
  originalText: string;
  refinedText: string | null;
  /** false면 AI가 꺼져 있어 제안이 없다 */
  available: boolean;
};

/** 보정 요청 문장 AI 다듬기 — 원문은 그대로, 제안만 */
export function refineRetouchText(galleryId: number, text: string): Promise<RefineRetouchResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/requests/refine`, { method: "POST", body: { text } });
}
