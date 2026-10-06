"use client";

/**
 * 알림의 이름표 — 어느 갤러리 · 스튜디오의 알림인지 (이슈 106, 팀 노션 31번)
 * 위치: src/components/app/notificationSource.tsx
 *
 * 알림 응답에는 갤러리 · 스튜디오의 번호만 있고 이름이 없다. 서버 문구의 절반쯤은 이름을 담지 않아
 * ("AI 분석이 완료되었습니다") 갤러리가 여럿이면 어디 것인지 알 수 없다. 그래서 웹이 이미 받는 값으로 이름을 찾아
 * 붙인다 — 스튜디오와 내가 들어가 있는 갤러리는 내 정보의 소속 목록에서, 작가가 맡은 갤러리는 갤러리 목록에서.
 *
 * 무엇을 적는지는 받는 사람으로 정해져서, 어느 화면에서 열어도 같다.
 *  - 스튜디오가 둘 이상인 작가: 갤러리 알림은 "스튜디오 · 갤러리", 스튜디오 알림은 "스튜디오"
 *  - 스튜디오가 하나인 작가: 갤러리 알림은 "갤러리", 스튜디오 알림에는 없다
 *  - 갤러리가 둘 이상인 클라이언트: "갤러리". 갤러리가 하나뿐이면 가릴 것이 없어 붙이지 않는다
 * 이름을 못 찾으면(지워진 갤러리 · 내보내진 곳) 붙이지 않는다.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { listGalleries } from "@/lib/api/galleries";
import type { UserNotificationResponse } from "@/lib/api/notifications";
import { useAuth } from "@/lib/auth/authStore";

type GalleryName = { title: string; workspaceId: number };

/** 갤러리 목록에서 읽은 이름. missing은 목록에 없던 번호 — 지워진 갤러리를 찾느라 목록을 거듭 받지 않게 */
type Names = { galleries: ReadonlyMap<number, GalleryName>; missing: ReadonlySet<number> };

const EMPTY: Names = { galleries: new Map(), missing: new Set() };

// 알림 벨은 화면마다 새로 만들어진다(상단바가 page 안에 있다). 화면을 옮길 때마다 갤러리 목록을 다시 받지 않게
// 부품 밖에 둔다. 한 브라우저를 여러 계정이 쓸 수 있어 사용자마다 나눈다
const byUser = new Map<number, Names>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 알림 하나의 이름표를 돌려주는 함수. 붙일 것이 없으면 null */
export function useNotificationSource(
  list: UserNotificationResponse[],
): (n: UserNotificationResponse) => string | null {
  const user = useAuth().user;
  const userId = user?.id ?? null;
  const names = useSyncExternalStore(
    subscribe,
    () => (userId === null ? EMPTY : (byUser.get(userId) ?? EMPTY)),
    () => EMPTY,
  );

  const { studios, joined } = useMemo(() => {
    /** 내 스튜디오 — workspaceId → 이름 */
    const studios = new Map<number, string>();
    /** 내가 들어가 있는 갤러리(초대 클라이언트 · 개인) — galleryId → 이름 */
    const joined = new Map<number, string>();
    for (const w of user?.workspaces ?? []) {
      if (w.kind === "STUDIO") studios.set(w.workspaceId, w.name);
      else if (w.galleryId !== null) joined.set(w.galleryId, w.name);
    }
    return { studios, joined };
  }, [user]);

  // 작가가 맡은 갤러리는 소속 목록에 없다 — 아직 이름을 모르는 번호가 있을 때만 갤러리 목록을 받는다
  const unknown =
    studios.size === 0
      ? ""
      : [
          ...new Set(
            list
              .filter((n) => n.scope === "GALLERY" && n.scopeId !== null)
              .map((n) => n.scopeId as number)
              .filter((id) => !joined.has(id) && !names.galleries.has(id) && !names.missing.has(id)),
          ),
        ]
          .sort((a, b) => a - b)
          .join(",");

  useEffect(() => {
    if (userId === null || unknown === "") return;
    (async () => {
      try {
        const all = await listGalleries();
        const galleries = new Map(all.map((g) => [g.id, { title: g.title, workspaceId: g.workspaceId }]));
        const missing = new Set(byUser.get(userId)?.missing);
        for (const id of unknown.split(",").map(Number)) {
          if (!galleries.has(id)) missing.add(id);
        }
        byUser.set(userId, { galleries, missing });
        for (const listener of listeners) listener();
      } catch {
        // 이름을 못 받으면 이름표 없이 둔다 — 화면을 옮기면 다시 받는다
      }
    })();
  }, [userId, unknown]);

  return useCallback(
    (n: UserNotificationResponse) => {
      if (n.scopeId === null) return null;
      // 스튜디오가 없고 갤러리가 하나뿐이면 모든 알림이 같은 곳의 것이다
      if (studios.size === 0 && joined.size <= 1) return null;
      const manyStudios = studios.size > 1;
      if (n.scope === "STUDIO") return manyStudios ? (studios.get(n.scopeId) ?? null) : null;
      if (n.scope !== "GALLERY") return null;
      const mine = joined.get(n.scopeId);
      if (mine !== undefined) return mine;
      const gallery = names.galleries.get(n.scopeId);
      if (!gallery) return null;
      const studio = manyStudios ? studios.get(gallery.workspaceId) : undefined;
      return studio ? `${studio} · ${gallery.title}` : gallery.title;
    },
    [studios, joined, names],
  );
}

/** 이름표 — 알림 목록의 줄과 벨 아래 카드가 같이 쓴다. 한 줄이고, 길면 끝을 줄인다 */
export function NotificationSourceTag({ name }: { name: string }) {
  return (
    <span className="mt-1.5 block w-fit max-w-full truncate rounded-(--radius-4) bg-surface-default-light px-1.75 py-0.5 type-content-xs text-contents-light-bgd-sub">
      {name}
    </span>
  );
}
