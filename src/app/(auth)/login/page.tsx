/**
 * /login 페이지 — 직접 URL 접근 & 초대 링크용
 * 위치: src/app/(auth)/login/page.tsx
 *
 * 랜딩에서는 모달로 열리지만, 다음 경우엔 이 페이지로 온다:
 *   · 부부 초대 링크: /login?role=couple&inviteToken=xxx
 *   · 직접 /login URL 접근 (북마크, 공유 등)
 *   · OAuth 콜백 에러: /login?error=...
 *
 * LoginModal 컴포넌트를 asPage 모드로 렌더해 UI를 통일한다.
 */

import { LoginModal } from "@/components/LoginModal";

type LoginSearchParams = {
  role?: string;
  inviteToken?: string;
  error?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const { role = "photographer", inviteToken, error } = await searchParams;

  const intent = role === "couple" ? "couple" : "studio";

  return (
    <LoginModal
      asPage
      intent={intent}
      inviteToken={inviteToken ?? null}
      errorCode={error ?? null}
    />
  );
}
