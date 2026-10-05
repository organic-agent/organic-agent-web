"use client";

/**
 * 공유폴더 한 곳에서 사진 한 장에 달린 게스트 댓글 — 부부는 읽기만 (하객 반응 보기 · 싱글뷰 "게스트 반응" 패널 공용)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ReactionComments.tsx
 */

import { useEffect, useState } from "react";
import { CommentItem } from "@/app/(guest)/collab/[token]/_shell/GuestComments";
import { ApiError } from "@/lib/api/client";
import { listAllSessionPhotoComments } from "@/lib/api/collab";
import type { CollabCommentResponse } from "@/lib/api/collabGuest";

/** 부부가 읽는 사진 댓글 — 오래된순, 읽기만 */
export function ReactionComments({ galleryId, sessionId, photoId }: { galleryId: number; sessionId: number; photoId: number }) {
  const [list, setList] = useState<CollabCommentResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = await listAllSessionPhotoComments(galleryId, sessionId, photoId);
        if (!cancelled) setList(out.reverse());
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "댓글을 불러오지 못했어요");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, sessionId, photoId]);

  if (error) return <p role="alert" className="type-content-xs text-function-error-default">{error}</p>;
  if (list === null) return <div className="h-16 animate-pulse rounded-(--radius-8) bg-surface-default-light" aria-busy="true" />;
  if (list.length === 0) return <p className="py-8 text-center type-content-s text-contents-light-bgd-weakness">댓글이 없어요</p>;
  return (
    <div className="flex flex-col gap-3.5">
      {list.map((c) => (
        <CommentItem key={c.commentId} comment={{ ...c, mine: false }} />
      ))}
    </div>
  );
}
