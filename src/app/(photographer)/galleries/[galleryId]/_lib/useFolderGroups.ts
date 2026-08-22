/**
 * 앨범(폴더) 목록 훅 — 사이드바 앨범 트리의 데이터 원천
 * 위치: src/app/(photographer)/galleries/[galleryId]/_lib/useFolderGroups.ts
 *
 * GET folder-groups 응답 하나로 좌측 앨범 메뉴 전체가 그려진다
 * (앨범마다 폴더 요약: 대표 사진·개수). 앨범 저장 성공 시 reload()로 갱신.
 */

import { useEffect, useState } from "react";
import {
  type PhotoFolderGroupResponse,
  listFolderGroups,
} from "@/lib/api/folders";

export type FolderGroupsResult =
  | { kind: "ready"; groups: PhotoFolderGroupResponse[] }
  | { kind: "error" };

const INVALID_RESULT: FolderGroupsResult = { kind: "error" };

export function useFolderGroups(rawId: string) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [result, setResult] = useState<FolderGroupsResult | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      try {
        const groups = await listFolderGroups(id);
        if (!cancelled) setResult({ kind: "ready", groups });
      } catch {
        if (!cancelled) setResult({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, validId, nonce]);

  /** 저장·변경 후 다시 조회 */
  function reload() {
    setNonce((n) => n + 1);
  }

  return { result: validId ? result : INVALID_RESULT, reload };
}
