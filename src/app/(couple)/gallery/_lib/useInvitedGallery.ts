/**
 * 부부 — 초대받은 갤러리 컨텍스트 훅
 * 위치: src/app/(couple)/gallery/_lib/useInvitedGallery.ts
 *
 * GET /galleries는 부부에게 초대를 수락한 갤러리만 돌려준다(DRAFT 제외).
 * 하나도 없으면 아직 초대받지 못한 상태 — 무초대 안내 화면의 근거.
 * 여러 개면 우선 첫 항목으로 들어간다(갤러리 선택 화면은 필요해질 때).
 */

import { useEffect, useState } from "react";
import { type GalleryResponse, listGalleries } from "@/lib/api/galleries";

export type InvitedGalleryResult =
  | { kind: "ready"; gallery: GalleryResponse }
  | { kind: "none" }
  | { kind: "error" };

export function useInvitedGallery() {
  const [result, setResult] = useState<InvitedGalleryResult | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const galleries = await listGalleries();
        if (cancelled) return;
        setResult(
          galleries.length > 0
            ? { kind: "ready", gallery: galleries[0] }
            : { kind: "none" },
        );
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  /** 실패 재시도 */
  function reload() {
    setNonce((n) => n + 1);
  }

  return { result, reload };
}

/**
 * 마감 기한 표시 문구 — 마감 전 "D-n", 당일 "오늘 마감", 지나면 "n일 지연".
 * 마감일 당일 23:59까지는 여유로 친다(작가 목록의 문구 규칙과 동일).
 */
/** 선택 기한이 지났는지 — 마감일 당일 23:59까지는 여유로 친다 */
export function isDeadlinePassed(
  selectionDeadline: string | null,
  now: Date = new Date(),
): boolean {
  if (!selectionDeadline) return false;
  const due = new Date(selectionDeadline);
  due.setHours(23, 59, 59, 999);
  return now.getTime() > due.getTime();
}

export function deadlineLabel(
  selectionDeadline: string | null,
  now: Date = new Date(),
): string | undefined {
  if (!selectionDeadline) return undefined;
  const due = new Date(selectionDeadline);
  due.setHours(23, 59, 59, 999);
  const offset = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  if (offset > 0) return `${offset}일 지연`;
  if (offset === 0) return "오늘 마감";
  return `D-${-offset}`;
}
