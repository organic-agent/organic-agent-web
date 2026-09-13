"use client";

/**
 * 하객 반응 집계 — 살아 있는 공유폴더마다 사진 목록을 읽어 사진별 좋아요 · 댓글 수를 모은다
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useGuestReactions.ts
 *
 * 공유폴더(세션)마다 게스트 토큰이 따로라 같은 사람도 폴더마다 한 표 — 사진이 여러 폴더에 있으면 더한다.
 * 공유 탭 카드 요약(폴더별 합) · 반응 보기(폴더의 사진) · 2단계 "하객 반응" 토글(사진별 합)이 같이 쓴다.
 */

import { useEffect, useMemo, useState } from "react";
import { listAllCollabPhotos, type CollabPhotoResponse, type CollabSessionResponse } from "@/lib/api/collab";
import { isLiveSession } from "./useCollabSessions";

export type GuestReactions = {
  /** 공유폴더 id → 그 폴더의 사진(좋아요 · 댓글 수 포함). 아직 못 읽었으면 비어 있다 */
  bySession: ReadonlyMap<number, CollabPhotoResponse[]>;
  likesByPhoto: ReadonlyMap<number, number>;
  commentsByPhoto: ReadonlyMap<number, number>;
  summaryOf: (sessionId: number) => { likes: number; comments: number } | null;
  loading: boolean;
  reload: () => void;
};

const EMPTY: ReadonlyMap<number, CollabPhotoResponse[]> = new Map();

export function useGuestReactions(galleryId: number, sessions: CollabSessionResponse[] | null): GuestReactions {
  const live = useMemo(() => (sessions ?? []).filter(isLiveSession), [sessions]);
  const key = live.map((s) => `${s.sessionId}:${s.photoCount}`).join(",");
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<{ key: string; nonce: number; bySession: Map<number, CollabPhotoResponse[]> } | null>(null);

  useEffect(() => {
    if (sessions === null) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        live.map(async (s) => {
          try {
            return [s.sessionId, s.photoCount > 0 ? await listAllCollabPhotos(galleryId, s.sessionId) : []] as const;
          } catch {
            return [s.sessionId, [] as CollabPhotoResponse[]] as const;
          }
        }),
      );
      if (!cancelled) setData({ key, nonce, bySession: new Map(entries) });
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, sessions, live, key, nonce]);

  const ready = data !== null && data.key === key && data.nonce === nonce;
  const bySession = ready ? data.bySession : EMPTY;
  const { likesByPhoto, commentsByPhoto } = useMemo(() => {
    const likes = new Map<number, number>();
    const comments = new Map<number, number>();
    for (const list of bySession.values())
      for (const p of list) {
        if (p.likeCount) likes.set(p.photoId, (likes.get(p.photoId) ?? 0) + p.likeCount);
        if (p.commentCount) comments.set(p.photoId, (comments.get(p.photoId) ?? 0) + p.commentCount);
      }
    return { likesByPhoto: likes, commentsByPhoto: comments };
  }, [bySession]);

  return {
    bySession,
    likesByPhoto,
    commentsByPhoto,
    summaryOf: (sessionId) => {
      const list = bySession.get(sessionId);
      if (!list) return null;
      return { likes: list.reduce((n, p) => n + p.likeCount, 0), comments: list.reduce((n, p) => n + p.commentCount, 0) };
    },
    loading: sessions !== null && !ready,
    reload: () => setNonce((n) => n + 1),
  };
}
