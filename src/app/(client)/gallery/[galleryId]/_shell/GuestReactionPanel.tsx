"use client";

/**
 * 싱글뷰 "게스트 반응" 패널 — 이 사진이 공유폴더에서 받은 좋아요 · 댓글 (이슈 88, 팀 노션 51번)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/GuestReactionPanel.tsx
 *
 * 맨 위에 좋아요 · 댓글 수를 모아 보이고, 아래에 공유폴더별로 묶어 댓글을 읽는다. 공유폴더마다 받는 사람이 달라서
 * (가족 · 친구) 섞지 않는다. 반응이 온 공유폴더가 한 곳뿐이면 폴더 이름 줄은 두지 않는다.
 * 좋아요는 수만 온다(누가 눌렀는지는 서버가 주지 않는다). 부부는 읽기만 한다.
 * 반응이 하나도 없는 사진에서는 이 패널을 열지 않는다 — 버튼을 흐리게 두고 스낵바로 알린다(SelectStage).
 */

import type { ReactNode } from "react";
import { CommentIcon, HeartFillIcon } from "@/components/icons";
import { ReactionComments } from "./ReactionComments";
import type { PhotoReactionGroup } from "./useGuestReactions";

export function GuestReactionPanel({
  galleryId,
  photoId,
  groups,
}: {
  galleryId: number;
  photoId: number;
  /** 이 사진에 반응이 있는 공유폴더들 */
  groups: PhotoReactionGroup[];
}) {
  const likes = groups.reduce((n, g) => n + g.likes, 0);
  const comments = groups.reduce((n, g) => n + g.comments, 0);
  const many = groups.length > 1;

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Count label={`좋아요 ${likes}`} icon={<HeartFillIcon size={14} />} n={likes} />
        <Count label={`댓글 ${comments}`} icon={<CommentIcon size={14} />} n={comments} />
      </div>
      {groups.map((group, i) =>
        !many && group.comments === 0 ? null : (
          <section key={group.sessionId} className={`flex flex-col gap-3 ${i > 0 ? "border-t border-divider-default pt-3.5" : ""}`}>
            {many && (
              <h4 className="flex items-center justify-between gap-2 type-label-semibold-xs text-contents-light-bgd-weakness">
                <span className="truncate">{group.name}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 font-medium tabular-nums" aria-label={`좋아요 ${group.likes}`}>
                  <HeartFillIcon size={12} />
                  {group.likes}
                </span>
              </h4>
            )}
            {group.comments > 0 && (
              <ReactionComments key={`${group.sessionId}:${photoId}`} galleryId={galleryId} sessionId={group.sessionId} photoId={photoId} />
            )}
          </section>
        ),
      )}
    </>
  );
}

function Count({ label, icon, n }: { label: string; icon: ReactNode; n: number }) {
  return (
    <span
      aria-label={label}
      className="inline-flex h-7 items-center gap-1 rounded-(--pill) bg-surface-default-light px-2.5 type-label-semibold-s text-contents-light-bgd-default tabular-nums"
    >
      {icon}
      {n}
    </span>
  );
}
