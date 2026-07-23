"use client";

import { useState } from "react";

type Props = {
  folderName: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function RenameFolderModal({ folderName, onClose, onSave }: Props) {
  const [name, setName] = useState(folderName);
  const canSave = name.trim().length > 0 && name.trim() !== folderName;

  function submit() {
    if (!canSave) return;
    onSave(name.trim());
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="폴더 이름 수정 닫기"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-folder-title"
        className="relative z-10 w-full max-w-[430px] rounded-2xl bg-white p-7 shadow-xl"
      >
        <h2
          id="rename-folder-title"
          className="font-display-ko text-[20px] font-medium text-ink"
        >
          폴더 이름 수정
        </h2>
        <p className="mt-2 rounded-lg bg-accent-soft px-3.5 py-3 text-[12px] leading-relaxed text-accent-press">
          변경한 폴더 이름은 작가와 부부 갤러리에 동일하게 반영됩니다.
        </p>

        <label className="block mt-5">
          <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
            폴더 이름
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            autoFocus
            maxLength={40}
            className="w-full h-11 rounded-md border border-line px-3.5 text-[14px] text-ink outline-none focus:border-ink-3"
          />
        </label>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium disabled:opacity-35 disabled:pointer-events-none"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
