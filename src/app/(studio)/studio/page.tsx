"use client";

/**
 * 스튜디오 — 내 스튜디오로 (번호 없는 진입 주소)
 * 위치: src/app/(studio)/studio/page.tsx
 *
 * /studio 로 들어오면 내 소속 중 가장 최근에 활동한 스튜디오 /studio/[workspaceId]로 보낸다.
 * 스튜디오 소속이 없으면 스튜디오 온보딩으로. 여럿일 때 고르는 화면(워크스페이스 목록)은
 * 진입 흐름 2단계에서 붙는다. 구 주소 /galleries 는 next.config에서 여기로 온다.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getMe } from "@/lib/api/auth";
import { sortByRecentActivity, workspacePath } from "@/lib/auth/loginFlow";

export default function MyStudioPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        const studios = sortByRecentActivity(
          (me.workspaces ?? []).filter((w) => w.kind === "STUDIO"),
        );
        router.replace(
          studios.length > 0 ? workspacePath(studios[0]) : "/onboarding/studio",
        );
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, nonce]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background-default-main px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="type-title-m text-contents-light-bgd-default">
          {failed ? "스튜디오를 불러오지 못했어요" : "내 스튜디오로 이동하는 중이에요"}
        </h1>
        <p className="type-content-m text-contents-light-bgd-sub">
          {failed ? "네트워크 연결을 확인한 뒤 다시 시도해 주세요." : "잠시만 기다려 주세요."}
        </p>
        {failed && (
          <Button
            onClick={() => {
              setFailed(false);
              setNonce((n) => n + 1);
            }}
          >
            다시 시도
          </Button>
        )}
      </div>
    </main>
  );
}
