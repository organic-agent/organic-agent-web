"use client";

/**
 * 끊김 복구 배너 — "업로드가 중단됐어요. 전체 사진을 다시 올려도 안 올라간 사진만 골라서 올려요."
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/RecoveryBanner.tsx
 *
 * 서버에 PENDING(발급만 되고 올라오지 않은) 사진이 남아 있을 때 본문 위에 뜬다(1단계 보드 ⑥).
 * 장수는 말하지 않는다 — PENDING 행은 발급된 사진만이라, 아직 발급 차례가 안 왔던 사진이 빠져 실제와 달랐다(2차 QA).
 * 이어서 올리기 → 파일명 · 크기로 짝을 맞춰 재발급으로 이어 올린다(사진이 두 번 생기지 않는다). 올리던 사진을
 *   통째로 다시 골라도 이미 올라온 사진은 건너뛰므로(uploadRecovery), 문장이 그렇게 해도 된다고 알려 준다.
 * 닫기(X) → PENDING 행을 휴지통으로 보내고 배너를 닫는다(24시간 뒤 서버가 알아서 하는 일을 앞당기는 것).
 */

import { useEffect, useRef, useState } from "react";
import { CloseIcon, CloudOffIcon } from "@/components/icons";
import { isAcceptedUpload } from "./uploadSupport";
import { expandUploadSelection, UPLOAD_SELECTION_ACCEPT_ATTR } from "./uploadSelection";

export function RecoveryBanner({
  onFiles,
  onDiscard,
  discarding = false,
}: {
  onFiles: (files: File[]) => void;
  onDiscard: () => void;
  discarding?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<AbortController | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  useEffect(() => () => selectionRef.current?.abort(), []);

  async function selectFiles(files: File[]) {
    if (selectionRef.current || discarding) return;
    const controller = new AbortController();
    selectionRef.current = controller;
    setExtracting(true);
    setSelectionNotice(null);
    try {
      const selection = await expandUploadSelection(files, undefined, controller.signal);
      controller.signal.throwIfAborted();
      const photos = selection.files.filter(isAcceptedUpload);
      setSelectionNotice(selection.errors.join(" ") || (photos.length === 0 ? "업로드할 수 있는 사진이 없어요." : null));
      if (photos.length > 0) onFiles(photos);
    } catch {
      if (!controller.signal.aborted) setSelectionNotice("파일을 가져오지 못했어요. 다시 골라 주세요.");
    } finally {
      if (!controller.signal.aborted) {
        selectionRef.current = null;
        setExtracting(false);
      }
    }
  }
  return (
    <div
      role="status"
      className="mx-5 mb-2 flex flex-wrap items-center gap-3 rounded-(--radius-12) bg-function-warning-background px-4 py-2.5 type-content-s text-contents-light-bgd-default"
    >
      <span className="flex shrink-0 text-function-warning-default">
        <CloudOffIcon size={18} />
      </span>
      <span className="min-w-0 flex-1">업로드가 중단됐어요. 전체 사진을 다시 올려도 안 올라간 사진만 골라서 올려요.</span>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_SELECTION_ACCEPT_ATTR}
        multiple
        disabled={extracting || discarding}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void selectFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={extracting || discarding}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-8 cursor-pointer items-center rounded-(--radius-8) border border-function-warning-default/40 bg-background-default-main px-3 type-label-medium-s text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
      >
        {extracting ? "압축을 풀고 사진을 확인하는 중…" : "이어서 올리기"}
      </button>
      <button
        type="button"
        disabled={discarding || extracting}
        onClick={onDiscard}
        aria-label="닫기"
        className="-mr-1.5 inline-flex cursor-pointer items-center justify-center rounded-(--radius-4) p-1 text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:opacity-60"
      >
        <CloseIcon size={20} />
      </button>
      {selectionNotice && <p role="alert" className="basis-full break-words type-content-xs text-function-error-default">{selectionNotice}</p>}
    </div>
  );
}
