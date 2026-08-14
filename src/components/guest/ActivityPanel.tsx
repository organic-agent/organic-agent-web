"use client";

/**
 * 게스트 활동 패널 — 피그마 Guest/PanelActivity 대응 (240px: 댓글 목록 + 작성 폼)
 * 위치: src/components/guest/ActivityPanel.tsx
 */

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { PhotoComment } from "@/lib/couple";

export function ActivityPanel({
  comments,
  onSubmit,
}: {
  comments: PhotoComment[];
  onSubmit: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSubmit(text);
    setDraft("");
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between gap-4 border-l border-stroke-neutral-muted bg-bg-layer-default p-4">
      <div className="flex min-h-0 w-full flex-col gap-3">
        <span className="type-utility-panel text-fg-neutral">활동</span>
        <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />
        <div className="flex min-h-0 w-full flex-col gap-3 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="type-body-small text-fg-neutral-muted">
              아직 활동이 없어요. 첫 댓글을 남겨보세요!
            </p>
          ) : (
            comments.map((comment, i) => (
              <div key={i} className="flex w-full items-start gap-2">
                <Avatar initial={comment.initial} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-body-small text-fg-neutral-muted">
                    {comment.author} · {comment.timeLabel}
                  </span>
                  <p className="type-body-medium text-fg-neutral">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex w-full flex-col items-end gap-1">
        <Textarea
          value={draft}
          onChange={setDraft}
          placeholder="내용을 입력하세요"
          aria-label="댓글 작성"
          className="h-20"
        />
        <Button size="sm" onClick={submit}>
          제출
        </Button>
      </div>
    </aside>
  );
}
