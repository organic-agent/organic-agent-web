"use client";

/**
 * 게스트 댓글 패널 — 같은 링크(세션) 사람들의 댓글 · 오래된순 · 내 댓글은 호버 때 삭제(모달 확인) · 아래 입력
 * 위치: src/app/(guest)/collab/[token]/_shell/GuestComments.tsx
 *
 * 서버는 최신순으로 주니 뒤집어 오래된순. 1~500자, 수정 없음. Enter 보내기 · Shift+Enter 줄바꿈, 400자 넘으면 카운터.
 * writable=false면 목록만 보이고 입력 자리는 잠금 한 줄. 토큰이 죽어 401(COLLAB_401_1)이 오면 이름을 다시 받는다(onNeedName).
 */

import { useEffect, useRef, useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { LockIcon, TrashIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { deleteGuestComment, isGuestNotIdentified, listGuestComments, writeGuestComment, type CollabCommentResponse } from "@/lib/api/collabGuest";
import { relativeTime } from "./guestView";
import { guestInitial } from "./randomName";

const MAX = 500;

export function GuestComments({
  token,
  guestToken,
  photoId,
  writable,
  onCountChange,
  onNeedName,
}: {
  /** 이 사진이 속한 앨범(세션) 토큰 */
  token: string;
  guestToken: string | null;
  photoId: number;
  writable: boolean;
  /** 쓰기 · 삭제 뒤 사진의 댓글 수 보정(+1 · −1) */
  onCountChange: (delta: number) => void;
  onNeedName: () => void;
}) {
  const [list, setList] = useState<CollabCommentResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<CollabCommentResponse | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out: CollabCommentResponse[] = [];
        for (let page = 0; page < 20; page++) {
          const res = await listGuestComments(token, guestToken, photoId, page, 50);
          out.push(...res.contents);
          if (!res.hasNext) break;
        }
        if (!cancelled) setList(out.reverse());
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "댓글을 불러오지 못했어요");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, guestToken, photoId]);

  const trimmed = text.trim();
  const canSend = writable && !sending && trimmed.length >= 1 && trimmed.length <= MAX;

  async function send() {
    if (!canSend) return;
    if (!guestToken) {
      onNeedName();
      return;
    }
    setSending(true);
    setError(null);
    try {
      const created = await writeGuestComment(token, guestToken, photoId, trimmed);
      setList((prev) => [...(prev ?? []), { ...created, mine: true }]);
      setText("");
      onCountChange(1);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    } catch (err) {
      if (isGuestNotIdentified(err)) onNeedName();
      else setError(err instanceof ApiError ? err.message : "보내지 못했어요 · 다시 시도해 주세요");
    } finally {
      setSending(false);
    }
  }

  async function confirmDelete() {
    if (!deleting || busyDelete) return;
    setBusyDelete(true);
    try {
      await deleteGuestComment(token, guestToken, deleting.commentId);
      setList((prev) => (prev ?? []).filter((c) => c.commentId !== deleting.commentId));
      onCountChange(-1);
      setDeleting(null);
    } catch (err) {
      setDeleting(null);
      if (isGuestNotIdentified(err)) onNeedName();
      else setError(err instanceof ApiError ? err.message : "지우지 못했어요 · 다시 시도해 주세요");
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <div className="-mx-4 -my-4 flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4">
        {list === null && !error ? (
          <div className="h-16 animate-pulse rounded-(--radius-8) bg-surface-default-light" aria-busy="true" />
        ) : list && list.length === 0 ? (
          <p className="py-8 text-center type-content-s text-contents-light-bgd-weakness">{writable ? "첫 댓글을 남겨 보세요" : "댓글이 없어요"}</p>
        ) : (
          list?.map((c) => (
            <div key={c.commentId} className="group -mx-2 flex gap-2.5 rounded-(--radius-8) px-2 py-1 hover:bg-surface-default-lightness">
              <Avatar initial={guestInitial(c.nickname)} className={c.mine ? "bg-brand-primary-default text-contents-dark-bgd-default" : "bg-brand-secondary-background text-brand-secondary-dark"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <b className="truncate type-label-semibold-s text-contents-light-bgd-default">
                    {c.nickname}
                    {c.mine && <span className="font-normal text-contents-light-bgd-weakness"> (나)</span>}
                  </b>
                  <small className="shrink-0 type-content-xs text-contents-light-bgd-weakness">{relativeTime(c.createdAt)}</small>
                  {c.mine && writable && (
                    <button
                      type="button"
                      aria-label="댓글 삭제"
                      onClick={() => setDeleting(c)}
                      className="ml-auto grid size-6 shrink-0 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-weakness opacity-0 transition-opacity duration-fast group-hover:opacity-100 hover:bg-surface-default-medium hover:text-function-error-default focus-visible:opacity-100"
                    >
                      <TrashIcon size={16} />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 type-content-s break-words whitespace-pre-wrap text-contents-light-bgd-default">{c.content}</p>
              </div>
            </div>
          ))
        )}
        {error && (
          <p role="alert" className="type-content-xs text-function-error-default">
            {error}
          </p>
        )}
      </div>

      {writable ? (
        <form
          className="shrink-0 border-t border-divider-default p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex items-end gap-2 rounded-(--radius-12) border border-border-default py-2 pr-2 pl-3 transition-colors duration-fast focus-within:border-contents-light-bgd-default">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="댓글 남기기"
              aria-label="댓글"
              className="scrollbar-slim max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1 type-content-s leading-relaxed text-contents-light-bgd-default outline-none placeholder:text-contents-light-bgd-weakness field-sizing-content"
            />
            {trimmed.length > 400 && <span className="pb-1.5 type-content-xs text-contents-light-bgd-weakness tabular-nums">{trimmed.length} / {MAX}</span>}
            <Button type="submit" size="sm" disabled={!canSend}>
              {sending ? "보내는 중…" : "보내기"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="flex shrink-0 items-center gap-2 border-t border-divider-default px-4 py-3 type-content-xs text-contents-light-bgd-weakness">
          <LockIcon size={16} />
          댓글은 부부가 고르기를 마쳐 닫혔어요
        </p>
      )}

      {deleting && (
        <GalleryModalShell title="댓글을 지울까요?" desc="지운 댓글은 되돌릴 수 없어요" maxWidthClassName="max-w-95" onClose={() => setDeleting(null)}>
          <GalleryModalButtons onClose={() => setDeleting(null)} onConfirm={() => void confirmDelete()} confirmLabel={busyDelete ? "지우는 중…" : "삭제"} confirmVariant="danger" disabled={busyDelete} />
        </GalleryModalShell>
      )}
    </div>
  );
}
