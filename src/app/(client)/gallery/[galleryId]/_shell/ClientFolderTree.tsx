"use client";

/**
 * 클라이언트 2단계 폴더 트리 — 사이드바 "폴더" 탭 (2026-09-12 확정)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ClientFolderTree.tsx
 *
 * 작가 사이드바 트리(SidebarFolderTree)와 같은 생김새에 **체크박스**가 붙는다.
 * 이름을 누르면 그 폴더만 보고, 체크하면 여러 폴더를 겹쳐 본다(필터). 세부 폴더마다 "고른 수 / 전체".
 * 맨 아래 미분류도 같은 문법. 모두 풀면 "모든 사진"(내비 행이 그 역할).
 */

import { useState } from "react";
import { ChevronRightIcon, DropdownIcon, FolderOffIcon } from "@/components/icons";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";

/** 그리드에 보일 사진 범위 — 비어 있고 unsorted=false면 모든 사진 */
export type PhotoFilter = { detailIds: ReadonlySet<number>; unsorted: boolean };
export const ALL_FILTER: PhotoFilter = { detailIds: new Set(), unsorted: false };
export const isAllFilter = (f: PhotoFilter) => f.detailIds.size === 0 && !f.unsorted;

export type FolderKey = number | "unsorted";

function Checkbox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${label} 겹쳐 보기`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`grid size-3.5 shrink-0 cursor-pointer place-items-center rounded-(--radius-4) border transition-colors duration-fast ${
        checked
          ? "border-contents-light-bgd-default bg-contents-light-bgd-default text-contents-dark-bgd-default"
          : "border-border-default bg-transparent hover:border-contents-light-bgd-sub"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5 6.5 11.5 12.5 5" />
        </svg>
      )}
    </button>
  );
}

function Row({
  name,
  picked,
  total,
  focused,
  checked,
  onFocus,
  onToggle,
  icon,
}: {
  name: string;
  picked: number;
  total: number;
  focused: boolean;
  checked: boolean;
  onFocus: () => void;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={focused || undefined}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocus();
        }
      }}
      className={`relative flex w-full cursor-pointer items-center gap-2 rounded-(--radius-8) py-2 pr-2.5 pl-2 text-left type-content-m transition-colors duration-fast hover:bg-surface-default-light ${
        focused
          ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-default before:content-['']"
          : "text-contents-light-bgd-sub"
      }`}
    >
      <Checkbox checked={checked} label={name} onToggle={onToggle} />
      {icon}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness tabular-nums">
        {picked > 0 && <span className="font-semibold text-brand-secondary-dark">{picked}</span>}
        {picked > 0 && " / "}
        {total}
      </span>
    </div>
  );
}

export function ClientFolderTree({
  folders,
  pickedIds,
  unsortedIds,
  filter,
  onFocus,
  onToggle,
}: {
  folders: ConceptFolderResponse[];
  /** 고른 사진 id — 폴더별 고른 수 */
  pickedIds: ReadonlySet<number>;
  /** 어느 폴더에도 없는 사진 id */
  unsortedIds: ReadonlySet<number>;
  filter: PhotoFilter;
  /** 이름 클릭 — 그 폴더만 보기 */
  onFocus: (key: FolderKey) => void;
  /** 체크 — 겹쳐 보기 토글 */
  onToggle: (key: FolderKey) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  function toggleCollapse(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const single = filter.detailIds.size === 1 && !filter.unsorted ? [...filter.detailIds][0] : null;
  const unsortedOnly = filter.detailIds.size === 0 && filter.unsorted;
  const detailCount = folders.reduce((n, c) => n + c.details.length, 0);
  const unsortedPicked = [...unsortedIds].filter((id) => pickedIds.has(id)).length;

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
              onClick={() => toggleCollapse(concept.id)}
              className="flex w-full cursor-pointer items-center gap-1.5 px-1.5 pt-3 pb-1 text-left type-content-xs text-contents-light-bgd-weakness"
            >
              <span className="flex shrink-0">{closed ? <ChevronRightIcon size={14} /> : <DropdownIcon size={14} />}</span>
              <span className="shrink-0">{concept.name}</span>
              <span aria-hidden className="ml-1 h-px flex-1 bg-border-default" />
            </button>
            {!closed && (
              <ul>
                {concept.details.map((detail) => (
                  <li key={detail.id}>
                    <Row
                      name={detail.name}
                      picked={detail.photoIds.filter((id) => pickedIds.has(id)).length}
                      total={detail.photoIds.length}
                      focused={single === detail.id}
                      checked={filter.detailIds.has(detail.id)}
                      onFocus={() => onFocus(detail.id)}
                      onToggle={() => onToggle(detail.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {unsortedIds.size > 0 && (
        <div className="mt-2 border-t border-divider-default pt-1.5">
          <Row
            name="미분류"
            picked={unsortedPicked}
            total={unsortedIds.size}
            focused={unsortedOnly}
            checked={filter.unsorted}
            onFocus={() => onFocus("unsorted")}
            onToggle={() => onToggle("unsorted")}
            icon={
              <span className="flex shrink-0 text-contents-light-bgd-weakness">
                <FolderOffIcon size={16} />
              </span>
            }
          />
        </div>
      )}
      <p className="px-2 pt-2 pb-0.5 type-content-xs text-contents-light-bgd-weakness">체크하면 여러 폴더를 겹쳐 볼 수 있어요.</p>
    </div>
  );
}
