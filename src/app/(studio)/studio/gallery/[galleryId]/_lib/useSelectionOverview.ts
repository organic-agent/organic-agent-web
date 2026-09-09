/**
 * 작가 — 부부 선택 현황 훅 (읽기 + 다시 열기, WES-263)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_lib/useSelectionOverview.ts
 *
 * 작가에게 선택 앨범은 관찰 대상이다 — 담기/빼기는 부부만 하므로 여기는
 * 조회가 전부고, 유일한 쓰기는 제출 되돌리기(withdraw) 응답을 replace로
 * 반영하는 것이다. 조회 실패는 "아직 아무것도 안 고름"과 구분해 error로 둔다.
 */

import { useEffect, useState } from "react";
import {
  type PhotoSelectionResponse,
  getPhotoSelection,
} from "@/lib/api/selection";

export type SelectionOverview = {
  status: "SELECTING" | "SUBMITTED";
  selectedIds: number[];
  selectedCount: number;
  max: number | null;
  submittedAt: string | null;
};

export type SelectionOverviewResult =
  | { kind: "ready"; sel: SelectionOverview }
  | { kind: "error" };

function toOverview(res: PhotoSelectionResponse): SelectionOverview {
  return {
    status: res.status,
    selectedIds: res.photos.map((p) => p.photo.photoId),
    selectedCount: res.selectedCount,
    max: res.maxSelectablePhotoCount,
    submittedAt: res.submittedAt,
  };
}

export function useSelectionOverview(rawId: string) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [result, setResult] = useState<SelectionOverviewResult | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getPhotoSelection(id);
        if (!cancelled) setResult({ kind: "ready", sel: toOverview(res) });
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, validId, nonce]);

  /** 되돌리기(withdraw) 응답 반영 */
  function replace(res: PhotoSelectionResponse) {
    setResult({ kind: "ready", sel: toOverview(res) });
  }

  function refresh() {
    setNonce((n) => n + 1);
  }

  return { result: validId ? result : null, replace, refresh };
}
