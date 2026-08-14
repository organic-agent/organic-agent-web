/**
 * 받은 반응 패널 — 피그마 Panel/Reaction 대응 (280px, 우측 보더 좌측)
 * 위치: src/components/app/ReactionPanel.tsx
 *
 * 좋아요 요약 + 댓글 목록. 실데이터는 협업(게스트) 재편 때 연결 — 그때까지 mock 표시.
 */

import { PanelHeader } from "@/components/ui/PanelHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ReactionIcon, HeartIcon } from "@/components/icons";

export type ReactionComment = {
  initial: string;
  /** 예: "지수 · 10분 전" */
  meta: string;
  text: string;
  /** 일반 댓글과 구분할 칩 라벨 (예: "보정 요청" — 작가 화면용) */
  tag?: string;
};

export function ReactionPanel({
  likesLabel,
  comments,
}: {
  likesLabel: string;
  comments: ReactionComment[];
}) {
  return (
    <aside className="flex w-70 shrink-0 flex-col gap-4 overflow-y-auto border-l border-stroke-neutral-muted bg-bg-layer-default p-5">
      <PanelHeader icon={<ReactionIcon size={16} />}>받은 반응</PanelHeader>

      <div className="flex items-center gap-2 text-fg-neutral">
        <HeartIcon size={16} />
        <span className="type-body-medium">{likesLabel}</span>
      </div>

      <div className="h-px w-full bg-stroke-neutral-muted" />

      {comments.map((comment, i) => (
        <div key={i} className="flex w-full items-start gap-2">
          <Avatar initial={comment.initial} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5 type-body-small text-fg-neutral-muted">
              {comment.meta}
              {comment.tag && (
                <span className="rounded-(--radius-4) bg-bg-layer-default-hover px-1.5 py-0.5 text-fg-neutral">
                  {comment.tag}
                </span>
              )}
            </span>
            <p className="type-body-medium text-fg-neutral">{comment.text}</p>
          </div>
        </div>
      ))}
    </aside>
  );
}
