"use client";

/**
 * 사진 업로드 모달 — 담고 나서 "n장 업로드하기" (1단계 보드 확정, 2026-09-11)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/UploadModal.tsx
 *
 * 옛 모달의 "고르면 즉시 올리기"와 다르다. 끌어다 놓거나 골라 목록에 담고, 버튼을 누르면
 * 모달은 닫히고 진행은 하단 바가 맡는다. 담는 순간 첫 묶음(100장)은 뒤에서 미리 줄여 두어
 * 버튼을 누른 즉시 첫 PUT이 나간다(전부 미리 줄이면 결과 blob이 GB 단위라 첫 묶음만).
 *
 * 담을 때 검사 둘: 형식(JPG · PNG · WebP · HEIC · HEIF 아니면 제외 표시), 플랜 장수 상한
 * (갤러리 응답의 planMaxPhotoCount가 있으면 "지금 사진 + 담은 사진"이 넘는지 — 넘으면 발급 자체가 409).
 */

import { useMemo, useRef, useState, type DragEvent } from "react";
import { AddPhotoIcon, PhotoIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { UPLOAD_ISSUE_BATCH } from "@/lib/upload/masterSpec";
import {
  UPLOAD_ACCEPT_ATTR,
  UPLOAD_MAX_BYTES,
  formatBytes,
  isAcceptedUpload,
  prepareCached,
} from "./uploadSupport";

type Entry = {
  key: string;
  file: File;
  /** 제외 이유. null이면 올릴 수 있는 파일 */
  excluded: "type" | "size" | null;
};

const MAX_ROWS = 300;

function entryKey(file: File) {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export function UploadModal({
  existingCount,
  planMaxPhotoCount,
  onClose,
  onStart,
}: {
  /** 갤러리에 이미 있는 사진 수(PENDING 포함 — 서버가 상한을 셀 때 PENDING도 센다) */
  existingCount: number;
  planMaxPhotoCount: number | null;
  onClose: () => void;
  onStart: (files: File[]) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    let valid = 0;
    let bytes = 0;
    let excludedType = 0;
    let excludedSize = 0;
    for (const entry of entries) {
      if (entry.excluded === "type") excludedType += 1;
      else if (entry.excluded === "size") excludedSize += 1;
      else {
        valid += 1;
        bytes += entry.file.size;
      }
    }
    return { valid, bytes, excludedType, excludedSize };
  }, [entries]);

  const remaining = planMaxPhotoCount === null ? null : Math.max(0, planMaxPhotoCount - existingCount);
  const overPlan = remaining !== null && counts.valid > remaining;

  function addFiles(list: Iterable<File>) {
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.key));
      const added: Entry[] = [];
      for (const file of list) {
        const key = entryKey(file);
        if (seen.has(key)) continue;
        seen.add(key);
        const excluded: Entry["excluded"] = !isAcceptedUpload(file)
          ? "type"
          : file.size > UPLOAD_MAX_BYTES * 4 // 원본 상한은 서버 20MB지만 줄여 올리므로 아주 큰 파일만 미리 막는다
            ? "size"
            : null;
        added.push({ key, file, excluded });
      }
      if (added.length === 0) return prev;
      const next = [...prev, ...added];
      // 첫 묶음은 뒤에서 미리 줄여 둔다 — 누른 즉시 첫 PUT이 나가도록
      next
        .filter((e) => e.excluded === null)
        .slice(0, UPLOAD_ISSUE_BATCH)
        .forEach((e) => void prepareCached(e.file).catch(() => undefined));
      return next;
    });
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragOver(true);
  }
  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragOver(false);
    }
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  function start() {
    const files = entries.filter((e) => e.excluded === null).map((e) => e.file);
    if (files.length === 0 || overPlan) return;
    onStart(files);
  }

  const excludedNote = [
    counts.excludedType > 0 ? `지원하지 않는 형식 ${counts.excludedType}` : null,
    counts.excludedSize > 0 ? `너무 큰 파일 ${counts.excludedSize}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div onDragEnter={onDragEnter} onDragOver={(e) => e.preventDefault()} onDragLeave={onDragLeave} onDrop={onDrop}>
      <GalleryModalShell
        title="사진 업로드"
        desc="올라오는 대로 AI가 컨셉 · 세부 폴더로 나눠요. 원본은 그대로 보관되고 화면에는 줄인 미리보기를 써요."
        maxWidthClassName="max-w-140"
        onClose={onClose}
      >
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {entries.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`mb-6 grid w-full cursor-pointer place-items-center gap-1 rounded-(--radius-16) border-2 border-dashed py-14 text-center transition-colors duration-fast ${
              dragOver
                ? "border-brand-secondary-default bg-brand-secondary-background"
                : "border-border-default hover:bg-surface-default-lightness"
            }`}
          >
            <span className="mb-1 flex text-contents-light-bgd-weakness">
              <AddPhotoIcon size={36} />
            </span>
            <p className="type-content-m text-contents-light-bgd-default">여기에 사진을 끌어다 놓으세요</p>
            <p className="type-content-xs text-contents-light-bgd-sub">
              JPG · PNG · WebP · HEIC · 여러 장 한 번에 · 긴 변 2048로 줄여 올라가요
            </p>
            <span className="mt-3 inline-flex h-9 items-center rounded-(--radius-8) border border-border-default px-4 type-label-medium-s text-contents-light-bgd-default">
              또는 사진 고르기
            </span>
          </button>
        ) : (
          <>
            <div className="relative">
              {dragOver && (
                <div
                  aria-hidden
                  className="absolute -inset-1.5 z-10 rounded-(--radius-8) border-2 border-dashed border-brand-secondary-default bg-brand-secondary-background/70"
                />
              )}
              <ul className="scrollbar-slim mb-2 flex max-h-72 flex-col overflow-y-auto pr-1.5">
                {entries.slice(0, MAX_ROWS).map((entry) => (
                  <li
                    key={entry.key}
                    className="flex items-center gap-2.5 rounded-(--radius-4) px-1.5 py-1.5 type-content-s hover:bg-surface-default-lightness"
                  >
                    <span
                      className={`flex shrink-0 ${
                        entry.excluded ? "text-contents-light-bgd-disabled" : "text-contents-light-bgd-weakness"
                      }`}
                    >
                      <PhotoIcon size={18} />
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate ${
                        entry.excluded ? "text-contents-light-bgd-disabled line-through" : "text-contents-light-bgd-default"
                      }`}
                    >
                      {entry.file.name}
                    </span>
                    {entry.excluded && (
                      <span className="shrink-0 rounded-(--pill) bg-function-warning-background px-1.5 py-px type-label-semibold-xs text-function-warning-default">
                        {entry.excluded === "type" ? "제외 · 지원하지 않는 형식" : "제외 · 너무 큼"}
                      </span>
                    )}
                    <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness tabular-nums">
                      {formatBytes(entry.file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.key)}
                      aria-label={`${entry.file.name} 빼기`}
                      className="shrink-0 cursor-pointer rounded-(--radius-4) px-1.5 type-content-xs text-contents-light-bgd-weakness hover:bg-surface-default-light hover:text-contents-light-bgd-default"
                    >
                      빼기
                    </button>
                  </li>
                ))}
                {entries.length > MAX_ROWS && (
                  <li className="px-1.5 py-2 type-content-xs text-contents-light-bgd-weakness">
                    외 {entries.length - MAX_ROWS}장
                  </li>
                )}
              </ul>
            </div>
            <div className="mb-5 flex items-center justify-between px-1 type-content-xs text-contents-light-bgd-sub">
              <span className="tabular-nums">
                {counts.valid}장 · {formatBytes(counts.bytes)}
              </span>
              {excludedNote && <span className="shrink-0 pl-2">{excludedNote}</span>}
            </div>
            {overPlan && (
              <p role="alert" className="mb-4 rounded-(--radius-8) bg-function-warning-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
                플랜에서 올릴 수 있는 사진은 <b>{planMaxPhotoCount}장</b>까지예요. 지금 {existingCount}장이 있어{" "}
                <b>{remaining}장</b>까지 더 올릴 수 있어요. {counts.valid - (remaining ?? 0)}장을 빼 주세요.
              </p>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button kind="ghost" onClick={() => inputRef.current?.click()} className="flex-1">
            {entries.length === 0 ? "사진 고르기" : "더 끌어다 놓거나 고르기"}
          </Button>
          <Button onClick={start} disabled={counts.valid === 0 || overPlan} className="flex-1">
            {counts.valid > 0 ? `${counts.valid}장 업로드하기` : "업로드하기"}
          </Button>
        </div>
      </GalleryModalShell>
    </div>
  );
}
