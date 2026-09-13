"use client";

/**
 * 이름 모달 — 들어올 때(랜덤 이름 미리 적힘 · 다시 뽑기) · 이름 바꾸기
 * 위치: src/app/(guest)/collab/[token]/_shell/NameModal.tsx
 *
 * 제목 · 이름 칸 · 버튼만(안내 문장 없음, 2026-09-13). 1~50자, 비면 못 들어간다.
 */

import { useState } from "react";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { RefreshIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { randomGuestName } from "./randomName";

export function NameModal({ mode, initial, onClose, onSubmit }: { mode: "enter" | "rename"; initial?: string; onClose: () => void; onSubmit: (nickname: string) => Promise<void> }) {
  const [name, setName] = useState(() => initial ?? randomGuestName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 50;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "잠시 뒤 다시 시도해 주세요");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell title={mode === "enter" ? "어떻게 불러 드릴까요?" : "이름 바꾸기"} maxWidthClassName="max-w-105" onClose={onClose}>
      <form
        className="mt-4 flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className={`flex h-12 items-center gap-1 rounded-(--radius-8) border bg-background-default-main pr-1.5 pl-4 transition-colors duration-fast focus-within:border-contents-light-bgd-default focus-within:ring-1 focus-within:ring-contents-light-bgd-default ${valid ? "border-border-default" : "border-function-error-default"}`}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
            aria-label="이름"
            className="min-w-0 flex-1 bg-transparent type-content-l text-contents-light-bgd-default outline-none"
          />
          <button type="button" aria-label="다른 이름" onClick={() => setName(randomGuestName(name))} className="grid size-9 cursor-pointer place-items-center rounded-full text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness hover:text-contents-light-bgd-default">
            <RefreshIcon size={18} />
          </button>
        </div>
        {error && (
          <p role="alert" className="type-content-xs text-function-error-default">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={!valid || busy} className="w-full">
          {busy ? (mode === "enter" ? "들어가는 중…" : "저장 중…") : mode === "enter" ? "들어가기" : "저장"}
        </Button>
      </form>
    </GalleryModalShell>
  );
}
