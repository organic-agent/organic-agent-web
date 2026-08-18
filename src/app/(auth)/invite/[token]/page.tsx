/**
 * 초대 링크 랜딩 — 작가가 발급한 초대 링크(/invite/{token})가 가리키는 곳
 * 위치: src/app/(auth)/invite/[token]/page.tsx
 *
 * 주소 형태는 백엔드 설정(app.invite.base-url)과 맞물려 있다 — 바꾸려면
 * 백엔드 Parameter Store와 함께 바꿔야 한다.
 */

import { InviteLanding } from "./_components/InviteLanding";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteLanding token={token} />;
}
