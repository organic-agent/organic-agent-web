"use client";

import { useState } from "react";
import { ModalFrame } from "@/components/ui/ModalFrame";

type Props = {
  onClose: () => void;
  onCreate: (input: { name: string; memo: string }) => void;
};

export function CreateCollaborationFolderModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");

  function submit() {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), memo: memo.trim() });
  }

  return (
    <ModalFrame
      title="협업 폴더 만들기"
      desc="가족·지인과 함께 의견을 나눌 새 폴더를 만들어요."
      onClose={onClose}
      maxWidthClassName="max-w-[460px]"
      paddingClassName="p-7"
    >
      <div className="space-y-3">
        <label className="block">
          <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
            폴더 이름
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="예: 가족사진 함께 고르기"
            autoFocus
            className="w-full h-11 rounded-md border border-line px-3.5 text-[14px] text-ink outline-none focus:border-ink-3"
          />
        </label>
        <label className="block">
          <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
            메모
          </span>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="가족·지인에게 전하고 싶은 내용을 적어주세요."
            rows={3}
            className="w-full rounded-md border border-line px-3.5 py-3 text-[14px] text-ink outline-none resize-none focus:border-ink-3"
          />
        </label>
      </div>
      <div className="flex gap-2 mt-5">
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
          disabled={!name.trim()}
          className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] disabled:opacity-40 disabled:pointer-events-none"
        >
          폴더 만들기
        </button>
      </div>
    </ModalFrame>
  );
}
