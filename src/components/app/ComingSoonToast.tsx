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
import { Snackbar } from "@/components/app/Snackbar";

export function useComingSoonToast() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number>(0);

  const showComingSoon = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = window.setTimeout(() => setVisible(false), 1800);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const comingSoonToast = visible ? (
    <Snackbar kind="info" className="fixed bottom-8 left-1/2 z-200 -translate-x-1/2">
      아직 준비 중이에요
    </Snackbar>
  ) : null;

  return { showComingSoon, comingSoonToast };
}
