/**
 * 초대 안내 — 초대 링크 없이 들어온 예비 부부가 도착하는 곳
 * 위치: src/app/(auth)/invite/page.tsx
 *
 * 부부 정책: 갤러리 참여는 작가가 보낸 초대 링크로만 가능하다. 초대 없이
 * 로그인한 신규 부부를 갤러리 대신 여기로 보낸다(loginFlow.resolveDestination).
 */

import { Button } from "@/components/ui/Button";

export default function InviteGuidePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background-default-main px-6">
      <div className="flex max-w-100 flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="type-title-xl text-contents-light-bgd-default">
            초대 링크가 필요해요
          </h1>
          <p className="type-content-xs text-contents-light-bgd-sub">
            갤러리는 담당 작가님이 보내주신 초대 링크로 참여할 수 있어요.
            전달받은 링크를 눌러 다시 들어와주세요.
          </p>
        </div>
        <Button href="/" kind="primary" size="md">
          홈으로
        </Button>
      </div>
    </main>
  );
}
