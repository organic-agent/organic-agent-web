/**
 * OAuth 콜백 라우트 — provider가 로그인 결과를 돌려보내는 곳
 * 위치: src/app/(auth)/login/oauth2/code/[provider]/page.tsx
 *
 * 이 주소(/login/oauth2/code/{provider})는 백엔드가 생성하는 redirect_uri와
 * 글자 단위로 일치해야 한다. 바꾸려면 백엔드·소셜 콘솔과 함께 바꿔야 한다.
 *
 * 서버 컴포넌트는 주소 검증과 쿼리 정리만 하고, 교환·이동은 클라이언트
 * 컴포넌트가 한다 — 토큰 저장소(localStorage·메모리)가 브라우저에만 있어서다.
 */

import { notFound } from "next/navigation";
import { OAuthCallback } from "./_components/OAuthCallback";

const PROVIDERS = ["google", "naver", "kakao"] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

/** 같은 키가 중복되면 배열로 오는 쿼리를 첫 값으로 정규화한다. */
function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export default async function OAuthCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { provider } = await params;
  const query = await searchParams;

  if (!isProvider(provider)) notFound();

  return (
    <OAuthCallback
      provider={provider}
      code={first(query.code)}
      state={first(query.state)}
      error={first(query.error)}
    />
  );
}
