/**
 * 자동 분류(클러스터) 미리보기 훅
 * 위치: src/app/(photographer)/galleries/[galleryId]/_lib/useClusterPreview.ts
 *
 * 켜짐/레벨은 이 훅이 소유한다. 레벨을 바꾸면 짧은 디바운스 뒤 재조회하고,
 * 그동안 result는 null(조회 중)이다. refresh()는 임베딩 진행처럼 화면을
 * 로딩으로 바꾸지 않아야 할 때 쓰는 조용한 재조회다.
 *
 * 서버가 주는 크기 1짜리 묶음은 "나머지 사진"으로 분리해 돌려준다 —
 * 화면(낱장 셀)과 저장(나머지 사진 폴더)이 같은 구분을 쓴다.
 */

import { useEffect, useState } from "react";
import { getPhotoClusters } from "@/lib/api/folders";
import { type GalleryPhoto, toGalleryPhoto } from "./useGalleryPhotos";

export type ClusterPreviewResult =
  | {
      kind: "ready";
      /** 실제 적용된 레벨(1~5) */
      level: number;
      /** 2장 이상 묶음 — 큰 것부터, 각 묶음 첫 장이 대표 */
      groups: GalleryPhoto[][];
      /** 어느 묶음에도 안 묶인 낱장들 */
      singles: GalleryPhoto[];
      /** 임베딩이 안 끝나 분류에서 빠진 사진 수 */
      unclassified: number;
    }
  | { kind: "error" };

const DEBOUNCE_MS = 350;
const INVALID_RESULT: ClusterPreviewResult = { kind: "error" };

export function useClusterPreview(rawId: string) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [enabled, setEnabledState] = useState(true);
  /** 단계 인덱스(0~4) — 서버 레벨은 +1 */
  const [levelIndex, setLevelIndexState] = useState(2);
  const [result, setResult] = useState<ClusterPreviewResult | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!validId || !enabled) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await getPhotoClusters(id, levelIndex + 1);
        if (cancelled) return;
        const groups: GalleryPhoto[][] = [];
        const singles: GalleryPhoto[] = [];
        for (const cluster of res.clusters) {
          // PENDING 등 viewUrl 없는 사진은 화면 대상이 아니다
          const photos = cluster.photos
            .filter((p) => p.viewUrl !== null)
            .map(toGalleryPhoto);
          if (photos.length === 0) continue;
          if (photos.length === 1) singles.push(photos[0]);
          else groups.push(photos);
        }
        setResult({
          kind: "ready",
          level: res.level,
          groups,
          singles,
          unclassified: res.unclassified,
        });
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, validId, enabled, levelIndex, nonce]);

  /** 미리보기 켜기/끄기 — 켤 때는 조회 중 상태부터 */
  function setEnabled(next: boolean) {
    setEnabledState(next);
    if (next) setResult(null);
  }

  /** 레벨 변경 — 조회 중 표시로 바꾸고 디바운스 뒤 재조회 */
  function setLevelIndex(index: number) {
    setLevelIndexState(index);
    setResult(null);
  }

  /** 조용한 재조회 — 기존 결과를 유지한 채 갱신 (임베딩 진행분 합류용) */
  function refresh() {
    setNonce((n) => n + 1);
  }

  /** 실패 후 재시도 — 조회 중 표시로 바꾸고 다시 조회 */
  function retry() {
    setResult(null);
    setNonce((n) => n + 1);
  }

  return {
    enabled,
    setEnabled,
    levelIndex,
    setLevelIndex,
    result: validId ? result : INVALID_RESULT,
    refresh,
    retry,
  };
}
