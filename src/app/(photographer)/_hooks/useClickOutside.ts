"use client";

/**
 * 작가 — 바깥 클릭 감지 훅
 * 위치: src/app/(photographer)/_hooks/useClickOutside.ts
 *
 * 드롭다운/메뉴가 열려 있을 때 대상 영역 바깥 클릭을 감지한다.
 * 여러 컴포넌트에서 반복되던 mousedown 이벤트 등록 로직을 한곳으로 모은다.
 *
 * 주요 책임:
 * - 활성 상태일 때만 document 이벤트 구독
 * - ref 영역 바깥 클릭 시 콜백 실행
 */

import { useEffect, type RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  onOutsideClick: () => void,
) {
  useEffect(() => {
    if (!active) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideClick();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [active, onOutsideClick, ref]);
}
