"use client";

/**
 * 알림 벨 + 팝오버 — 탑바 공용 (작가 홈·작가 워크스페이스·부부 워크스페이스)
 * 위치: src/components/app/NotificationBell.tsx
 *
 * 알림 백엔드 연동 전까지는 빈 상태("새 알림이 없어요")만 보여준다.
 * 연동 시 이 컴포넌트 안에서 목록 렌더링만 추가하면 된다.
 */

import { useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기 (케밥·필터 팝업과 같은 패턴)
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    // flex: inline-flex인 IconButton이 라인박스를 만들어 위로 밀리는 것 방지
    <div ref={ref} className="relative flex">
      <IconButton
        icon={<BellIcon size={20} />}
        selected={open}
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
      />
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col rounded-(--radius-12) border border-border-default bg-background-default-main p-3 shadow-(--shadow-modal)">
          <span className="type-label-semibold-xs text-contents-light-bgd-default">알림</span>
          <div className="mt-3 h-px w-full bg-divider-default" />
          <p className="py-8 text-center type-content-xs text-contents-light-bgd-sub">
            새 알림이 없어요
          </p>
        </div>
      )}
    </div>
  );
}
