"use client";

/**
 * 폴더 열 — 컨셉 › 세부 폴더 트리 (1단계 사진 업로드에서만 3열로 붙는다)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/FolderColumn.tsx
 *
 * 읽기 전용(B1). 세부 폴더의 needsReview는 "검토" 배지, 어느 폴더에도 없는 사진은 맨 아래 "미분류".
 * 이름 바꾸기 · 세부 폴더 추가 · 삭제 · 사진 이동(호버 케밥)은 B2에서 붙는다.
 */

import { useState } from "react";
import { DropdownIcon, FolderOffIcon } from "@/components/icons";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";

export type FolderSelection =
  | { kind: "all" }
  | { kind: "detail"; conceptId: number; detailId: number }
  | { kind: "unsorted" };

export function ReviewBadge() {
  return (
    <span className="ml-1.5 rounded-(--pill) bg-function-warning-background px-1.5 py-px type-label-semibold-xs text-function-warning-default">
      검토
    </span>
  );
}

export type FolderPendingNote = {
  /** 머리 오른쪽 짧은 상태 — "대기" · "만드는 중…" */
  label: string;
  /** 본문 안내 한두 문장 */
  note: string;
};

export function FolderColumn({
  folders,
  totalPhotos,
  unsortedCount,
  selection,
  onSelect,
  pendingNote = null,
}: {
  /** null = 불러오는 중 */
  folders: ConceptFolderResponse[] | null;
  totalPhotos: number;
  unsortedCount: number;
  selection: FolderSelection;
  onSelect: (selection: FolderSelection) => void;
  /** 폴더가 아직 없을 때 AI 진행 상태(업로드 · 분석 중) — 없으면 기본 안내 */
  pendingNote?: FolderPendingNote | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  function toggleConcept(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sortedCount = folders
    ? folders.reduce((n, c) => n + c.details.reduce((m, d) => m + d.photoIds.length, 0), 0)
    : 0;

  return (
    <div className="flex w-58 shrink-0 flex-col overflow-y-auto border-r border-divider-default bg-background-default-main px-3 py-4">
      <h2 className="mb-1.5 flex items-center justify-between px-1 type-label-semibold-xs text-contents-light-bgd-default">
        <span>컨셉 폴더</span>
        <span
          className={`font-normal ${
            folders !== null && folders.length === 0 && pendingNote
              ? "text-brand-secondary-dark"
              : "text-contents-light-bgd-weakness"
          }`}
        >
          {folders === null
            ? "…"
            : folders.length === 0
              ? pendingNote?.label ?? "없음"
              : `${folders.length} · ${sortedCount}장`}
        </span>
      </h2>

      {folders === null ? (
        <div className="flex flex-col gap-2 px-1 pt-1" aria-busy="true" aria-label="폴더 불러오는 중">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-3.5 animate-pulse rounded-(--radius-4) bg-surface-default-light" />
          ))}
        </div>
      ) : folders.length === 0 ? (
        <p className="px-1 pt-1 type-content-xs leading-relaxed text-contents-light-bgd-weakness">
          {pendingNote
            ? pendingNote.note
            : totalPhotos === 0
              ? "사진을 올리면 AI가 컨셉 · 세부 폴더로 나눠요"
              : "폴더는 업로드가 끝나면 AI가 만들어요"}
        </p>
      ) : (
        <ul className="flex flex-col">
          {folders.map((concept) => {
            const count = concept.details.reduce((n, d) => n + d.photoIds.length, 0);
            const closed = collapsed.has(concept.id);
            return (
              <li key={concept.id}>
                <button
                  type="button"
                  onClick={() => toggleConcept(concept.id)}
                  aria-expanded={!closed}
                  className="flex w-full cursor-pointer items-center gap-1 rounded-(--radius-4) px-1 py-1.5 text-left type-label-semibold-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
                >
                  <span
                    className={`flex shrink-0 text-contents-light-bgd-weakness transition-transform duration-fast ${
                      closed ? "-rotate-90" : ""
                    }`}
                  >
                    <DropdownIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{concept.name}</span>
                  <span className="type-content-xs font-normal text-contents-light-bgd-weakness">
                    {count}
                  </span>
                </button>
                {!closed && (
                  <ul>
                    {concept.details.map((detail) => {
                      const selected =
                        selection.kind === "detail" && selection.detailId === detail.id;
                      return (
                        <li key={detail.id}>
                          <button
                            type="button"
                            aria-current={selected || undefined}
                            onClick={() =>
                              onSelect({ kind: "detail", conceptId: concept.id, detailId: detail.id })
                            }
                            className={`flex w-full cursor-pointer items-center rounded-(--radius-4) py-1 pr-1 pl-7 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness ${
                              selected
                                ? "bg-surface-default-light font-semibold text-contents-light-bgd-default"
                                : "text-contents-light-bgd-sub"
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {detail.name}
                              {detail.needsReview && <ReviewBadge />}
                            </span>
                            <span className="type-content-xs text-contents-light-bgd-weakness">
                              {detail.photoIds.length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
          <li className="mt-1.5 border-t border-divider-default pt-1.5">
            <button
              type="button"
              aria-current={selection.kind === "unsorted" || undefined}
              onClick={() => onSelect({ kind: "unsorted" })}
              className={`flex w-full cursor-pointer items-center gap-1.5 rounded-(--radius-4) px-1 py-1.5 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness ${
                selection.kind === "unsorted"
                  ? "bg-surface-default-light font-semibold text-contents-light-bgd-default"
                  : "text-contents-light-bgd-sub"
              }`}
            >
              <span className="flex shrink-0 text-contents-light-bgd-weakness">
                <FolderOffIcon size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate">미분류</span>
              <span className="type-content-xs text-contents-light-bgd-weakness">{unsortedCount}</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
