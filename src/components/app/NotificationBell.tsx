"use client";

/**
 * 알림 벨 + 드롭다운 — 탑바 공용 (작가 홈·작가 워크스페이스·클라이언트 워크스페이스)
 * 위치: src/components/app/NotificationBell.tsx
 * 시안: 와이어프레임 11 알림 드롭다운 + 보드 A3 (유형 아이콘 · 전체/안 읽음 탭 · 오늘/이번 주/이전 묶음)
 *
 * 열기 전에도 목록을 한 번 받아 안 읽은 알림이 있으면 벨에 점을 찍는다. 열 때 다시 받는다.
 * 행을 누르면 읽음 처리(PATCH)하고 범위에 맞는 화면으로 간다 — 갤러리 알림의 주소는 보는 사람의
 * 역할에 따라 다르므로 hrefFor로 바꿔 끼운다(기본은 작가 주소).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  BellOffIcon,
  BrushIcon,
  CheckCircleIcon,
  GroupIcon,
  PhotoIcon,
  ScheduleIcon,
  SparkleIcon,
} from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";
import {
  listNotifications,
  markNotificationsRead,
  type NotificationType,
  type UserNotificationResponse,
} from "@/lib/api/notifications";

type Kind = "selection" | "retouch" | "member" | "deadline" | "ai" | "gallery";

const KIND_OF: Record<NotificationType, Kind> = {
  SELECTION_SUBMITTED: "selection",
  SELECTION_REOPENED: "selection",
  SELECTION_INCREASE_REQUESTED: "selection",
  SELECTION_INCREASE_APPROVED: "selection",
  RETOUCH_REQUESTED: "retouch",
  RETOUCH_COMPLETED: "retouch",
  RETOUCH_CONFIRMED: "retouch",
  INVITE_ACCEPTED: "member",
  WORKSPACE_MEMBER_LEFT: "member",
  GALLERY_MEMBER_LEFT: "member",
  MEMBERSHIP_REMOVED: "member",
  WORKSPACE_DELETED: "member",
  DEADLINE_REMINDER: "deadline",
  PLAN_EXPIRY_REMINDER: "deadline",
  PLAN_EXPIRED: "deadline",
  ANALYSIS_COMPLETED: "ai",
  GALLERY_OPENED: "gallery",
  GALLERY_REOPENED: "gallery",
};

const KIND_STYLE: Record<Kind, { icon: ReactNode; className: string }> = {
  selection: {
    icon: <CheckCircleIcon size={18} />,
    className: "bg-brand-secondary-background text-brand-secondary-dark",
  },
  retouch: {
    icon: <BrushIcon size={18} />,
    className: "bg-function-info-background text-function-info-default",
  },
  member: {
    icon: <GroupIcon size={18} />,
    className: "bg-function-success-background text-function-success-default",
  },
  deadline: {
    icon: <ScheduleIcon size={18} />,
    className: "bg-function-warning-background text-function-warning-default",
  },
  ai: {
    icon: <SparkleIcon size={18} />,
    className: "bg-surface-default-light text-contents-light-bgd-default",
  },
  gallery: {
    icon: <PhotoIcon size={18} />,
    className: "bg-surface-default-light text-contents-light-bgd-sub",
  },
};

type Group = "오늘" | "이번 주" | "이전";
const GROUPS: Group[] = ["오늘", "이번 주", "이전"];

/** 작가 기본 주소 — 갤러리 알림은 작가 갤러리로, 스튜디오 알림은 스튜디오 홈으로 */
function studioHref(n: UserNotificationResponse): string | null {
  if (n.scopeId === null) return null;
  if (n.scope === "GALLERY") return `/studio/gallery/${n.scopeId}`;
  if (n.scope === "STUDIO") return `/studio/${n.scopeId}`;
  return null;
}

function relativeTime(iso: string | null, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const minutes = Math.floor((now - t) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  const d = new Date(t);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

function groupOf(iso: string | null, now: number): Group {
  if (!iso) return "이전";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "이전";
  const today = new Date(now);
  const sameDay =
    t.getFullYear() === today.getFullYear() &&
    t.getMonth() === today.getMonth() &&
    t.getDate() === today.getDate();
  if (sameDay) return "오늘";
  if (now - t.getTime() < 7 * 86_400_000) return "이번 주";
  return "이전";
}

type Loaded = { list: UserNotificationResponse[]; at: number };

export function NotificationBell({
  hrefFor = studioHref,
}: {
  /** 알림을 눌렀을 때 갈 주소. null이면 읽음 처리만 한다 */
  hrefFor?: (n: UserNotificationResponse) => string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loadedOnce = useRef(false);

  // 처음 한 번(배지용), 그리고 열 때마다 새로 받는다. 닫을 때는 다시 받지 않는다.
  useEffect(() => {
    if (!open && loadedOnce.current) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listNotifications();
        if (cancelled) return;
        loadedOnce.current = true;
        setData({ list, at: Date.now() });
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // 바깥 클릭·ESC로 닫기
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const list = data?.list ?? [];
  const unread = list.filter((n) => n.readAt === null).length;
  const shown = tab === "unread" ? list.filter((n) => n.readAt === null) : list;
  const at = data?.at ?? 0;

  function markLocally(ids: number[] | "all") {
    const stamp = new Date().toISOString();
    setData((prev) =>
      prev
        ? {
            ...prev,
            list: prev.list.map((n) =>
              n.readAt === null && (ids === "all" || ids.includes(n.id))
                ? { ...n, readAt: stamp }
                : n,
            ),
          }
        : prev,
    );
  }

  async function readAll() {
    if (unread === 0) return;
    markLocally("all");
    try {
      await markNotificationsRead({ all: true });
    } catch {
      // 다음 조회 때 서버 값으로 돌아온다
    }
  }

  async function openItem(n: UserNotificationResponse) {
    const href = hrefFor(n);
    if (n.readAt === null) {
      markLocally([n.id]);
      try {
        await markNotificationsRead({ notificationIds: [n.id] });
      } catch {
        // 읽음 실패는 조용히 — 이동이 더 중요하다
      }
    }
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  return (
    // flex: inline-flex인 IconButton이 라인박스를 만들어 위로 밀리는 것 방지
    <div ref={ref} className="relative flex">
      <IconButton
        icon={<BellIcon size={20} />}
        selected={open}
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `알림 ${unread}개 안 읽음` : "알림"}
      />
      {unread > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0.5 right-0.5 size-2 rounded-full border border-background-default-main bg-function-error-default"
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="알림"
          className="absolute top-full right-0 z-50 mt-2 flex w-95 flex-col overflow-hidden rounded-(--radius-12) border border-border-default bg-background-default-main shadow-(--shadow-modal)"
        >
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <span className="type-label-semibold-m text-contents-light-bgd-default">
              알림
              {unread > 0 && (
                <span className="ml-1.5 type-label-semibold-xs text-function-error-default">
                  {unread}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={readAll}
              disabled={unread === 0}
              className="cursor-pointer type-content-xs text-contents-light-bgd-sub underline underline-offset-2 transition-colors duration-fast hover:text-contents-light-bgd-default disabled:cursor-default disabled:no-underline disabled:text-contents-light-bgd-disabled"
            >
              모두 읽음
            </button>
          </div>
          <div className="flex gap-1 px-3 pb-2">
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
                className="cursor-pointer rounded-(--pill) px-2.5 py-1 type-content-xs text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness aria-pressed:bg-surface-default-light aria-pressed:font-semibold aria-pressed:text-contents-light-bgd-default"
              >
                {key === "all" ? "전체" : `안 읽음 ${unread}`}
              </button>
            ))}
          </div>

          <div className="max-h-105 overflow-y-auto border-t border-divider-default">
            {failed && data === null ? (
              <p className="py-8 text-center type-content-xs text-contents-light-bgd-sub">
                알림을 불러오지 못했어요
              </p>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-9 text-contents-light-bgd-sub">
                <span className="text-border-default">
                  <BellOffIcon size={28} />
                </span>
                <p className="type-content-xs">
                  {tab === "unread" && list.length > 0 ? "안 읽은 알림이 없어요" : "새 알림이 없어요"}
                </p>
              </div>
            ) : (
              GROUPS.map((group) => {
                const items = shown.filter((n) => groupOf(n.createdAt, at) === group);
                if (items.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="px-4 pt-2.5 pb-0.5 type-label-semibold-xs text-contents-light-bgd-weakness">
                      {group}
                    </p>
                    {items.map((n) => {
                      const style = KIND_STYLE[KIND_OF[n.type] ?? "gallery"];
                      const read = n.readAt !== null;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => void openItem(n)}
                          className="relative grid w-full cursor-pointer grid-cols-[auto_1fr] gap-2.5 px-4 py-3 text-left transition-colors duration-fast hover:bg-surface-default-lightness"
                        >
                          {!read && (
                            <span
                              aria-hidden
                              className="absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-function-error-default"
                            />
                          )}
                          <span
                            className={`grid size-8 place-items-center rounded-full ${style.className}`}
                          >
                            {style.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-baseline justify-between gap-2">
                              <span
                                className={`truncate type-label-semibold-s ${
                                  read ? "font-medium text-contents-light-bgd-sub" : "text-contents-light-bgd-default"
                                }`}
                              >
                                {n.title}
                              </span>
                              <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness">
                                {relativeTime(n.createdAt, at)}
                              </span>
                            </span>
                            <span
                              className={`mt-0.5 block type-content-s ${
                                read ? "text-contents-light-bgd-weakness" : "text-contents-light-bgd-sub"
                              }`}
                            >
                              {n.message}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
          <p className="border-t border-divider-default px-4 py-2.5 text-center type-content-xs text-contents-light-bgd-weakness">
            최근 30일의 알림을 보여줘요
          </p>
        </div>
      )}
    </div>
  );
}
