/**
 * 작가 스튜디오 정보 로컬 캐시 — 작가 갤러리 화면이 이름을 읽는 임시 저장소
 * 위치: src/lib/studio.ts
 *
 * 스튜디오 홈이 서버 조회(GET /studios/{workspaceId})로 받은 이름·공개 주소를 여기 넣고,
 * 작가 갤러리 화면이 useStudioInfo()로 읽는다. 갤러리 화면이 서버 조회로 넘어가는
 * C2에서 이 파일은 없어진다. 온보딩은 더 이상 여기에 쓰지 않는다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type StudioInfo = {
  name: string;
  url: string;
};

const DEFAULT_STUDIO: StudioInfo = {
  name: "스튜디오",
  url: "",
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

/** 서버 조회 결과를 캐시에 반영 */
export function updateStudioFromServer(name: string, url: string) {
  studioStore.set({ name, url });
}
