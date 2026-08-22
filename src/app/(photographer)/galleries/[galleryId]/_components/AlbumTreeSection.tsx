"use client";

/**
 * 사이드바 앨범(폴더) 트리 — 피그마 Item/AlbumTreeRow 대응 (이슈 #31)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/AlbumTreeSection.tsx
 *
 * GET folder-groups 응답 하나로 그린다: 앨범(부모) 행 > 폴더(자식) 행.
 * 폴더 클릭 = 열람, 이름 더블클릭 = 인라인 수정(Enter/포커스 아웃 확정,
 * Esc 취소 — 갤러리 제목과 같은 문법). 활성 폴더는 MenuItem selected와
 * 같은 옅은 배경 + 좌측 로즈 인디케이터. 삭제·사진 이동은 후속(WES-231).
 */

import { useState } from "react";
import { DropdownIcon } from "@/components/icons";
import { PanelHeader } from "@/components/ui/PanelHeader";
import type { PhotoFolderGroupResponse } from "@/lib/api/folders";
import type { FolderGroupsResult } from "../_lib/useFolderGroups";

type Editing =
  | { kind: "group"; groupId: number }
  | { kind: "folder"; groupId: number; folderId: number };

type AlbumTreeSectionProps = {
  result: FolderGroupsResult | null;
  /** 열람 중인 폴더 — "groupId:folderId" */
  activeKey: string | null;
  onSelectFolder: (groupId: number, folderId: number) => void;
  onRenameGroup: (groupId: number, name: string) => void;
  onRenameFolder: (groupId: number, folderId: number, name: string) => void;
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
        className="h-7 w-full rounded-(--radius-4) border border-fg-neutral bg-bg-layer-default px-2 type-body-medium text-fg-neutral outline-none"
      />
    </div>
  );
}

export function AlbumTreeSection({
  result,
  activeKey,
  onSelectFolder,
  onRenameGroup,
  onRenameFolder,
}: AlbumTreeSectionProps) {
  // 접힌 앨범 groupId 집합 — 기본은 모두 펼침
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const [editing, setEditing] = useState<Editing | null>(null);

  function toggle(groupId: number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
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
          <button
            type="button"
            onClick={() => toggle(group.groupId)}
            onDoubleClick={() =>
              setEditing({ kind: "group", groupId: group.groupId })
            }
            aria-expanded={open}
            className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-3 py-2 text-left transition-colors duration-fast hover:bg-bg-layer-default-hover"
          >
            <DropdownIcon
              size={16}
              className={`shrink-0 text-fg-neutral-muted transition-transform duration-fast ${open ? "" : "-rotate-90"}`}
            />
            <span className="min-w-0 flex-1 truncate type-body-medium text-fg-neutral">
              {group.name}
            </span>
            <span className="shrink-0 type-body-small text-fg-neutral-muted">
              {total}
            </span>
          </button>
        )}

        {open &&
          group.folders.map((folder) => {
            const key = `${group.groupId}:${folder.folderId}`;
            const active = activeKey === key;
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
              <button
                key={folder.folderId}
                type="button"
                onClick={() => onSelectFolder(group.groupId, folder.folderId)}
                onDoubleClick={() =>
                  setEditing({
                    kind: "folder",
                    groupId: group.groupId,
                    folderId: folder.folderId,
                  })
                }
                aria-current={active || undefined}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) py-2 pr-3 pl-9 text-left transition-colors duration-fast hover:bg-bg-layer-default-hover ${
                  active
                    ? "bg-bg-layer-default-hover relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-(--pill) before:bg-bg-accent-solid"
                    : ""
                }`}
              >
                <span className="size-5.5 shrink-0 overflow-hidden rounded-(--radius-4) bg-bg-disabled">
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
                <span className="min-w-0 flex-1 truncate type-body-medium text-fg-neutral">
                  {folder.name}
                </span>
                <span className="shrink-0 type-body-small text-fg-neutral-muted">
                  {folder.photoCount}
                </span>
              </button>
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
          <span className="h-9 w-full rounded-(--radius-4) bg-bg-disabled" />
          <span className="h-9 w-full rounded-(--radius-4) bg-bg-disabled" />
        </div>
      ) : result.kind === "error" ? (
        <p className="px-3 type-body-small text-fg-neutral-muted">
          앨범을 불러오지 못했어요.
        </p>
      ) : result.groups.length === 0 ? (
        <p className="px-3 type-body-small text-fg-neutral-muted">
          자동 분류로 앨범을 만들면 여기에 보여요
        </p>
      ) : (
        result.groups.map(renderGroup)
      )}
    </div>
  );
}
