"use client";

/**
 * 화면 이탈 막기 — 업로드처럼 끊기면 안 되는 일이 도는 동안 다른 화면으로 이동하지 않는다 (2차 QA · 이슈 87)
 * 위치: src/components/app/LeaveGuard.tsx
 *
 * 그 화면이 useLeaveGuard(도는 중, 문구)를 켜 두면 세 갈래를 막는다.
 * ① 앱 안 이동 — 이동하려는 쪽(상단 바 링크 · 프로필 메뉴 · 알림)이 blockLeave()를 먼저 불러 true면 가지 않는다.
 * ② 브라우저 뒤로 가기 — 같은 주소를 방문 기록에 한 칸 더 쌓아 두고, 뒤로 가기가 오면 그 칸으로 되돌린다(화면은 그대로).
 * ③ 새로고침 · 탭 닫기 — beforeunload. 브라우저가 띄우는 확인 창까지만 된다(문구 · 모양은 바꿀 수 없다).
 * ① · ②는 토스트로 알린다. 나가려면 그 화면에서 하던 일을 먼저 멈춘다(업로드는 하단의 취소).
 * 사용: const { leaveToast } = useLeaveGuard(uploading, "…"); + JSX 어딘가에 {leaveToast} 렌더.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** 방문 기록에 쌓아 둔 칸의 표식 — 치울 때 그 칸에 있는지 확인한다 */
const HISTORY_MARK = "selLeaveGuard";

/** 지금 이동을 막고 있는 화면의 알림 함수. 없으면 아무것도 막지 않는다 */
let notifyBlocked: (() => void) | null = null;

/** 이동하려는 코드가 먼저 부른다 — 막는 중이면 안내를 띄우고 true(가지 않는다) */
export function blockLeave(): boolean {
  if (!notifyBlocked) return false;
  notifyBlocked();
  return true;
}

/** <Link onNavigate={guardNavigate}> — 막는 중이면 앱 안 이동을 멈춘다 */
export function guardNavigate(event: { preventDefault: () => void }) {
  if (blockLeave()) event.preventDefault();
}

export function useLeaveGuard(active: boolean, message: string) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number>(0);

  const show = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = window.setTimeout(() => setVisible(false), 1800);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!active) return;
    notifyBlocked = show;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = ""; // preventDefault만으로는 확인 창을 띄우지 않는 브라우저용
    }

    // Next가 pushState를 감싸 자기 상태를 새 칸에 복사하므로, 같은 주소를 쌓아도 화면은 다시 그려지지 않는다
    window.history.pushState({ [HISTORY_MARK]: true }, "", window.location.href);
    let returning = false;
    function onPopState() {
      // 되돌아오는 이동이 만든 popstate
      if (returning) {
        returning = false;
        return;
      }
      returning = true;
      window.history.forward();
      show();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      notifyBlocked = null;
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      // 쌓아 둔 칸을 치운다 — 그 칸에 있을 때만(이미 다른 주소로 바뀌었으면 건드리지 않는다)
      if ((window.history.state as Record<string, unknown> | null)?.[HISTORY_MARK]) window.history.back();
    };
  }, [active, show]);

  // 스타일은 ComingSoonToast와 동일한 문법 (하단 중앙 검정 pill)
  const leaveToast = visible ? (
    <div
      role="status"
      className="fixed bottom-8 left-1/2 z-200 -translate-x-1/2 rounded-(--pill) border border-surface-inverse-medium bg-background-inverse-main px-5 py-3 type-label-medium-m text-contents-dark-bgd-default shadow-(--shadow-hover)"
    >
      {message}
    </div>
  ) : null;

  return { leaveToast };
}
