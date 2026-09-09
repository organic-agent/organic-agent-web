/**
 * 클라이언트 — 주소의 갤러리 컨텍스트 훅
 * 위치: src/app/(client)/gallery/_lib/useInvitedGallery.ts
 *
 * /gallery/[galleryId]의 id로 갤러리를 단건 조회한다. 초대를 수락한 멤버만
 * 볼 수 있어서 403과 404는 둘 다 "내 갤러리가 아니다"로 묶어 notFound로 낸다.
 * 번호가 아닌 주소는 서버에 묻지 않고 바로 notFound다.
 */

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { type GalleryResponse, getGallery } from "@/lib/api/galleries";

export type InvitedGalleryResult =
  | { kind: "ready"; gallery: GalleryResponse }
  | { kind: "notFound" }
  | { kind: "error" };

const NOT_FOUND: InvitedGalleryResult = { kind: "notFound" };

export function useInvitedGallery(rawId: string) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [fetched, setFetched] = useState<InvitedGalleryResult | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      try {
        const gallery = await getGallery(id);
        if (!cancelled) setFetched({ kind: "ready", gallery });
      } catch (err) {
        if (cancelled) return;
        const gone =
          err instanceof ApiError && (err.status === 403 || err.status === 404);
        setFetched(gone ? NOT_FOUND : { kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, validId, nonce]);

  /** 실패 재시도 */
  function reload() {
    setFetched(null);
    setNonce((n) => n + 1);
  }

  return { result: validId ? fetched : NOT_FOUND, reload };
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
