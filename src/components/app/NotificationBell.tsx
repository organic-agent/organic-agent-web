"use client";

/**
 * 알림 벨 + 드롭다운 — 탑바 공용 (작가 홈·작가 워크스페이스·클라이언트 워크스페이스)
 * 위치: src/components/app/NotificationBell.tsx
 * 시안: 와이어프레임 11 알림 드롭다운 + 보드 A3 (유형 아이콘 · 전체/안 읽음 탭 · 오늘/이번 주/이전 묶음)
 *
 * 열기 전에도 목록을 한 번 받아 안 읽은 알림 수를 벨에 숫자로 적는다(10개부터 9+). 열 때 다시 받고, 탭이 보이는 동안
 * 60초마다 · 다른 탭에서 돌아올 때도 다시 받는다 — 화면을 열어 둔 채 기다려도 새 알림이 보이게(이슈 84).
 * 받을 때마다 "아직 카드로 알리지 않은, 안 읽은 알림"을 가려 벨 아래 카드(NotificationPeek)로 한 번 알리고 벨을
 * 한 번 흔든다(이슈 88). 사이트를 닫아 둔 동안 온 알림도 들어왔을 때 같은 카드로 알린다. 어디까지 알렸는지는
 * 브라우저에 적어 둬서(notificationMemory) 화면을 옮겨도 같은 알림이 다시 뜨지 않는다.
 * 목록은 어디서 열어도 내 알림 전부라, 알림마다 어느 갤러리 · 스튜디오 것인지 이름표를 붙인다(notificationSource, 이슈 106).
 * 행을 누르면 읽음 처리(PATCH)하고 범위에 맞는 화면으로 간다 — 갤러리 알림의 주소는 보는 사람의
 * 역할에 따라 다르므로 hrefFor로 바꿔 끼운다(기본은 작가 주소). 내보내짐 · 작업공간 삭제 알림은
 * 갈 곳이 없어(403·404) 어느 역할이든 읽음 처리만 한다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, BellOffIcon } from "@/components/icons";
import { blockLeave } from "@/components/app/LeaveGuard";
import { NotificationPeek } from "@/components/app/NotificationPeek";
import { kindStyleOf, relativeTime } from "@/components/app/notificationKinds";
import { pickUnannounced, readAnnouncedId, writeAnnouncedId } from "@/components/app/notificationMemory";
import { NotificationSourceTag, useNotificationSource } from "@/components/app/notificationSource";
import { IconButton } from "@/components/ui/IconButton";
import {
  listNotifications,
  markNotificationsRead,
  type NotificationType,
  type UserNotificationResponse,
} from "@/lib/api/notifications";
import { useAuth } from "@/lib/auth/authStore";

type Group = "오늘" | "이번 주" | "이전";
const GROUPS: Group[] = ["오늘", "이번 주", "이전"];

/** 작가 기본 주소 — 갤러리 알림은 작가 갤러리로, 스튜디오 알림은 스튜디오 홈으로 */
function studioHref(n: UserNotificationResponse): string | null {
  if (n.scopeId === null) return null;
  if (n.scope === "GALLERY") return `/studio/gallery/${n.scopeId}`;
  if (n.scope === "STUDIO") return `/studio/${n.scopeId}`;
  return null;
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

/** 벨 아래 카드에 띄울 것 — 가장 새 알림 하나와 함께 온 나머지 수 */
type Peek = { item: UserNotificationResponse; more: number; at: number };

/** 탭이 보이는 동안 목록을 다시 받는 간격 */
const REFRESH_MS = 60_000;

/** 눌러도 갈 곳이 없는 알림 — 내보내졌거나 작업공간이 삭제돼 그 주소는 이미 403·404다. 읽음 처리만 한다 */
const NO_DESTINATION = new Set<NotificationType>(["MEMBERSHIP_REMOVED", "WORKSPACE_DELETED"]);

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
  const [peek, setPeek] = useState<Peek | null>(null);
  /** 벨을 한 번 흔들 때마다 올린다 — key로 써서 애니메이션을 다시 건다 */
  const [ring, setRing] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const loadedOnce = useRef(false);
  const auth = useAuth();
  const userId = auth.user?.id ?? null;

  /** 받은 목록을 화면에 반영하고, 아직 알리지 않은 새 알림이 있으면 벨 아래 카드로 알린다 */
  function receive(list: UserNotificationResponse[]) {
    const now = Date.now();
    loadedOnce.current = true;
    setData({ list, at: now });
    setFailed(false);
    if (userId === null) return;
    const announced = readAnnouncedId(userId);
    const newest = list.reduce((max, n) => Math.max(max, n.id), 0);
    if (announced !== null && newest <= announced) return;
    writeAnnouncedId(userId, newest);
    // 처음 쓰는 브라우저면 기준만 잡는다 — 오래 쌓인 알림이 한꺼번에 뜨지 않게
    if (announced === null) return;
    const fresh = pickUnannounced(list, announced);
    // 목록을 열어 둔 채면 거기서 보이니 카드는 띄우지 않는다
    if (fresh.length === 0 || open) return;
    setPeek({ item: fresh[0], more: fresh.length - 1, at: now });
    setRing((n) => n + 1);
  }
  // 아래 두 effect는 처음 한 번만 걸린다 — 최신 값(사용자 · 열림 여부)은 여기서 읽는다
  const receiveRef = useRef(receive);
  useEffect(() => {
    receiveRef.current = receive;
  });

  const closePeek = useCallback(() => setPeek(null), []);

  // 처음 한 번(배지용), 그리고 열 때마다 새로 받는다. 닫을 때는 다시 받지 않는다.
  useEffect(() => {
    if (!open && loadedOnce.current) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listNotifications();
        if (cancelled) return;
        receiveRef.current(list);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // 탭이 보이는 동안 주기적으로, 그리고 다른 탭에서 돌아올 때 다시 받는다 — 새로고침 없이도 벨의 점이 생기게
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const list = await listNotifications();
        if (cancelled) return;
        receiveRef.current(list);
      } catch {
        // 주기 갱신 실패는 조용히 — 다음 차례에 다시
      }
    }
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const onVisible = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

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
  const sourceOf = useNotificationSource(list);
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
    const href = NO_DESTINATION.has(n.type) ? null : hrefFor(n);
    // 업로드 중이면 이동하지 않는다 — 가 보지 못했으니 읽음으로도 바꾸지 않는다
    if (href && blockLeave()) return;
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
        icon={
          <span key={ring} className={`flex ${ring > 0 ? "bell-ring" : ""}`}>
            <BellIcon size={20} />
          </span>
        }
        selected={open}
        onClick={() => {
          setPeek(null);
          setOpen((v) => !v);
        }}
        aria-label={unread > 0 ? `알림 ${unread}개 안 읽음` : "알림"}
      />
      {unread > 0 && (
        // 한 자리 숫자는 늘 같은 크기의 원(16px), 10개부터 "9+"만 옆으로 늘어난다. 16px 원에 넣으려고 타이포 토큰에 없는 10px을 쓴다
        <span
          aria-hidden
          className={`pointer-events-none absolute -top-1 grid h-4 place-items-center rounded-(--pill) border-[1.5px] border-background-default-main bg-function-error-default text-[10px] leading-none font-semibold text-white tabular-nums ${
            unread > 9 ? "-right-2.5 px-0.75" : "-right-1.25 w-4"
          }`}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
      {peek && !open && (
        <NotificationPeek
          key={peek.item.id}
          item={peek.item}
          source={sourceOf(peek.item)}
          more={peek.more}
          now={peek.at}
          onOpen={() => {
            setPeek(null);
            void openItem(peek.item);
          }}
          onShowAll={() => {
            setPeek(null);
            setOpen(true);
          }}
          onClose={closePeek}
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
                      const style = kindStyleOf(n.type);
                      const read = n.readAt !== null;
                      const source = sourceOf(n);
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
                            {source && <NotificationSourceTag name={source} />}
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
