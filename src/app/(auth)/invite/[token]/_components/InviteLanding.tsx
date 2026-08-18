"use client";

/**
 * 초대 수락 화면 — 로그인 여부를 확인한 뒤 수락 API를 부른다
 * 위치: src/app/(auth)/invite/[token]/_components/InviteLanding.tsx
 *
 * 분기:
 *  - 복구 중(loading): 기다린다. guest로 속단해 로그인으로 보내면
 *    로그인돼 있던 사용자가 불필요한 로그인 화면을 본다.
 *  - guest: 로그인으로 보낸다. 이후는 로그인-수락 통합 흐름(#9)이 맡는다.
 *  - 로그인됨: 수락 API를 직접 부른다 — OAuth 왕복이 없어 서버 통합 수락이
 *    일어나지 않는 유일한 경로가 이곳이다.
 *
 * 수락 API는 멱등이라 재호출이 위험하진 않지만, StrictMode의 이중 실행으로
 * 네트워크가 두 번 나가는 것은 막는다. 실패 시에는 가드를 풀어 재시도를
 * 허용한다.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { acceptInvite } from "@/lib/api/invites";
import { useAuth } from "@/lib/auth/authStore";

const acceptedTokens = new Set<string>();

type Screen = { title: string; description: string };

// 백엔드가 404와 410을 나눠둔 의도(스웨거: "작가에게 다시 요청하세요"를
// 안내하기 위해)를 문구에 그대로 반영한다.
const ERROR_SCREENS: Record<string, Screen> = {
  GALLERY_404_3: {
    title: "존재하지 않는 초대 링크예요",
    description: "주소가 정확한지 확인해주세요. 링크가 잘린 채 전달됐을 수도 있어요.",
  },
  GALLERY_410_1: {
    title: "만료된 초대 링크예요",
    description: "작가님께 새 초대 링크를 요청해주세요.",
  },
  GALLERY_410_2: {
    title: "회수된 초대 링크예요",
    description: "작가님이 이 링크를 거둬들였어요. 새 초대 링크를 요청해주세요.",
  },
  GALLERY_403_3: {
    title: "내가 만든 갤러리의 초대예요",
    description: "담당 작가는 자기 갤러리의 초대를 수락할 수 없어요.",
  },
  GALLERY_403_5: {
    title: "정원이 가득 찼어요",
    description: "이미 두 분이 함께하고 있는 갤러리예요. 작가님께 문의해주세요.",
  },
};

const FALLBACK_ERROR: Screen = {
  title: "초대를 확인하지 못했어요",
  description: "네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.",
};

export function InviteLanding({ token }: { token: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === "loading") return;

    if (auth.status === "guest") {
      const query = new URLSearchParams({ role: "couple", inviteToken: token });
      router.replace(`/login?${query.toString()}`);
      return;
    }

    if (acceptedTokens.has(token)) return;
    acceptedTokens.add(token);

    (async () => {
      try {
        await acceptInvite(token);
        router.replace("/gallery");
      } catch (err) {
        acceptedTokens.delete(token);
        setErrorCode(err instanceof ApiError ? err.code : "network");
      }
    })();
  }, [auth.status, token, router]);

  if (errorCode) {
    const screen = ERROR_SCREENS[errorCode] ?? FALLBACK_ERROR;
    return (
      <main className="grid min-h-dvh place-items-center bg-bg-layer-default px-6">
        <div className="flex max-w-100 flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="type-heading-large text-fg-neutral">{screen.title}</h1>
            <p className="type-body-small text-fg-neutral-muted">
              {screen.description}
            </p>
          </div>
          <Button href="/" kind="primary" size="md">
            홈으로
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg-layer-default">
      <p className="type-body-small text-fg-neutral-muted animate-pulse">
        초대를 확인하고 있어요…
      </p>
    </main>
  );
}
