"use client";

/**
 * 벨 아래 카드 — 새 알림이 왔을 때 잠깐 떴다 사라진다 (이슈 88, 팀 노션 46번)
 * 위치: src/components/app/NotificationPeek.tsx
 *
 * 알림 목록의 한 줄과 같은 짜임(유형 아이콘 · 제목 · 시간 · 내용)이라 같은 것으로 읽힌다. 5초 뒤 스스로 닫히고,
 * 마우스를 올리고 있거나 안에 초점이 있으면 닫히지 않는다. 카드를 누르면 목록에서 누를 때와 같이 움직이고(onOpen),
 * X는 카드만 닫는다 — 읽음으로 바꾸지 않아 벨의 숫자에 남는다. 여러 개가 한 번에 오면 가장 새 것 하나와
 * "새 알림 n개 더"를 보여 주고, "모두 보기"가 알림 목록을 연다.
 * 자리는 벨 바로 아래(벨을 감싼 relative 기준). 크게 보기(z-40) · 모달(z-50)보다 아래라 그 뒤에 가려진다 —
 * 사진을 크게 보는 동안에는 위에 다른 것을 얹지 않는다.
 */

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { kindStyleOf, relativeTime } from "@/components/app/notificationKinds";
import type { UserNotificationResponse } from "@/lib/api/notifications";

/** 카드가 떠 있는 시간 */
const PEEK_MS = 5_000;

export function NotificationPeek({
  item,
  more,
  now,
  onOpen,
  onShowAll,
  onClose,
}: {
  item: UserNotificationResponse;
  /** 함께 온 나머지 알림 수 */
  more: number;
  /** 시간 표기("방금" · "1시간 전")의 기준 시각 */
  now: number;
  onOpen: () => void;
  onShowAll: () => void;
  /** 카드만 닫는다(X · 시간이 다 됨). 부모가 바뀌지 않는 함수로 줘야 시간이 다시 세어지지 않는다 */
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const style = kindStyleOf(item.type);

  useEffect(() => {
    if (hovered || focused) return;
    const timer = window.setTimeout(onClose, PEEK_MS);
    return () => window.clearTimeout(timer);
  }, [hovered, focused, onClose]);

  return (
    <div
      role="status"
      // 터치는 올려 두는 동작이 없다 — 마우스일 때만 멈춘다
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="notification-peek-enter absolute top-full right-0 z-30 mt-2 w-85 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-(--radius-12) border border-border-default bg-background-default-main shadow-(--shadow-modal)"
    >
      <div className="flex items-start">
        <button
          type="button"
          onClick={onOpen}
          className="grid min-w-0 flex-1 cursor-pointer grid-cols-[auto_1fr] gap-2.5 py-3 pr-1 pl-3.5 text-left transition-colors duration-fast hover:bg-surface-default-lightness"
        >
          <span className={`grid size-8 place-items-center rounded-full ${style.className}`}>{style.icon}</span>
          <span className="min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate type-label-semibold-s text-contents-light-bgd-default">{item.title}</span>
              <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness">
                {relativeTime(item.createdAt, now)}
              </span>
            </span>
            <span className="mt-0.5 block type-content-s text-contents-light-bgd-sub">{item.message}</span>
          </span>
        </button>
        <button
          type="button"
          aria-label="알림 닫기"
          onClick={onClose}
          className="m-2 grid size-6 shrink-0 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-weakness transition-colors duration-fast hover:bg-surface-default-light hover:text-contents-light-bgd-default"
        >
          <CloseIcon size={16} />
        </button>
      </div>
      {more > 0 && (
        <div className="flex items-center justify-between border-t border-divider-default px-3.5 py-2 type-content-xs text-contents-light-bgd-sub">
          <span>새 알림 {more}개 더</span>
          <button
            type="button"
            onClick={onShowAll}
            className="cursor-pointer underline underline-offset-2 transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            모두 보기
          </button>
        </div>
      )}
    </div>
  );
}
