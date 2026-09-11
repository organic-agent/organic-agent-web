"use client";

/**
 * 끊김 복구 배너 — "n장이 다 올라오지 못했어요. 같은 파일을 다시 고르면 이어서 올려요."
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/RecoveryBanner.tsx
 *
 * 서버에 PENDING(발급만 되고 올라오지 않은) 사진이 남아 있을 때 본문 위에 뜬다(1단계 보드 ⑥).
 * 파일 다시 고르기 → 파일명 · 크기로 짝을 맞춰 재발급으로 이어 올린다(사진이 두 번 생기지 않는다).
 * 못 올라온 사진 지우기 → PENDING 행을 휴지통으로(24시간 뒤 서버가 알아서 하는 일을 앞당기는 것).
 */

import { useRef } from "react";
import { CloudOffIcon } from "@/components/icons";
import { UPLOAD_ACCEPT_ATTR } from "./uploadSupport";

export function RecoveryBanner({
  count,
  onFiles,
  onDiscard,
  discarding = false,
}: {
  count: number;
  onFiles: (files: File[]) => void;
  onDiscard: () => void;
  discarding?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      role="status"
      className="mx-5 mb-2 flex flex-wrap items-center gap-3 rounded-(--radius-12) bg-function-warning-background px-4 py-2.5 type-content-s text-contents-light-bgd-default"
    >
      <span className="flex shrink-0 text-function-warning-default">
        <CloudOffIcon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="font-semibold">{count}장</b>이 다 올라오지 못했어요. 같은 파일을 다시 고르면 이어서 올려요.
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={discarding}
        onClick={onDiscard}
        className="cursor-pointer type-content-xs text-contents-light-bgd-sub underline underline-offset-2 disabled:cursor-default disabled:opacity-60"
      >
        {discarding ? "지우는 중…" : "못 올라온 사진 지우기"}
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-8 cursor-pointer items-center rounded-(--radius-8) border border-function-warning-default/40 bg-background-default-main px-3 type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
      >
        파일 다시 고르기
      </button>
    </div>
  );
}
