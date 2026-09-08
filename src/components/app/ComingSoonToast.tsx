"use client";

/**
 * "아직 준비 중이에요" 토스트 — 기획은 있으나 미구현인 컨트롤 공용
 * 위치: src/components/app/ComingSoonToast.tsx
 *
 * 미구현 기능을 숨기는 대신 눌렀을 때 준비 중임을 알린다 (사용자 결정).
 * 사용: const { showComingSoon, comingSoonToast } = useComingSoonToast();
 *       onClick={showComingSoon} + JSX 어딘가에 {comingSoonToast} 렌더.
 * 해당 기능이 구현되면 호출부에서 이 훅 연결만 제거하면 된다.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useComingSoonToast() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number>(0);

  const showComingSoon = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = window.setTimeout(() => setVisible(false), 1800);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // 스타일은 GalleryCreatedToast와 동일한 문법 (하단 중앙 검정 pill)
  const comingSoonToast = visible ? (
    <div
      role="status"
      className="fixed bottom-8 left-1/2 z-200 -translate-x-1/2 rounded-(--pill) border border-surface-inverse-medium bg-background-inverse-main px-5 py-3 type-label-medium-m text-contents-dark-bgd-default shadow-(--shadow-hover)"
    >
      아직 준비 중이에요
    </div>
  ) : null;

  return { showComingSoon, comingSoonToast };
}
