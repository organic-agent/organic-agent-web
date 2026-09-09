/**
 * 작가 — 사진 휴지통 훅 (WES-267)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_lib/useTrashedPhotos.ts
 *
 * 휴지통 목록은 사이드바 개수 표시에도 쓰여 갤러리 진입 시 한 번 부르고,
 * 삭제·복원·완전 삭제 뒤 reload로 맞춘다. viewUrl은 서명 URL이라 TTL 만료
 * 60초 전에 조용히 다시 불러 URL만 갈아끼운다(사진 목록 훅과 같은 규칙).
 */

import { useEffect, useRef, useState } from "react";
import { listTrashedPhotos } from "@/lib/api/photos";

export type TrashedPhoto = {
  id: number;
  url: string | null;
  name: string;
  deletedAt: string;
  /** 이 시각이 지나면 자동으로 물리 삭제된다. */
  expiresAt: string;
};

export type TrashedPhotosResult =
  | { kind: "ready"; photos: TrashedPhoto[] }
  | { kind: "error" };

export function useTrashedPhotos(rawId: string) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [result, setResult] = useState<TrashedPhotosResult | null>(null);
  const [nonce, setNonce] = useState(0);
  const ttlTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listTrashedPhotos(id);
        if (cancelled) return;
        setResult({
          kind: "ready",
          photos: res.photos.map((p) => ({
            id: p.photoId,
            url: p.viewUrl,
            name: p.originalFileName,
            deletedAt: p.deletedAt,
            expiresAt: p.expiresAt,
          })),
        });
        if (ttlTimerRef.current !== null)
          window.clearTimeout(ttlTimerRef.current);
        const delay = Math.max(30, res.viewUrlTtlSeconds - 60) * 1000;
        ttlTimerRef.current = window.setTimeout(
          () => setNonce((n) => n + 1),
          delay,
        );
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
      if (ttlTimerRef.current !== null) window.clearTimeout(ttlTimerRef.current);
    };
  }, [id, validId, nonce]);

  /** 삭제·복원·완전 삭제 뒤 재조회 */
  function reload() {
    setNonce((n) => n + 1);
  }

  return { result: validId ? result : null, reload };
}
