"use client";

/**
 * 클라이언트 — 내 갤러리로 (번호 없는 진입 주소)
 * 위치: src/app/(client)/gallery/page.tsx
 *
 * /gallery 로 들어오면 초대 수락한 갤러리 목록의 첫 항목 /gallery/[id]로 보낸다.
 * 갤러리가 여럿일 때 고르는 화면(워크스페이스 목록)은 진입 흐름 2단계에서 붙는다.
 * 하나도 없으면 아직 초대받지 못한 상태다.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { listGalleries } from "@/lib/api/galleries";

type State = "loading" | "none" | "error";

export default function MyGalleryPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listGalleries();
        if (cancelled) return;
        if (list.length > 0) router.replace(`/gallery/${list[0].id}`);
        else setState("none");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, nonce]);

  const copy =
    state === "none"
      ? {
          title: "아직 초대받은 갤러리가 없어요",
          desc: "작가님이 보낸 초대 링크로 들어오면 갤러리가 여기에 열려요.",
        }
      : state === "error"
        ? {
            title: "갤러리를 불러오지 못했어요",
            desc: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
          }
        : { title: "내 갤러리로 이동하는 중이에요", desc: "잠시만 기다려 주세요." };

  return (
    <main className="grid min-h-dvh place-items-center bg-background-default-main px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="type-title-m text-contents-light-bgd-default">{copy.title}</h1>
        <p className="type-content-m text-contents-light-bgd-sub">{copy.desc}</p>
        {state === "error" && (
          <Button
            onClick={() => {
              setState("loading");
              setNonce((n) => n + 1);
            }}
          >
            다시 시도
          </Button>
        )}
        {state === "none" && (
          <Button kind="ghost" href="/">
            홈으로
          </Button>
        )}
      </div>
    </main>
  );
}
