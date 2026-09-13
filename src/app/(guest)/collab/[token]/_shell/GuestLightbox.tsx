"use client";

/**
 * 게스트 싱글뷰 — 공용 Lightbox + 가운데 [♥ 좋아요] + 탭은 댓글 하나(처음 열 때 열림)
 * 위치: src/app/(guest)/collab/[token]/_shell/GuestLightbox.tsx
 *
 * 좋아요는 내 하트만(숫자 없음), 낙관적으로 바로 바뀌고 실패하면 되돌린다. writable=false면 하트 · 댓글 탭 자리에 잠금.
 * 사진 · 컨트롤 · 패널 밖(여백)을 누르면 닫힘 — 공용 Lightbox 동작.
 */

import { useState } from "react";
import { CommentIcon, HeartFillIcon, HeartIcon, LockIcon } from "@/components/icons";
import { Lightbox, type LightboxTabDef } from "@/components/app/Lightbox";
import type { CollabPhotoResponse } from "@/lib/api/collab";
import { GuestComments } from "./GuestComments";

export function GuestLightbox({
  photos,
  index,
  writable,
  tokenOf,
  guestTokenOf,
  onClose,
  onNavigate,
  onToggleLike,
  onCommentDelta,
  onNeedName,
}: {
  /** 지금 그리드에 보이는 순서대로 */
  photos: CollabPhotoResponse[];
  index: number;
  writable: boolean;
  /** 사진이 속한 앨범(세션) 토큰 */
  tokenOf: (photoId: number) => string;
  guestTokenOf: (token: string) => string | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleLike: (photo: CollabPhotoResponse) => void;
  onCommentDelta: (photo: CollabPhotoResponse, delta: number) => void;
  onNeedName: () => void;
}) {
  const [tab, setTab] = useState<"cmt" | "none">("cmt");
  const p = photos[index];
  if (!p) return null;
  const token = tokenOf(p.photoId);
  const tabs: LightboxTabDef[] = [{ key: "cmt", label: `댓글 ${p.commentCount}`, icon: writable ? <CommentIcon size={20} /> : <LockIcon size={20} /> }];

  const like = writable ? (
    <button
      type="button"
      aria-pressed={p.liked}
      onClick={() => onToggleLike(p)}
      className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s transition-colors duration-fast ${p.liked ? "bg-brand-secondary-default text-white" : "bg-white/15 text-white hover:bg-white/25"}`}
    >
      {p.liked ? <HeartFillIcon size={16} /> : <HeartIcon size={16} />}
      좋아요
    </button>
  ) : (
    <span className="inline-flex h-7 items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s text-white/60" title="부부가 고르기를 마쳤어요">
      <LockIcon size={16} />
      좋아요
    </span>
  );

  return (
    <Lightbox
      photo={p.photo}
      index={index}
      total={photos.length}
      caption={null}
      tab={tab}
      tabs={tabs}
      middle={like}
      panelTitle={`댓글 ${p.commentCount}`}
      panel={
        <GuestComments
          key={`${token}:${p.photoId}`}
          token={token}
          guestToken={guestTokenOf(token)}
          photoId={p.photoId}
          writable={writable}
          onCountChange={(d) => onCommentDelta(p, d)}
          onNeedName={onNeedName}
        />
      }
      onClose={onClose}
      onPrev={() => onNavigate((index - 1 + photos.length) % photos.length)}
      onNext={() => onNavigate((index + 1) % photos.length)}
      onTabChange={(next) => setTab(next === "cmt" ? "cmt" : "none")}
      onKeyDown={(e) => {
        if (e.key === " " && writable) {
          e.preventDefault();
          onToggleLike(p);
          return true;
        }
      }}
    />
  );
}
