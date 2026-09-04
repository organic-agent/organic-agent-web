/**
 * 작가 스튜디오 정보 조회 훅
 * 위치: src/lib/studio.ts
 *
 * GET /api/v1/studios/me 응답을 화면에서 공유하는 가벼운 서버 조회 훅이다.
 */

import { useEffect, useState } from "react";
import { fetchMyStudio } from "@/lib/api/studios";

export type StudioInfo = {
  name: string;
  url: string;
  workspaceId: number | null;
};

const DEFAULT_STUDIO: StudioInfo = {
  name: "스튜디오",
  url: "",
  workspaceId: null,
};

export function useStudioInfo(): StudioInfo {
  const [studio, setStudio] = useState<StudioInfo>(DEFAULT_STUDIO);
  useEffect(() => {
    let cancelled = false;
    void fetchMyStudio()
      .then((result) => {
        if (!cancelled) {
          setStudio({
            name: result.name,
            url: result.galleryUrl,
            workspaceId: result.workspaceId,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return studio;
}
