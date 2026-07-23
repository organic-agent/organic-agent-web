"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalFrame } from "@/components/ui/ModalFrame";
import type { CollabFolder } from "@/lib/couple";

type CopyState = "idle" | "copied" | "failed";

type Props = {
  folders: CollabFolder[];
  initialSelectedFolderIds?: string[];
  shareCode: string;
  expiresIn: string;
  onClose: () => void;
};

export function CollaborationShareModal({
  folders,
  initialSelectedFolderIds = [],
  shareCode,
  expiresIn,
  onClose,
}: Props) {
  const [selectedFolderIds, setSelectedFolderIds] = useState(
    () => new Set(initialSelectedFolderIds),
  );
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const selectedFolders = useMemo(
    () => folders.filter((folder) => selectedFolderIds.has(folder.id)),
    [folders, selectedFolderIds],
  );
  const allSelected =
    folders.length > 0 && selectedFolderIds.size === folders.length;
  const shareUrl = useMemo(() => {
    if (selectedFolders.length === 0) return "";
    if (selectedFolders.length === 1) {
      return `https://www.easyselect.kr/collaboration/${selectedFolders[0].id}`;
    }
    const folderIds = selectedFolders.map((folder) => folder.id).join(",");
    return `https://www.easyselect.kr/collaboration/shared?folders=${encodeURIComponent(folderIds)}`;
  }, [selectedFolders]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  function toggleFolder(folderId: string) {
    setSelectedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
    setCopyState("idle");
  }

  function toggleAll() {
    setSelectedFolderIds(
      allSelected ? new Set() : new Set(folders.map((folder) => folder.id)),
    );
    setCopyState("idle");
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <ModalFrame
      onClose={onClose}
      title="협업 폴더 공유"
      desc="가족·지인에게 함께 보여줄 폴더를 선택해 링크로 공유해요."
      maxWidthClassName="max-w-[560px]"
    >
      <div className="mb-5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium text-ink-2">공유할 폴더</p>
            <span className="text-[11px] text-ink-3">
              {selectedFolderIds.size}개 선택
            </span>
          </div>
          {folders.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-[12px] text-ink-3 hover:text-ink transition-colors"
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
          )}
        </div>

        <div className="max-h-[224px] overflow-y-auto rounded-lg border border-line divide-y divide-line">
          {folders.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-3">
              공유할 협업 폴더가 없어요.
            </p>
          ) : (
            folders.map((folder) => {
              const selected = selectedFolderIds.has(folder.id);
              return (
                <label
                  key={folder.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                    selected ? "bg-paper" : "bg-white hover:bg-paper-deep"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleFolder(folder.id)}
                    className="h-4 w-4 rounded border-line accent-ink"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {folder.name}
                    </span>
                    {folder.memo && (
                      <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                        {folder.memo}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-3">
                    사진 {folder.photos.length}장
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div
          className={`flex-1 h-11 px-3.5 rounded-md border border-line bg-paper-deep flex items-center font-mono text-[12px] truncate ${
            shareUrl ? "text-ink-2" : "text-ink-3"
          }`}
        >
          {shareUrl || "공유할 폴더를 하나 이상 선택해주세요."}
        </div>
        <button
          type="button"
          onClick={copyShareLink}
          disabled={!shareUrl}
          className="h-11 min-w-[72px] px-4 rounded-md bg-ink text-on-ink text-[13px] font-medium hover:bg-[#333] transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
        >
          {copyState === "copied" ? "복사됨" : "복사"}
        </button>
      </div>
      {copyState === "failed" && (
        <p className="text-[12px] text-danger mb-3">
          복사에 실패했어요. 링크를 직접 선택해서 복사해주세요.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="rounded-lg border border-line bg-paper-deep px-4 py-3">
          <p className="text-[11px] font-medium text-ink-3 mb-1">공유 코드</p>
          <p className="font-mono text-[22px] font-semibold tracking-[0.18em] text-ink">
            {shareCode}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-paper-deep px-4 py-3">
          <p className="text-[11px] font-medium text-ink-3 mb-1">링크 만료</p>
          <p className="text-[15px] font-semibold text-accent-press">
            {expiresIn}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
        >
          닫기
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={!shareUrl}
          className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          카카오톡으로 보내기
        </button>
      </div>
    </ModalFrame>
  );
}
