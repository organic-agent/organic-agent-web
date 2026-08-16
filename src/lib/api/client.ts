/**
 * API 관문 — 모든 백엔드 요청이 지나가는 단일 통로
 * 위치: src/lib/api/client.ts
 *
 * 하는 일: 베이스 URL 결합, Bearer 토큰 자동 주입, 에러 정규화(ApiError),
 * 그리고 access 만료(AUTH_401_1) 시 조용한 재발급 후 1회 재시도.
 *
 * 토큰 주입은 기본 켬(auth: true)이다. 이 API의 엔드포인트 대부분이 인증
 * 필수라, 깜빡했을 때 안전한 쪽을 기본값으로 삼았다. 공개 엔드포인트
 * (login·reissue 등)는 auth: false를 명시한다 — 만료된 토큰이 실려 가면
 * 서버 필터가 경로 검사 전에 토큰부터 거부할 수 있어서다.
 */

import { baseUrl } from "@/lib/api/baseUrl";
import { refreshTokens } from "@/lib/auth/refreshTokens";
import { getAccessToken } from "@/lib/auth/tokenStore";

/**
 * 서버가 응답한 실패. 백엔드의 에러 계약 {code, message}를 그대로 나른다.
 * 네트워크 자체가 끊긴 실패는 이 타입이 아니라 fetch의 TypeError로 온다 —
 * 사용자 안내가 달라야 하는 별개 상황이라 일부러 합치지 않았다.
 */
export class ApiError extends Error {
  constructor(
    /** HTTP 상태 코드 (예: 401, 410) */
    public readonly status: number,
    /** 백엔드 에러 코드 (예: "AUTH_401_1"). 화면 분기는 이 값으로 한다. */
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON으로 직렬화되어 전송된다. */
  body?: unknown;
  /** false면 Authorization 헤더를 싣지 않는다. 기본 true. */
  auth?: boolean;
};

async function toApiError(res: Response): Promise<ApiError> {
  let code = "UNKNOWN";
  let message = `요청이 실패했습니다 (HTTP ${res.status})`;
  try {
    const body = (await res.json()) as { code?: unknown; message?: unknown };
    if (typeof body.code === "string") code = body.code;
    if (typeof body.message === "string") message = body.message;
  } catch {
    // 백엔드가 아닌 중간 계층(ALB 등)의 에러는 JSON이 아닐 수 있다.
  }
  return new ApiError(res.status, code, message);
}

async function request<T>(path: string, options: ApiOptions): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw await toApiError(res);

  // 204나 빈 바디를 json()으로 읽으면 터진다. 텍스트로 받아 있을 때만 파싱한다.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (err) {
    // 재발급이 의미 있는 경우는 딱 하나 — 인증 요청이 "만료"로 거부됐을 때.
    // 위조(AUTH_401_2)·토큰 없음(AUTHZ_401_1) 등은 재발급으로 해결되지 않는다.
    const expired =
      options.auth !== false &&
      err instanceof ApiError &&
      err.status === 401 &&
      err.code === "AUTH_401_1";
    if (!expired) throw err;

    if ((await refreshTokens()) !== "refreshed") throw err;

    // 딱 1회 재시도. 여기서 또 만료가 나와도 그대로 던져진다 — 루프 차단.
    return request<T>(path, options);
  }
}
