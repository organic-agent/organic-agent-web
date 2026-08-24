/**
 * 부부 — 선택 앨범(셀렉) 훅
 * 위치: src/app/(couple)/gallery/_lib/usePhotoSelection.ts
 *
 * 서버가 진실이다. 담기/빼기는 낙관적으로 먼저 칠하고, 담기 성공 응답
 * (앨범 전체)으로 상태를 맞추며, 거절되면 **통째로** 되돌린다(서버가
 * 부분 반영을 하지 않으므로 화면도 그렇게).
 * - 409(이미 담긴 사진 겹침): 신랑·신부가 동시에 고르다 생긴 일 —
 *   토스트 없이 조용히 재조회해 화면을 최신으로 맞춘다.
 * - 400(계약 장수 초과 등): 롤백 + 계약 장수 문구(시안 v3 확정).
 * - SUBMITTED: 서버가 잠그므로 토글 시도 시 이유 토스트만.
 */

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  type PhotoSelectionResponse,
  deselectPhoto,
  getPhotoSelection,
  selectPhotos,
} from "@/lib/api/selection";

export type SelectionState = {
  status: "SELECTING" | "SUBMITTED";
  selectedIds: number[];
  selectedCount: number;
  max: number | null;
  remaining: number | null;
  submittedAt: string | null;
};

export type SelectionResult =
  | { kind: "ready"; sel: SelectionState }
  | { kind: "error" };

function toState(res: PhotoSelectionResponse): SelectionState {
  return {
    status: res.status,
    selectedIds: res.photos.map((p) => p.photo.photoId),
    selectedCount: res.selectedCount,
    max: res.maxSelectablePhotoCount,
    remaining: res.remainingCount,
    submittedAt: res.submittedAt,
  };
}

export function usePhotoSelection(
  rawId: string,
  onNotice?: (message: string) => void,
) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [result, setResult] = useState<SelectionResult | null>(null);
  const [nonce, setNonce] = useState(0);
  // 왕복 중 재클릭 무시 — 낙관 상태가 꼬이지 않게 한 번에 하나씩
  const busyRef = useRef(false);
  const onNoticeRef = useRef(onNotice);

  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getPhotoSelection(id);
        if (!cancelled) setResult({ kind: "ready", sel: toState(res) });
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, validId, nonce]);

  /** 셀 클릭 = 담기/빼기 토글 */
  async function toggle(photoId: number) {
    if (!validId || busyRef.current || result?.kind !== "ready") return;
    const sel = result.sel;
    if (sel.status === "SUBMITTED") {
      onNoticeRef.current?.(
        "이미 작가에게 전달했어요 — 변경이 필요하면 작가에게 요청해 주세요",
      );
      return;
    }
    const has = sel.selectedIds.includes(photoId);
    // 낙관적 반영 — 실패하면 통째로 되돌린다
    setResult({
      kind: "ready",
      sel: {
        ...sel,
        selectedIds: has
          ? sel.selectedIds.filter((v) => v !== photoId)
          : [...sel.selectedIds, photoId],
        selectedCount: sel.selectedCount + (has ? -1 : 1),
        remaining:
          sel.remaining === null ? null : sel.remaining + (has ? 1 : -1),
      },
    });
    busyRef.current = true;
    try {
      if (has) {
        await deselectPhoto(id, photoId);
      } else {
        const res = await selectPhotos(id, [photoId]);
        setResult({ kind: "ready", sel: toState(res) });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // 겹침 — 다른 한 명이 방금 담은 것. 조용히 최신으로
        setNonce((n) => n + 1);
      } else if (has && err instanceof ApiError && err.status === 404) {
        // 이미 빠져 있음 — 화면만 낡았던 것
        setNonce((n) => n + 1);
      } else {
        setResult({ kind: "ready", sel }); // 통째 롤백
        if (!has && err instanceof ApiError && err.status === 400) {
          onNoticeRef.current?.(
            sel.max !== null
              ? `계약 장수(${sel.max}장)를 모두 채웠어요 — 다른 사진을 빼면 담을 수 있어요`
              : err.message,
          );
        } else {
          onNoticeRef.current?.(
            err instanceof ApiError
              ? err.message
              : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
          );
        }
      }
    } finally {
      busyRef.current = false;
    }
  }

  /** 앨범 전체를 새 응답으로 교체 — 제출/철회 응답 반영용 */
  function replace(res: PhotoSelectionResponse) {
    setResult({ kind: "ready", sel: toState(res) });
  }

  /** 조용한 재조회 */
  function refresh() {
    setNonce((n) => n + 1);
  }

  return { result: validId ? result : null, toggle, replace, refresh };
}
