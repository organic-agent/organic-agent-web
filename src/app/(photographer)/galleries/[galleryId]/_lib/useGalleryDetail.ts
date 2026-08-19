/**
 * 작가 — 갤러리 단건 조회 훅
 * 위치: src/app/(photographer)/galleries/[galleryId]/_lib/useGalleryDetail.ts
 *
 * 상세 화면의 갤러리 메타(제목·상태·마감일·계약 장수)를 서버에서 읽는다.
 * 403(권한 없음)과 404(없음)는 안내가 달라야 해서 결과 종류로 구분한다.
 * result가 null인 동안이 로딩이다. 상태 전환(열기/마감/재오픈) 성공 시에는
 * replace로 응답을 바로 반영해 재조회 없이 화면을 갱신한다.
 */

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { type GalleryResponse, getGallery } from "@/lib/api/galleries";

type Result =
  | { kind: "ready"; gallery: GalleryResponse }
  | { kind: "forbidden" }
  | { kind: "notFound" }
  | { kind: "error" };

export function useGalleryDetail(rawId: string) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [result, setResult] = useState<Result | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;

    (async () => {
      try {
        const gallery = await getGallery(id);
        if (!cancelled) setResult({ kind: "ready", gallery });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setResult({ kind: "forbidden" });
        } else if (err instanceof ApiError && err.status === 404) {
          setResult({ kind: "notFound" });
        } else {
          setResult({ kind: "error" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, validId, nonce]);

  const reload = useCallback(() => {
    setResult(null);
    setNonce((n) => n + 1);
  }, []);

  /** 상태 전환 성공 응답을 재조회 없이 반영한다. */
  const replace = useCallback((gallery: GalleryResponse) => {
    setResult({ kind: "ready", gallery });
  }, []);

  // 숫자가 아닌 주소는 서버에 물을 것도 없이 없는 갤러리다 — 렌더에서 파생
  return { result: validId ? result : { kind: "notFound" as const }, reload, replace };
}
