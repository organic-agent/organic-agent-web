/**
 * 백엔드 베이스 URL — 관문(client.ts)과 재발급(refreshTokens.ts)이 함께 쓴다
 * 위치: src/lib/api/baseUrl.ts
 */

export function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    // 빌드 시점에 인라인되는 값이라, 없다면 .env.local 누락이거나
    // 버셀 환경변수 미등록이다. 조용히 잘못된 주소로 나가느니 즉시 멈춘다.
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다. .env.local 또는 버셀 환경변수를 확인하세요.",
    );
  }
  return url;
}
