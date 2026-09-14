"use client";

/**
 * 폴더 열 — 컨셉 › 세부 폴더 트리 (1단계 사진 업로드에서만 3열로 붙는다)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/FolderColumn.tsx
 *
 * 세부 폴더의 needsReview는 "검토" 배지(서버가 지우는 방법이 없는 영구 배지), 어느 폴더에도 없는 사진은 맨 아래 "미분류".
 * 편집(1단계 보드 확정): 머리의 "컨셉 폴더 추가", 행에 마우스를 올리면 숫자 자리에 케밥 —
 * 컨셉: 세부 폴더 추가 · 폴더 삭제 / 세부: 검토 완료(배지 감춤, 브라우저 기억) · 폴더 삭제.
 * 이름 바꾸기는 서버 API가 없어 두지 않는다(백엔드 요청 항목). 편집 핸들러를 안 주면 읽기 전용이다.
 * 맨 위 "모든 사진" 행으로 폴더에서 빠져나오고, 컨셉 이름을 누르면 그 컨셉의 사진 전체를 본다(2026-09-11 피드백).
 * 사진을 끌고 오면(dropping) 놓을 수 있는 곳(세부 폴더 · 미분류, 지금 보고 있는 폴더는 빼고)만 점선으로 남고
 * 나머지(모든 사진 · 컨셉 헤더)는 흐려진다. 접힌 컨셉 위에 0.6초 머물면 펼친다 — 2026-09-14 확정.
 */

import { useEffect, useRef, useState } from "react";
import {
  CheckCircleIcon,
  CreateFolderIcon,
  DropdownIcon,
  FolderOffIcon,
  MoreVertIcon,
  PhotoIcon,
  TrashIcon,
} from "@/components/icons";
import type { ConceptFolderResponse, DetailFolderResponse } from "@/lib/api/conceptFolders";

export type FolderSelection =
  | { kind: "all" }
  | { kind: "concept"; conceptId: number }
  | { kind: "detail"; conceptId: number; detailId: number }
  | { kind: "unsorted" };

/** 사진을 끌어 놓을 수 있는 곳 — concept는 놓는 곳이 아니라 "머물면 펼친다" */
export type FolderDropTarget =
  | { kind: "detail"; id: number }
  | { kind: "unsorted" }
  | { kind: "concept"; id: number };

export type FolderPendingNote = {
  /** 머리 오른쪽 짧은 상태 — "대기" · "만드는 중…" */
  label: string;
  /** 본문 안내 한두 문장 */
  note: string;
};

type MenuTarget =
  | { kind: "concept"; concept: ConceptFolderResponse }
  | { kind: "detail"; concept: ConceptFolderResponse; detail: DetailFolderResponse };

/** 끌고 오는 중의 행 모양 — 놓을 수 있으면 점선(올라와 있으면 굵게), 아니면 흐림 */
function dropClass(dropping: boolean, droppable: boolean, over: boolean | undefined) {
  if (!dropping) return "";
  if (!droppable) return "opacity-40";
  return over
    ? "bg-brand-secondary-background outline-2 -outline-offset-2 outline-dashed outline-brand-secondary-default"
    : "outline-1 -outline-offset-1 outline-dashed outline-border-default";
}

export function ReviewBadge() {
  return (
    <span
      data-coach="review"
      className="ml-1.5 rounded-(--pill) bg-function-warning-background px-1.5 py-px type-label-semibold-xs text-function-warning-default"
    >
      검토
    </span>
  );
}

export function FolderColumn({
  folders,
  totalPhotos,
  unsortedCount,
  selection,
  onSelect,
  pendingNote = null,
  onCreateConcept,
  onCreateDetail,
  onDeleteConcept,
  onDeleteDetail,
  reviewedIds,
  onMarkReviewed,
  onUnmarkReviewed,
  dropping = false,
  dropOver = null,
}: {
  /** null = 불러오는 중 */
  folders: ConceptFolderResponse[] | null;
  totalPhotos: number;
  unsortedCount: number;
  selection: FolderSelection;
  onSelect: (selection: FolderSelection) => void;
  /** 폴더가 아직 없을 때 AI 진행 상태(업로드 · 분석 중) — 없으면 기본 안내 */
  pendingNote?: FolderPendingNote | null;
  onCreateConcept?: () => void;
  onCreateDetail?: (concept: ConceptFolderResponse) => void;
  onDeleteConcept?: (concept: ConceptFolderResponse) => void;
  onDeleteDetail?: (concept: ConceptFolderResponse, detail: DetailFolderResponse) => void;
  /** 이 브라우저에서 "검토 완료"로 표시한 세부 폴더 id — 배지는 감춰져 있고 되살리기 메뉴가 뜬다 */
  reviewedIds?: Set<number>;
  onMarkReviewed?: (detail: DetailFolderResponse) => void;
  onUnmarkReviewed?: (detail: DetailFolderResponse) => void;
  /** 사진을 끌고 오는 중 — 놓을 수 있는 곳만 또렷하게 */
  dropping?: boolean;
  /** 지금 올라와 있는 곳 */
  dropOver?: FolderDropTarget | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editable = Boolean(onCreateDetail || onDeleteConcept || onDeleteDetail);

  useEffect(() => {
    if (!menu) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  useEffect(() => {
    if (!dropOver || dropOver.kind !== "concept") return;
    const id = dropOver.id;
    if (!collapsed.has(id)) return;
    const timer = window.setTimeout(() => {
      setCollapsed((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [dropOver, collapsed]);

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

  function menuOpenFor(target: MenuTarget) {
    return (
      menu !== null &&
      menu.kind === target.kind &&
      menu.concept.id === target.concept.id &&
      (target.kind === "concept" || (menu.kind === "detail" && menu.detail.id === target.detail.id))
    );
  }

  /** 숫자 자리 — 평소엔 장수, 편집 가능하면 호버 · 포커스 · 메뉴 열림에 케밥 (컴포넌트가 아닌 렌더 함수 — 리마운트 방지) */
  function renderTrailing(count: number, target: MenuTarget) {
    const open = menuOpenFor(target);
    if (!editable) {
      return <span className="type-content-xs font-normal text-contents-light-bgd-weakness">{count}</span>;
    }
    return (
      <span className="relative flex h-6 w-7 shrink-0 items-center justify-end">
        <span
          className={`type-content-xs font-normal text-contents-light-bgd-weakness transition-opacity duration-fast group-hover:opacity-0 group-focus-within:opacity-0 ${
            open ? "opacity-0" : ""
          }`}
        >
          {count}
        </span>
        <button
          type="button"
          aria-label="폴더 메뉴"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setMenu(open ? null : target);
          }}
          className={`absolute inset-y-0 right-0 grid w-6 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-sub transition-opacity duration-fast hover:bg-surface-default-light hover:text-contents-light-bgd-default focus-visible:opacity-100 group-hover:opacity-100 ${
            open ? "opacity-100 bg-surface-default-light" : "opacity-0"
          }`}
        >
          <MoreVertIcon size={16} />
        </button>
      </span>
    );
  }

  function renderMenu(target: MenuTarget) {
    if (!menuOpenFor(target)) return null;
    return (
      <div
        ref={menuRef}
        role="menu"
        className="absolute top-full right-1 z-20 mt-0.5 flex w-40 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover)"
      >
        {target.kind === "concept" && onCreateDetail && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(null);
              onCreateDetail(target.concept);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-2.5 py-2 text-left type-content-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
          >
            <span className="flex text-contents-light-bgd-sub">
              <CreateFolderIcon size={16} />
            </span>
            세부 폴더 추가
          </button>
        )}
        {target.kind === "detail" && target.detail.needsReview && onMarkReviewed && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(null);
              onMarkReviewed(target.detail);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-2.5 py-2 text-left type-content-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
          >
            <span className="flex text-brand-secondary-dark">
              <CheckCircleIcon size={16} />
            </span>
            검토 완료
          </button>
        )}
        {target.kind === "detail" &&
          !target.detail.needsReview &&
          reviewedIds?.has(target.detail.id) &&
          onUnmarkReviewed && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                onUnmarkReviewed(target.detail);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-2.5 py-2 text-left type-content-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
            >
              <span className="flex text-contents-light-bgd-sub">
                <CheckCircleIcon size={16} />
              </span>
              검토 표시 되살리기
            </button>
          )}
        {((target.kind === "concept" && onDeleteConcept) || (target.kind === "detail" && onDeleteDetail)) && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(null);
              if (target.kind === "concept") onDeleteConcept?.(target.concept);
              else onDeleteDetail?.(target.concept, target.detail);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-2.5 py-2 text-left type-content-s text-function-error-default transition-colors duration-fast hover:bg-function-error-background"
          >
            <span className="flex">
              <TrashIcon size={16} />
            </span>
            폴더 삭제
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-folder-scroll
      className="scrollbar-slim flex w-58 shrink-0 flex-col overflow-y-auto border-r border-divider-default bg-background-default-main px-3 py-4"
    >
      <h2 className="mb-1.5 flex h-6 items-center justify-between px-1 type-label-semibold-xs text-contents-light-bgd-default">
        <span>컨셉 폴더</span>
        <span className="flex items-center gap-1">
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
          {onCreateConcept && folders !== null && (
            <button
              type="button"
              aria-label="컨셉 폴더 추가"
              title="컨셉 폴더 추가"
              onClick={onCreateConcept}
              className="grid size-6 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-light hover:text-contents-light-bgd-default"
            >
              <CreateFolderIcon size={16} />
            </button>
          )}
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
          <li className="mb-1.5 border-b border-divider-default pb-1.5">
            <button
              type="button"
              aria-current={selection.kind === "all" || undefined}
              onClick={() => onSelect({ kind: "all" })}
              className={`flex w-full cursor-pointer items-center gap-1.5 rounded-(--radius-4) px-1 py-1.5 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness ${
                selection.kind === "all"
                  ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default"
                  : "text-contents-light-bgd-sub"
              } ${dropping ? "opacity-40" : ""}`}
            >
              <span className="flex shrink-0 text-contents-light-bgd-weakness">
                <PhotoIcon size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate">모든 사진</span>
              <span className="type-content-xs text-contents-light-bgd-weakness">{totalPhotos}</span>
            </button>
          </li>
          {folders.map((concept) => {
            const count = concept.details.reduce((n, d) => n + d.photoIds.length, 0);
            const closed = collapsed.has(concept.id);
            const conceptSelected = selection.kind === "concept" && selection.conceptId === concept.id;
            const conceptTarget: MenuTarget = { kind: "concept", concept };
            return (
              <li key={concept.id}>
                <div
                  data-drop={dropping && closed ? `concept:${concept.id}` : undefined}
                  className={`group relative flex items-center rounded-(--radius-4) pr-1 transition-colors duration-fast hover:bg-surface-default-lightness ${
                    conceptSelected ? "bg-brand-secondary-background" : ""
                  } ${dropping ? "opacity-40" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleConcept(concept.id)}
                    aria-expanded={!closed}
                    aria-label={closed ? `${concept.name} 펼치기` : `${concept.name} 접기`}
                    className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-weakness hover:bg-surface-default-light"
                  >
                    <span className={`flex transition-transform duration-fast ${closed ? "-rotate-90" : ""}`}>
                      <DropdownIcon size={16} />
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-current={conceptSelected || undefined}
                    onClick={() => onSelect({ kind: "concept", conceptId: concept.id })}
                    className="flex min-w-0 flex-1 cursor-pointer items-center py-1.5 pr-1 text-left type-label-semibold-s text-contents-light-bgd-default"
                  >
                    <span className="min-w-0 flex-1 truncate">{concept.name}</span>
                  </button>
                  {renderTrailing(count, conceptTarget)}
                  {renderMenu(conceptTarget)}
                </div>
                {!closed && (
                  <ul>
                    {concept.details.map((detail) => {
                      const selected = selection.kind === "detail" && selection.detailId === detail.id;
                      const detailTarget: MenuTarget = { kind: "detail", concept, detail };
                      // 지금 보고 있는 폴더엔 놓을 수 없다(그 폴더 사진을 끌고 온 것이므로)
                      const droppable = dropping && !selected;
                      const over = droppable && dropOver?.kind === "detail" && dropOver.id === detail.id;
                      return (
                        <li key={detail.id}>
                          <div
                            data-drop={droppable ? `detail:${detail.id}` : undefined}
                            className={`group relative flex items-center rounded-(--radius-4) pr-1 transition-colors duration-fast hover:bg-surface-default-lightness ${
                              selected ? "bg-brand-secondary-background" : ""
                            } ${dropClass(dropping, droppable, over)}`}
                          >
                            <button
                              type="button"
                              aria-current={selected || undefined}
                              onClick={() =>
                                onSelect({ kind: "detail", conceptId: concept.id, detailId: detail.id })
                              }
                              className={`flex min-w-0 flex-1 cursor-pointer items-center py-1 pr-1 pl-7 text-left type-content-s ${
                                selected
                                  ? "font-semibold text-contents-light-bgd-default"
                                  : "text-contents-light-bgd-sub"
                              }`}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {detail.name}
                                {detail.needsReview && <ReviewBadge />}
                              </span>
                            </button>
                            {renderTrailing(detail.photoIds.length, detailTarget)}
                            {renderMenu(detailTarget)}
                          </div>
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
              data-coach="unsorted"
              data-drop={dropping && selection.kind !== "unsorted" ? "unsorted" : undefined}
              onClick={() => onSelect({ kind: "unsorted" })}
              className={`flex w-full cursor-pointer items-center gap-1.5 rounded-(--radius-4) px-1 py-1.5 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness ${
                selection.kind === "unsorted"
                  ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default"
                  : "text-contents-light-bgd-sub"
              } ${dropClass(dropping, dropping && selection.kind !== "unsorted", dropping && dropOver?.kind === "unsorted")}`}
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
