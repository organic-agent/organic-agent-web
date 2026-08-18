/**
 * 작가 스튜디오 정보 로컬 캐시
 * 위치: src/lib/studio.ts
 *
 * 스튜디오 생성(POST /api/v1/studios) 성공 응답의 canonical 값을 저장하고,
 * 갤러리 목록·온보딩 화면이 useStudioInfo()로 읽는다. 그 화면들이 서버
 * 조회(GET /api/v1/studios/me)로 넘어가면 이 캐시는 없어질 예정이다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type StudioInfo = {
  name: string;
  url: string;
  source: string | null;
};

const DEFAULT_STUDIO: StudioInfo = {
  name: "스튜디오",
  url: "",
  source: null,
};

const studioStore = createLocalStore<StudioInfo>(
  "wes.photographerStudio",
  DEFAULT_STUDIO,
);

export function useStudioInfo(): StudioInfo {
  return useSyncExternalStore(
    studioStore.subscribe,
    studioStore.get,
    studioStore.getServerSnapshot,
  );
}

export function saveStudioInfo(studio: StudioInfo) {
  studioStore.set(studio);
}
