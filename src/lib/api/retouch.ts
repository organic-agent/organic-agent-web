/**
 * 보정 요청 API — 스웨거 [Retouch] 중 클라이언트 셀렉 단계에서 쓰는 부분
 * 위치: src/lib/api/retouch.ts
 *
 * 첫 보정 요청은 셀렉 제출(photo-selection/submit)에 requests[]로 실려 한 트랜잭션으로 저장된다.
 * 선택된 모든 사진이 기본 보정 대상이고, requests는 사진별 전체 문장 · 점(x, y 비율 + 문장) 주석이다.
 * AI 정제(refine)는 원문을 바꾸지 않고 제안만 돌려준다 — LLM이 꺼졌거나 서버가 미리보기를 읽지 못하면 available=false.
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

/**
 * 정제 판정. 화면은 이 값으로 제안 · 되묻기 · 원문 유지 중 무엇을 보여줄지 가른다.
 * available=false면 정제가 돌지 않았으므로 판정도 없다(null).
 */
export type RefineStatus = "READY" | "NEEDS_CLARIFICATION" | "NOT_A_REQUEST";

/** 정리안을 한 부위 한 동작으로 나눈 항목 — 아직 화면에서 쓰지 않고 계약만 받아 둔다 */
export type RefineRetouchItem = {
  /** 작업 대상 — 누구의 어느 부위인지, 사물이면 무엇인지와 사진 속 위치 */
  target: string;
  /** groom · bride · other_person · none */
  person: string;
  region: string;
  action: string;
  /** 원문이 말하지 않았으면 unspecified — 서버도 모델도 추측하지 않는다 */
  intensity: string;
  /** 스튜디오 보정 메뉴 id. 규칙표가 생기기 전까지 항상 null */
  menuId: string | null;
  /** 근거가 된 원문 구절 그대로 */
  sourceSpan: string;
};

/** 되묻기 선택지 — 원문 해석의 갈래지 새 보정 제안이 아니다 */
export type RefineRetouchOption = {
  label: string;
  sourceSpan: string;
};

export type RefineRetouchResponse = {
  originalText: string;
  /** 채택하면 원문을 대신할 정리안. status가 READY가 아니면 null */
  refinedText: string | null;
  /** false면 AI가 꺼져 있거나 서버가 미리보기를 읽지 못해 제안이 없다 */
  available: boolean;
  status: RefineStatus | null;
  /** 탭한 지점에 실제로 보이는 것. 좌표 없이 부른 호출은 null */
  tappedObject: string | null;
  /** 탭한 곳과 원문이 같은 것을 가리키는지. false면 서버가 NEEDS_CLARIFICATION으로 되돌린다 */
  pointMatchesText: boolean | null;
  items: RefineRetouchItem[];
  /** 되묻는 질문. NEEDS_CLARIFICATION이 아니면 빈 문자열이고, 옛 서버는 아예 안 보낸다 */
  question: string | null;
  options: RefineRetouchOption[] | null;
};

/**
 * 보정 요청 문장 AI 다듬기 — 원문은 그대로, 제안만
 *
 * photoId · x · y를 주면 서버가 미리보기에 탭 지점을 표시해 모델과 함께 보고 대상을 특정한다("이거 지워줘" →
 * "사진 오른쪽 잔디밭 위 검은 장비를 지워 주세요"). 빼면 텍스트만 보고 말투만 다듬는 옛 경로로 떨어지므로,
 * 점에 달린 요청은 좌표까지 함께 보낸다. 좌표 없이 photoId만 주면 사진 전체에 대한 메모로 다룬다.
 */
export function refineRetouchText(
  galleryId: number,
  request: { text: string; photoId?: number; x?: number; y?: number },
): Promise<RefineRetouchResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/requests/refine`, { method: "POST", body: request });
}

// ── 회차 · 결과 (작가 3단계 보정 작업, WES-308) ──

export type RetouchRoundStatus = "DRAFTING" | "REQUESTED" | "COMPLETED";

export type RetouchPhotoResponse = {
  retouchPhotoId: number;
  photo: import("@/lib/api/photos").PhotoResponse;
  requestText: string | null;
  points: RetouchPoint[];
  /** 주석 이미지 서명 URL(있으면) */
  annotationUrl: string | null;
  /** 결과가 올라왔는지 — 클라이언트에겐 회차가 보내진 뒤에만 true */
  hasResult: boolean;
};

export type RetouchPhotoDetailResponse = Omit<RetouchPhotoResponse, "hasResult"> & {
  /** 결과 서명 URL — 스튜디오 클라이언트에겐 보내기 전까지 null */
  resultUrl: string | null;
};

export type RetouchRoundSummaryResponse = {
  roundNo: number;
  status: RetouchRoundStatus;
  requestedAt: string | null;
  completedAt: string | null;
  photoCount: number;
};

export type RetouchRoundResponse = {
  roundNo: number;
  status: RetouchRoundStatus;
  requestedAt: string | null;
  completedAt: string | null;
  photos: RetouchPhotoResponse[];
};

export type RetouchOverviewResponse = {
  /** 계약 보정 횟수 — null이면 제한 없음 */
  maxRetouchRoundCount: number | null;
  remainingRoundCount: number | null;
  rounds: RetouchRoundSummaryResponse[];
  /** 아직 끝나지 않은(DRAFTING · REQUESTED) 마지막 회차와 그 항목 — 없으면 null */
  currentRound: RetouchRoundResponse | null;
  viewUrlTtlSeconds: number;
};

export type RetouchRoundDetailResponse = {
  roundNo: number;
  status: RetouchRoundStatus;
  requestedAt: string | null;
  completedAt: string | null;
  photos: RetouchPhotoDetailResponse[];
  viewUrlTtlSeconds: number;
};

/** 회차 목록 + 진행 중인 회차의 항목 전부 + 계약 · 남은 횟수. 갤러리를 볼 수 있는 사람이면 누구나 */
export function getRetouchOverview(galleryId: number): Promise<RetouchOverviewResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/rounds`);
}

/** 회차 하나의 항목 전부 — 원본 · 주석 · 결과 URL(전/후 비교) */
export function getRetouchRound(galleryId: number, roundNo: number): Promise<RetouchRoundDetailResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/rounds/${roundNo}`);
}

export type ResultMatch = {
  filename: string;
  contentType: string;
  /** 한 장으로 정해졌으면 그 사진, 후보가 여럿이거나 없으면 null */
  photoId: number | null;
  candidates: { photoId: number; filename: string }[];
};

/** 결과 파일명(확장자 제외)을 회차 항목의 원본 파일명과 맞춘다 */
export function matchRetouchResults(
  galleryId: number,
  roundNo: number,
  files: { filename: string; contentType: string }[],
): Promise<{ matches: ResultMatch[] }> {
  return api(`/api/v1/galleries/${galleryId}/retouch/rounds/${roundNo}/results/match`, { method: "POST", body: { files } });
}

export type IssuedResultUpload = { photoId: number; resultKey: string; uploadUrl: string };

/**
 * 결과 업로드 URL 발급 — 담당 작가만, 제출된(REQUESTED) 회차에만. 발급은 행을 만들지 않는다.
 * 첫 발급에 갤러리 stage가 RETOUCH로 바뀐다. 서명에 체크섬이 없으므로 PUT에 x-amz-checksum을 붙이면 안 된다.
 */
export function issueResultUploadUrls(
  galleryId: number,
  roundNo: number,
  files: { photoId: number; contentType: string }[],
): Promise<{ uploads: IssuedResultUpload[]; uploadUrlTtlSeconds: number }> {
  return api(`/api/v1/galleries/${galleryId}/retouch/rounds/${roundNo}/results/upload-urls`, { method: "POST", body: { files } });
}

/** S3 PUT을 마친 결과를 항목에 기록 — resultKey는 발급 값 그대로 */
export function completeRetouchResults(
  galleryId: number,
  roundNo: number,
  results: { photoId: number; resultKey: string; contentType: string }[],
): Promise<RetouchRoundDetailResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/rounds/${roundNo}/results/complete`, { method: "POST", body: { results } });
}

/** 회차 보내기(끝내기) — 항목 전부에 결과가 있어야. 갤러리 stage DELIVERY, 클라이언트에게 알림 */
export function sendRetouchRound(galleryId: number, roundNo: number): Promise<RetouchOverviewResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/rounds/${roundNo}/send`, { method: "POST" });
}

/** 계약 보정 횟수 변경 — 담당 작가만. null이면 제한 없음 */
export function changeMaxRetouchRoundCount(galleryId: number, maxRetouchRoundCount: number | null): Promise<import("@/lib/api/galleries").GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/max-retouch-round-count`, { method: "PATCH", body: { maxRetouchRoundCount } });
}

/**
 * 선택 사진의 N차 보정 요청 제출(스튜디오 갤러리 · 부부) — 지난 회차가 보내진 뒤, 남은 횟수 안에서.
 * requests의 photoId는 선택 앨범의 사진이어야 한다(아니면 거절). 새 회차가 REQUESTED로 생기고 작가에게 알림.
 */
export function submitRoundRequests(galleryId: number, roundNo: number, requests: RetouchRequestItem[]): Promise<RetouchOverviewResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/rounds/${roundNo}/requests`, { method: "POST", body: { requests } });
}

/** 클라이언트 보정 확정 — 최신 회차를 작가가 보낸 뒤에만. 갤러리는 읽기 전용 보관(ARCHIVED) */
export function confirmRetouch(galleryId: number): Promise<RetouchOverviewResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch/confirm`, { method: "POST" });
}
