/**
 * 부부 — 공유 앨범 디자인 설정 (제목·작성자 표시 여부와 문구)
 * 위치: src/lib/couple/shareDesign.ts
 *
 * ShareModal 디자인 탭에서 편집·저장하고(완료 버튼), 게스트 공유 페이지
 * (/guest/[token])의 앨범 표지 헤더가 읽는다. 백엔드 연동 전 localStorage 목업.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type ShareDesign = {
  showTitle: boolean;
  title: string;
  showAuthor: boolean;
  author: string;
};

const DEFAULT_SHARE_DESIGN: ShareDesign = {
  showTitle: true,
  title: "우리의 본식 촬영",
  showAuthor: true,
  author: "영식 · 영자",
};

const shareDesignStore = createLocalStore<ShareDesign>(
  "wes.shareDesign",
  DEFAULT_SHARE_DESIGN,
);

export function useShareDesign(): ShareDesign {
  return useSyncExternalStore(
    shareDesignStore.subscribe,
    shareDesignStore.get,
    shareDesignStore.getServerSnapshot,
  );
}

export function saveShareDesign(design: ShareDesign) {
  shareDesignStore.set(design);
}
