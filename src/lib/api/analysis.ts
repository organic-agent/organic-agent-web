/**
 * AI 분석 잡 API — 스웨거 [AI Analysis] 계약의 타입화
 * 위치: src/lib/api/analysis.ts
 *
 * 사진별 임베딩(미리보기 · 벡터)과 점수는 서버가 업로드된 사진을 잡과 무관하게 5초
 * 스윕으로 밀어 준다 — 프론트가 죽어도 이어진다. 그러나 **컨셉 › 세부 폴더는 잡 안에서만
 * 만들어진다**: 잡은 점수가 다 차기를 기다리다가(ANALYZING) 그룹 · 이름 붙이기를 한 번
 * 부르고(CATEGORIZING) 폴더를 만든 뒤 닫힌다(DONE). 잡은 프론트가 요청해야 생긴다 —
 * 업로드 큐가 비면 자동으로 부르고, 작가가 버튼으로도 부른다.
 *
 * 진행은 사진 수 기준 카운트(progress)로만 온다. 퍼센트 · ETag 없음. 사진 요약
 * (GET /photos/summary)과 같은 프로젝션이라 어느 쪽으로 그려도 화면과 서버가 어긋나지 않는다.
 *
 * 오류 코드 접두어가 RECOMMENDATION_ 인 것은 서버 쪽 미정리(ANALYSIS_로 바꾸는 것을
 * 프론트와 같이 정한다고 메모돼 있다). 분기는 이 파일의 상수로만 하고 화면에 흩뿌리지 않는다.
 */

import { api, ApiError } from "@/lib/api/client";

export type AnalysisStatus = "ANALYZING" | "CATEGORIZING" | "DONE" | "FAILED";

/**
 * 사진 수 기준 진행. expected = 올라온 사진 중 결정적 실패가 아닌 것.
 * embedded ⊆ expected, scored ⊆ embedded, categorized ⊆ scored.
 */
export type AnalysisProgress = {
  expected: number;
  embedded: number;
  scored: number;
  categorized: number;
  /** 결정적으로 실패해 AI 대상에서 빠진 사진 — 갤러리에는 보이지만 분모에서 빠진다 */
  failed: number;
};

export type AnalysisJobResponse = {
  jobId: number;
  galleryId: number;
  status: AnalysisStatus;
  progress: AnalysisProgress;
  /** FAILED일 때만 이유 */
  error: string | null;
  createdAt: string | null;
  finishedAt: string | null;
};

/** 잡이 아직 없다(= 시작 전). 오류가 아니다 */
export const ANALYSIS_JOB_NOT_FOUND = "RECOMMENDATION_404_1";
/** 진행 중(ANALYZING · CATEGORIZING) 잡이 이미 있다 — 그 잡이 새 사진을 흡수한다 */
export const ANALYSIS_JOB_ALREADY_ACTIVE = "RECOMMENDATION_409_1";
/** 업로드가 끝난 사진이 한 장도 없다 */
export const ANALYSIS_NO_PHOTOS = "RECOMMENDATION_409_2";
/** 이 서버에는 분석 실행기(Lambda)가 설정되지 않았다 — 백엔드 로컬 프로필에서 정상 */
export const ANALYSIS_NOT_CONFIGURED = "PHOTO_503_1";

export function isAnalysisActive(job: AnalysisJobResponse | null | undefined): boolean {
  return job?.status === "ANALYZING" || job?.status === "CATEGORIZING";
}

/**
 * 갤러리 AI 분석 요청 — 본문 없음, 202로 잡을 돌려준다. 비동기라 상태는 GET으로 폴링한다.
 * 이미 벡터 · 점수가 있는 사진은 다시 계산하지 않으므로, 사진을 더 올린 뒤 다시 불러도
 * 새 사진만 처리된다(단, 폴더는 새 컨셉 폴더로 덧붙는다 — 백엔드 확인 항목).
 *
 * 실패: 409 ANALYSIS_JOB_ALREADY_ACTIVE(폴링만 붙이면 됨) · 409 ANALYSIS_NO_PHOTOS ·
 * 503 ANALYSIS_NOT_CONFIGURED · 403(담당 작가 아님 · 보관된 갤러리).
 */
export function requestAnalysis(galleryId: number): Promise<AnalysisJobResponse> {
  return api(`/api/v1/galleries/${galleryId}/ai-analysis`, { method: "POST" });
}

/**
 * 가장 최근 분석 잡. 잡이 한 번도 없었으면 서버는 404를 주는데 그것은 "시작 전"이라
 * null로 돌려준다. 담당 작가만 볼 수 있다(클라이언트는 사진 요약으로 본다).
 */
export async function getLatestAnalysis(galleryId: number): Promise<AnalysisJobResponse | null> {
  try {
    return await api<AnalysisJobResponse>(`/api/v1/galleries/${galleryId}/ai-analysis`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
