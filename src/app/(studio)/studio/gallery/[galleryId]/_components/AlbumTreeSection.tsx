"use client";

/**
 * 사이드바 앨범(폴더) 트리 — 피그마 Item/AlbumTreeRow 대응 (이슈 #31)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_components/AlbumTreeSection.tsx
 *
 * GET folder-groups 응답 하나로 그린다: 앨범(부모) 행 > 폴더(자식) 행.
 * - 폴더 클릭 = 열람, 이름 더블클릭 = 인라인 수정(행 호버 ⋯ 메뉴에도 같은 항목)
 * - ⋯ 메뉴 = 이름 바꾸기 · 삭제 (피그마 Menu/Context target=folder)
 * - 드래그 중이면 같은 앨범의 다른 폴더 행이 점선(kind=child-drop)으로
 *   반응하고, 놓으면 선택 사진이 그 폴더로 이동한다.
 * 활성 폴더는 MenuItem selected와 같은 옅은 배경 + 좌측 로즈 인디케이터.
 */

import { useEffect, useRef, useState } from "react";
import { DropdownIcon, MoreIcon } from "@/components/icons";
import { PanelHeader } from "@/components/ui/PanelHeader";
import type { PhotoFolderGroupResponse } from "@/lib/api/folders";
import type { FolderGroupsResult } from "../_lib/useFolderGroups";

type Editing =
  | { kind: "group"; groupId: number }
  | { kind: "folder"; groupId: number; folderId: number };

type MenuFor =
  | { kind: "group"; groupId: number }
  | { kind: "folder"; groupId: number; folderId: number };

type AlbumTreeSectionProps = {
  result: FolderGroupsResult | null;
  /** 열람 중인 폴더 — "groupId:folderId" */
  activeKey: string | null;
  /** 폴더 사진 드래그 중 — 출발지. 같은 앨범의 다른 폴더만 드롭 대상이 된다. */
  dragContext: { groupId: number; folderId: number } | null;
  /**
   * 편집 잠금(부부: 마감·기한 초과) — ⋯ 메뉴·이름 더블클릭·드롭이 나타나지
   * 않는다(시안 A안: 회색이 아니라 숨김). 탐색·열람은 그대로.
   */
  readOnly?: boolean;
  onSelectFolder: (groupId: number, folderId: number) => void;
  onRenameGroup: (groupId: number, name: string) => void;
  onRenameFolder: (groupId: number, folderId: number, name: string) => void;
  onDeleteGroup: (groupId: number, name: string) => void;
  onDeleteFolder: (groupId: number, folderId: number, name: string) => void;
  /** 드롭 완료 — 선택 사진을 folderId로 이동 */
  onDropPhotos: (folderId: number) => void;
};

/** 인라인 이름 입력 — 행 전체를 입력창으로 바꾼다 (버튼 안에 인풋을 넣지 않기 위함) */
function RenameRow({
  initial,
  indentClassName,
  onCommit,
  onCancel,
}: {
  initial: string;
  indentClassName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);

  function commit() {
    const name = draft.trim();
    if (name && name !== initial) onCommit(name);
    else onCancel();
  }

  return (
    <div className={`flex w-full items-center py-1 pr-3 ${indentClassName}`}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        aria-label="이름 수정"
        className="h-7 w-full rounded-(--radius-4) border border-contents-light-bgd-default bg-background-default-main px-2 type-content-m text-contents-light-bgd-default outline-none"
      />
    </div>
  );
}

export function AlbumTreeSection({
  result,
  activeKey,
  dragContext,
  readOnly = false,
  onSelectFolder,
  onRenameGroup,
  onRenameFolder,
  onDeleteGroup,
  onDeleteFolder,
  onDropPhotos,
}: AlbumTreeSectionProps) {
  // 접힌 앨범 groupId 집합 — 기본은 모두 펼침
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const [editing, setEditing] = useState<Editing | null>(null);
  const [menuFor, setMenuFor] = useState<MenuFor | null>(null);
  const [dropFolderId, setDropFolderId] = useState<number | null>(null);

  // ⋯ 메뉴 — 바깥을 누르면 닫힘. stopPropagation은 document에 단
  // 리스너를 막지 못하므로(리액트 루트도 document) 포함 여부로 판별한다.
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (menuFor === null) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuFor]);

  function toggle(groupId: number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function menuMatches(target: MenuFor) {
    if (menuFor === null || menuFor.kind !== target.kind) return false;
    if (menuFor.groupId !== target.groupId) return false;
    return menuFor.kind === "group" || target.kind === "group"
      ? menuFor.kind === "group" && target.kind === "group"
      : menuFor.folderId === target.folderId;
  }

  /** 행 우측 ⋯ 버튼 + 펼침 메뉴 (이름 바꾸기 · 삭제) */
  function rowMenu(target: MenuFor, onRename: () => void, onDelete: () => void) {
    const open = menuMatches(target);
    return (
      <>
        <button
          type="button"
          aria-label="메뉴 열기"
          onClick={(e) => {
            e.stopPropagation();
            setMenuFor(open ? null : target);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-(--radius-4) bg-surface-default-lightness text-contents-light-bgd-sub transition-opacity duration-fast hover:text-contents-light-bgd-default focus-visible:opacity-100 ${
            open ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
          }`}
        >
          <MoreIcon size={16} />
        </button>
        {open && (
          <div
            ref={menuRef}
            role="menu"
            className="absolute top-full right-1.5 z-40 w-36 rounded-(--radius-12) border border-divider-default bg-background-default-main p-1.5 shadow-(--shadow-hover)"
          >
            <button
              type="button"
              onClick={() => {
                setMenuFor(null);
                onRename();
              }}
              className="block w-full cursor-pointer rounded-(--radius-4) px-3 py-1.5 text-left type-content-m text-contents-light-bgd-default hover:bg-surface-default-lightness"
            >
              이름 바꾸기
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuFor(null);
                onDelete();
              }}
              className="block w-full cursor-pointer rounded-(--radius-4) px-3 py-1.5 text-left type-content-m text-function-error-default hover:bg-surface-default-lightness"
            >
              삭제
            </button>
          </div>
        )}
      </>
    );
  }

  function renderGroup(group: PhotoFolderGroupResponse) {
    const open = !collapsedIds.has(group.groupId);
    const total = group.folders.reduce((sum, f) => sum + f.photoCount, 0);
    const editingGroup =
      editing?.kind === "group" && editing.groupId === group.groupId;

    return (
      <div key={group.groupId} className="flex w-full flex-col gap-0.5">
        {editingGroup ? (
          <RenameRow
            initial={group.name}
            indentClassName="pl-3"
            onCommit={(name) => {
              setEditing(null);
              onRenameGroup(group.groupId, name);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div className="group/row relative">
            <button
              type="button"
              onClick={() => toggle(group.groupId)}
              onDoubleClick={
                readOnly
                  ? undefined
                  : () => setEditing({ kind: "group", groupId: group.groupId })
              }
              aria-expanded={open}
              className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) py-2 pr-8 pl-3 text-left transition-colors duration-fast hover:bg-surface-default-lightness"
            >
              <DropdownIcon
                size={16}
                className={`shrink-0 text-contents-light-bgd-sub transition-transform duration-fast ${open ? "" : "-rotate-90"}`}
              />
              <span className="min-w-0 flex-1 truncate type-content-m text-contents-light-bgd-default">
                {group.name}
              </span>
              <span className="shrink-0 type-content-xs text-contents-light-bgd-sub">
                {total}
              </span>
            </button>
            {!readOnly &&
              rowMenu(
                { kind: "group", groupId: group.groupId },
                () => setEditing({ kind: "group", groupId: group.groupId }),
                () => onDeleteGroup(group.groupId, group.name),
              )}
          </div>
        )}

        {open &&
          group.folders.map((folder) => {
            const key = `${group.groupId}:${folder.folderId}`;
            const active = activeKey === key;
            const droppable =
              !readOnly &&
              dragContext !== null &&
              dragContext.groupId === group.groupId &&
              dragContext.folderId !== folder.folderId;
            const dropping = droppable && dropFolderId === folder.folderId;
            const editingFolder =
              editing?.kind === "folder" &&
              editing.groupId === group.groupId &&
              editing.folderId === folder.folderId;
            if (editingFolder) {
              return (
                <RenameRow
                  key={folder.folderId}
                  initial={folder.name}
                  indentClassName="pl-9"
                  onCommit={(name) => {
                    setEditing(null);
                    onRenameFolder(group.groupId, folder.folderId, name);
                  }}
                  onCancel={() => setEditing(null)}
                />
              );
            }
            return (
              <div key={folder.folderId} className="group/row relative">
                <button
                  type="button"
                  onClick={() => onSelectFolder(group.groupId, folder.folderId)}
                  onDoubleClick={
                    readOnly
                      ? undefined
                      : () =>
                          setEditing({
                            kind: "folder",
                            groupId: group.groupId,
                            folderId: folder.folderId,
                          })
                  }
                  onDragOver={(e) => {
                    if (!droppable) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropFolderId(folder.folderId);
                  }}
                  onDragLeave={() => {
                    if (dropping) setDropFolderId(null);
                  }}
                  onDrop={(e) => {
                    if (!droppable) return;
                    e.preventDefault();
                    setDropFolderId(null);
                    onDropPhotos(folder.folderId);
                  }}
                  aria-current={active || undefined}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) py-2 pr-8 pl-9 text-left transition-colors duration-fast hover:bg-surface-default-lightness ${
                    active
                      ? "bg-surface-default-lightness relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-(--pill) before:bg-brand-secondary-light"
                      : ""
                  } ${dropping ? "bg-surface-default-lightness outline-2 outline-dashed -outline-offset-2 outline-contents-light-bgd-default" : ""}`}
                >
                  <span className="size-5.5 shrink-0 overflow-hidden rounded-(--radius-4) bg-surface-default-light">
                    {folder.coverPhoto?.viewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={folder.coverPhoto.viewUrl}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate type-content-m text-contents-light-bgd-default">
                    {folder.name}
                  </span>
                  <span className="shrink-0 type-content-xs text-contents-light-bgd-sub">
                    {folder.photoCount}
                  </span>
                </button>
                {!readOnly &&
                  rowMenu(
                    {
                      kind: "folder",
                      groupId: group.groupId,
                      folderId: folder.folderId,
                    },
                    () =>
                      setEditing({
                        kind: "folder",
                        groupId: group.groupId,
                        folderId: folder.folderId,
                      }),
                    () =>
                      onDeleteFolder(
                        group.groupId,
                        folder.folderId,
                        folder.name,
                      ),
                  )}
              </div>
            );
          })}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <PanelHeader>앨범</PanelHeader>

      {result === null ? (
        // 목록 조회 중 — 정적 스켈레톤 행
        <div className="flex w-full flex-col gap-1" aria-hidden>
          <span className="h-9 w-full rounded-(--radius-4) bg-surface-default-light" />
          <span className="h-9 w-full rounded-(--radius-4) bg-surface-default-light" />
        </div>
      ) : result.kind === "error" ? (
        <p className="px-3 type-content-xs text-contents-light-bgd-sub">
          앨범을 불러오지 못했어요.
        </p>
      ) : result.groups.length === 0 ? (
        <p className="px-3 type-content-xs text-contents-light-bgd-sub">
          자동 분류로 앨범을 만들면 여기에 보여요
        </p>
      ) : (
        result.groups.map(renderGroup)
      )}
    </div>
  );
}
