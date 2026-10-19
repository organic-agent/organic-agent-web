"use client";

/**
 * 갤러리 화면이 미리보기 접근 쿠키를 받고 늘리는 훅
 * 위치: src/lib/usePreviewAccess.ts
 *
 * 열 때 한 번 받고, 탭이 보이는 동안 1분마다 · 탭이 다시 보일 때 늘릴 때가 됐는지 본다(서버가 준 refreshAfterSeconds, 기본 10분).
 * 목록은 다시 읽지 않는다 — 고정 주소는 만료가 없고, 쿠키만 늘리면 된다. 첫 목록을 읽기 전에는 issuePreviewAccess를 기다린다.
 * 서명 URL로 물러나면 onFallback을 부른다 — 화면은 거기서 목록을 다시 읽어 서명 URL로 바꾼다.
 * 연 갤러리를 등록해 두어, 사진이 깨지면(쿠키 만료) 그 갤러리의 쿠키를 다시 받고 사진을 다시 부르게 한다.
 */

import { useEffect } from "react";
import { issuePreviewAccess, onPreviewFallback, previewAccessDue, registerOpenGallery } from "@/lib/api/previewAccess";

const CHECK_EVERY_MS = 60_000;

export function usePreviewAccess(galleryId: number, enabled: boolean, onFallback: () => void): void {
  useEffect(() => {
    if (!enabled || !Number.isFinite(galleryId)) return;
    void issuePreviewAccess(galleryId);
    function check() {
      if (document.visibilityState === "visible" && previewAccessDue(galleryId)) void issuePreviewAccess(galleryId);
    }
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    const unsubscribe = onPreviewFallback(onFallback);
    const close = registerOpenGallery(galleryId);
    return () => {
      close();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      unsubscribe();
    };
  }, [galleryId, enabled, onFallback]);
}
