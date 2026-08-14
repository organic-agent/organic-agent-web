/**
 * 작가 스튜디오 정보 저장소 (localStorage 목업)
 * 위치: src/lib/studio.ts
 *
 * 화면은 useStudioInfo()로 읽고 saveStudioInfo()로 저장한다.
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
