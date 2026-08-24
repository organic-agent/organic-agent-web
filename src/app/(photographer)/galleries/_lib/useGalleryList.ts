/**
 * 작가 — 갤러리 목록 조회 훅
 * 위치: src/app/(photographer)/galleries/_lib/useGalleryList.ts
 *
 * 목록 조회(GET /galleries)에 카드별 선택 앨범 집계를 병행해 셀렉 현황을
 * 채운다. 이 집계는 임시다 — 목록 통계 API(WES-215)가 배포되면 카드별
 * 조회를 통계 한 번으로 교체한다. 집계에 실패한 갤러리는 0으로 둔다
 * (DRAFT처럼 아직 선택이 시작되지 않은 경우가 대부분이라서).
 *
 * result가 null인 동안이 로딩이다. 상태 저장은 비동기 결과에만 쓰고
 * 동기 파생은 렌더에서 처리한다(react-hooks/set-state-in-effect 회피).
 */

import { useCallback, useEffect, useState } from "react";
import { type GalleryResponse, listGalleries } from "@/lib/api/galleries";
import { getPhotoSelection } from "@/lib/api/selection";
import { syncGalleriesCache } from "@/lib/galleries";

export type GalleryListItem = GalleryResponse & {
  /** 부부가 지금까지 고른 장수 — 선택 앨범 임시 집계값. */
  selectedCount: number;
};

type Result =
  | { kind: "ready"; items: GalleryListItem[] }
  | { kind: "error" };

export function useGalleryList() {
  const [result, setResult] = useState<Result | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await listGalleries();
        const counts = await Promise.all(
          list.map(async (gallery) => {
            try {
              return (await getPhotoSelection(gallery.id)).selectedCount;
            } catch {
              return 0;
            }
          }),
        );
        const items = list
          .map((gallery, i) => ({ ...gallery, selectedCount: counts[i] }))
          .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        if (cancelled) return;
        syncGalleriesCache(items); // 상세·부부 화면용 레거시 스토어 브리지
        setResult({ kind: "ready", items });
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = useCallback(() => {
    setResult(null);
    setNonce((n) => n + 1);
  }, []);

  /** 생성 직후 목록 맨 앞에 반영 — 재조회 없이 즉시 보여준다. */
  const addItem = useCallback((item: GalleryListItem) => {
    setResult((prev) =>
      prev?.kind === "ready"
        ? { kind: "ready", items: [item, ...prev.items] }
        : prev,
    );
  }, []);

  const replaceItem = useCallback((item: GalleryListItem) => {
    setResult((prev) =>
      prev?.kind === "ready"
        ? {
            kind: "ready",
            items: prev.items.map((g) => (g.id === item.id ? item : g)),
          }
        : prev,
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    setResult((prev) =>
      prev?.kind === "ready"
        ? { kind: "ready", items: prev.items.filter((g) => g.id !== id) }
        : prev,
    );
  }, []);

  return { result, reload, addItem, replaceItem, removeItem };
}
