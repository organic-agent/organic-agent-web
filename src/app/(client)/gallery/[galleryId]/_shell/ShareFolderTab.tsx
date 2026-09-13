"use client";

/**
 * 사이드바 "공유" 탭 — 공유폴더 목록(이름 · 사진 · 남은 기간 · ♥ n · 💬 n) + 새 공유폴더
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ShareFolderTab.tsx
 *
 * 카드를 누르면 그 공유폴더의 하객 반응 보기로 간다(2026-09-13). 링크 복사 · 재발행 · 폐기는 상단 초대 버튼의 "만든 링크".
 */

import { CommentIcon, HeartFillIcon, PlusIcon } from "@/components/icons";
import { isLiveSession, sessionTermLabel, type CollabSessions } from "./useCollabSessions";

export function ShareFolderTab({
  collab,
  summaryOf,
  currentSessionId,
  onOpenReactions,
  onCreate,
}: {
  collab: CollabSessions;
  /** 공유폴더의 좋아요 · 댓글 합 — 아직 못 읽었으면 null */
  summaryOf: (sessionId: number) => { likes: number; comments: number } | null;
  /** 지금 반응 보기로 열어 둔 공유폴더 */
  currentSessionId: number | null;
  onOpenReactions: (sessionId: number) => void;
  onCreate: () => void;
}) {
  const sessions = collab.sessions;
  return (
    <div className="flex flex-col rounded-(--radius-12) bg-surface-default-lightness px-1.5 pt-2 pb-1.5">
      <p className="flex items-center justify-between px-2 pb-1 type-label-semibold-xs text-contents-light-bgd-sub">
        공유폴더
        <span className="font-normal text-contents-light-bgd-weakness">{sessions ? sessions.filter(isLiveSession).length : ""}</span>
      </p>
      {sessions === null ? (
        collab.error ? (
          <p className="px-2 py-2 type-content-xs text-function-error-default">불러오지 못했어요</p>
        ) : (
          <div className="mx-1 my-1 h-9 animate-pulse rounded-(--radius-8) bg-surface-default-light" aria-busy="true" />
        )
      ) : sessions.length === 0 ? (
        <p className="px-2 py-2 type-content-xs text-contents-light-bgd-weakness">아직 공유폴더가 없어요</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {sessions.map((s) => {
            const term = sessionTermLabel(s);
            const sum = summaryOf(s.sessionId);
            const current = s.sessionId === currentSessionId;
            return (
              <li key={s.sessionId}>
                <button
                  type="button"
                  aria-current={current || undefined}
                  onClick={() => onOpenReactions(s.sessionId)}
                  className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-(--radius-8) px-2 py-1.5 text-left transition-colors duration-fast ${current ? "bg-brand-secondary-background" : "hover:bg-surface-default-light"}`}
                >
                  <span className={`truncate type-content-m ${current ? "font-semibold" : ""} ${term.live ? "text-contents-light-bgd-default" : "text-contents-light-bgd-weakness"}`}>{s.name}</span>
                  <span className="type-content-xs text-contents-light-bgd-weakness tabular-nums">
                    사진 {s.photoCount}
                    {term.text && ` · ${term.text}`}
                  </span>
                  {sum && (sum.likes > 0 || sum.comments > 0) ? (
                    <span className="mt-0.5 flex gap-2.5 type-label-semibold-xs text-contents-light-bgd-default tabular-nums">
                      <span className="inline-flex items-center gap-0.5">
                        <HeartFillIcon size={13} className="text-brand-secondary-default" />
                        {sum.likes}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <CommentIcon size={13} className="text-contents-light-bgd-sub" />
                        {sum.comments}
                      </span>
                    </span>
                  ) : sum ? (
                    <span className="type-content-xs text-contents-light-bgd-weakness">아직 반응이 없어요</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={onCreate}
        className="mt-1 inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-(--radius-8) border border-border-default bg-background-default-main type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-light"
      >
        <PlusIcon size={16} />
        새 공유폴더
      </button>
    </div>
  );
}
