"use client";

/**
 * 사이드바 폴더 트리 — 2단계(셀렉 대기)부터 폴더 열 대신 사이드바 안에 (디자이너 시안)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/SidebarFolderTree.tsx
 *
 * 컨셉은 작은 제목 + 선(접을 수 있음), 세부 폴더는 행. 세부 폴더마다 "고른 수 / 전체" —
 * 클라이언트가 어느 폴더에서 몇 장 골랐는지 한눈에.
 * 폴더 영역은 연한 패널 배경으로 묶어 내비(모든 사진 · 선택한 사진 · 보정 사진)와 면으로 구분한다
 * (2026-09-11 수민 선택 C, 디자이너 시안이 나오면 다시 손본다).
 */

import { useState } from "react";
import { ChevronRightIcon, DropdownIcon } from "@/components/icons";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { FolderSelection } from "./FolderColumn";

export function SidebarFolderTree({
  folders,
  pickedIds,
  selection,
  onSelect,
}: {
  folders: ConceptFolderResponse[];
  /** 클라이언트가 고른 사진 id — 폴더별 고른 수 계산 */
  pickedIds: Set<number>;
  selection: FolderSelection;
  onSelect: (selection: FolderSelection) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (folders.length === 0) return null;
  const detailCount = folders.reduce((n, c) => n + c.details.length, 0);

  return (
    <div className="flex flex-col rounded-(--radius-12) bg-surface-default-lightness px-1.5 pt-2 pb-1.5">
      <p className="flex items-center justify-between px-2 pb-0.5 type-label-semibold-xs text-contents-light-bgd-sub">
        컨셉 폴더
        <span className="font-normal text-contents-light-bgd-weakness">{detailCount}</span>
      </p>
      {folders.map((concept) => {
        const closed = collapsed.has(concept.id);
        return (
          <div key={concept.id}>
            <button
              type="button"
              aria-expanded={!closed}
              onClick={() => toggle(concept.id)}
              className="flex w-full cursor-pointer items-center gap-1.5 px-1.5 pt-3 pb-1 text-left type-content-xs text-contents-light-bgd-weakness"
            >
              <span className="flex shrink-0">
                {closed ? <ChevronRightIcon size={14} /> : <DropdownIcon size={14} />}
              </span>
              <span className="shrink-0">{concept.name}</span>
              <span aria-hidden className="ml-1 h-px flex-1 bg-border-default" />
            </button>
            {!closed && (
              <ul>
                {concept.details.map((detail) => {
                  const selected = selection.kind === "detail" && selection.detailId === detail.id;
                  const picked = detail.photoIds.filter((id) => pickedIds.has(id)).length;
                  return (
                    <li key={detail.id}>
                      <button
                        type="button"
                        aria-current={selected || undefined}
                        onClick={() =>
                          onSelect({ kind: "detail", conceptId: concept.id, detailId: detail.id })
                        }
                        className={`relative flex w-full cursor-pointer items-center gap-2 rounded-(--radius-8) py-2 pr-2.5 pl-3.5 text-left type-content-m transition-colors duration-fast hover:bg-surface-default-light ${
                          selected
                            ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-default before:content-['']"
                            : "text-contents-light-bgd-sub"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{detail.name}</span>
                        <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness tabular-nums">
                          {picked > 0 && (
                            <span className="font-semibold text-brand-secondary-dark">{picked}</span>
                          )}
                          {picked > 0 && " / "}
                          {detail.photoIds.length}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
