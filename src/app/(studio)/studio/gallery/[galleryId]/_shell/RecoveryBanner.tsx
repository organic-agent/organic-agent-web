"use client";

/**
 * 끊김 복구 배너 — "n장이 다 올라오지 못했어요. 전체 사진을 다시 올려도 안 올라간 사진만 골라서 올려요."
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/RecoveryBanner.tsx
 *
 * 서버에 PENDING(발급만 되고 올라오지 않은) 사진이 남아 있을 때 본문 위에 뜬다(1단계 보드 ⑥).
 * 이어서 올리기 → 파일명 · 크기로 짝을 맞춰 재발급으로 이어 올린다(사진이 두 번 생기지 않는다). 올리던 사진을
 *   통째로 다시 골라도 이미 올라온 사진은 건너뛰므로(uploadRecovery), 문장이 그렇게 해도 된다고 알려 준다.
 * 닫기(X) → PENDING 행을 휴지통으로 보내고 배너를 닫는다(24시간 뒤 서버가 알아서 하는 일을 앞당기는 것).
 */

import { useRef } from "react";
import { CloseIcon, CloudOffIcon } from "@/components/icons";
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
        <b className="font-semibold">{count}장</b>이 다 올라오지 못했어요. 전체 사진을 다시 올려도 안 올라간 사진만 골라서 올려요.
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
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-8 cursor-pointer items-center rounded-(--radius-8) border border-function-warning-default/40 bg-background-default-main px-3 type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
      >
        이어서 올리기
      </button>
      <button
        type="button"
        disabled={discarding}
        onClick={onDiscard}
        aria-label="닫기"
        className="-mr-1.5 inline-flex cursor-pointer items-center justify-center rounded-(--radius-4) p-1 text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:opacity-60"
      >
        <CloseIcon size={20} />
      </button>
    </div>
  );
}
