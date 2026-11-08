/**
 * 셀렉 휴지통 목록(이슈 160) — 제외된 사진 전부와 장수
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useExcludedPhotos.ts
 *
 * 사이드바 휴지통 행의 장수와 휴지통 화면의 타일이 같은 목록을 쓴다. 처음 한 번 읽고, version이 오르면 다시 읽는다 —
 * version은 셀렉 화면이 올린다(내가 옮기거나 복원한 뒤, 상대 기기의 변경 번호(exclusionRevision)가 바뀌었을 때).
 * 다시 읽는 동안은 이전 목록을 그대로 두어 깜빡이지 않고(loading만 켜진다), 갤러리를 떠난 뒤 온 늦은 응답은 버린다.
 * 실패하면 failed만 켜고 이전 목록은 남긴다(처음부터 실패면 photos null) — 화면이 "다시 시도"를 보여 준다.
 */

import { useCallback, useEffect, useState } from "react";
import { listAllExcludedPhotos } from "@/lib/api/exclusions";
import type { PhotoResponse } from "@/lib/api/photos";

export type ExcludedPhotosState = {
  /** null이면 아직 못 읽었다 */
  photos: PhotoResponse[] | null;
  /** 서버가 센 장수(목록과 같다) — 행에 보일 수 */
  total: number | null;
  loading: boolean;
  failed: boolean;
  /** 다시 읽기(실패 뒤 "다시 시도") */
  reload: () => void;
};

type Loaded = { galleryId: number; key: string; photos: PhotoResponse[] | null; total: number | null; failed: boolean };

export function useExcludedPhotos(galleryId: number, enabled: boolean, version: number): ExcludedPhotosState {
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry((n) => n + 1), []);
  /** 지금 읽어야 할 요청의 이름표 — 마지막으로 끝난 요청(state.key)과 다르면 읽는 중 */
  const key = `${galleryId}:${version}:${retry}`;
  const [state, setState] = useState<Loaded>({ galleryId, key: "", photos: null, total: null, failed: false });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listAllExcludedPhotos(galleryId);
        if (!cancelled) setState({ galleryId, key, photos: res.photos, total: res.totalCount, failed: false });
      } catch {
        if (!cancelled) setState((prev) => (prev.galleryId === galleryId ? { ...prev, key, failed: true } : { galleryId, key, photos: null, total: null, failed: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, enabled, key]);

  if (!enabled || state.galleryId !== galleryId) return { photos: null, total: null, loading: enabled, failed: false, reload };
  return { photos: state.photos, total: state.total, loading: state.key !== key, failed: state.failed, reload };
}
