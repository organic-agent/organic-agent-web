"use client";

/**
 * 사진 업로드 모달 — 담고 나서 "n장 업로드하기" (1단계 보드 확정, 2026-09-11)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/UploadModal.tsx
 *
 * 옛 모달의 "고르면 즉시 올리기"와 다르다. 끌어다 놓거나 골라 목록에 담고, 버튼을 누르면
 * 모달은 닫히고 진행은 하단 바가 맡는다. 고르는 자리는 하나 — 비었을 땐 중앙 드롭 존("폴더에서 사진 가져오기"),
 * 담긴 뒤엔 하단 "폴더에서 더 가져오기"(2026-09-11 수민 피드백). 담는 순간 첫 묶음(100장)은 뒤에서 미리 줄여 두어
 * 버튼을 누른 즉시 첫 PUT이 나간다(전부 미리 줄이면 결과 blob이 GB 단위라 첫 묶음만).
 *
 * 담을 때 검사 둘: 형식(JPG · PNG · WebP · HEIC · HEIF 아니면 제외 표시), 플랜 장수 상한
 * (갤러리 응답의 planMaxPhotoCount가 있으면 "지금 사진 + 담은 사진"이 넘는지 — 넘으면 발급 자체가 409).
 * 첫 업로드면 앞서 컨셉 수 모달(ConceptCountModal)에서 받은 값을 장수 줄 오른쪽에 "컨셉 n개 · 바꾸기"로 보여준다 —
 * 누르면 화면이 컨셉 수 모달을 이 모달 위에 다시 띄우고, 담아 둔 파일은 그대로 남는다(이슈 79).
 */

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AddPhotoIcon, PhotoIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { UPLOAD_ISSUE_BATCH } from "@/lib/upload/masterSpec";
import {
  UPLOAD_MAX_BYTES,
  formatBytes,
  isAcceptedUpload,
  prepareCached,
  uploadContentType,
} from "./uploadSupport";
import { expandUploadSelection, UPLOAD_SELECTION_ACCEPT_ATTR, uploadSelectionKey } from "./uploadSelection";

type Entry = {
  key: string;
  file: File;
  /** 제외 이유. null이면 올릴 수 있는 파일. duplicate = 갤러리에 같은 이름의 사진이 이미 있음(기본 건너뜀) */
  excluded: "type" | "size" | "duplicate" | null;
};

const MAX_ROWS = 300;

export function UploadModal({
  existingCount,
  existingNames,
  planMaxPhotoCount,
  conceptCount = null,
  onChangeConcept,
  onClose,
  onStart,
}: {
  /** 갤러리에 이미 있는 사진 수(PENDING 포함 — 서버가 상한을 셀 때 PENDING도 센다) */
  existingCount: number;
  /** 갤러리에 이미 있는 사진의 원본 파일명 — 같은 이름은 기본으로 건너뛴다(같은 사진이 두 번 올라가는 것 방지) */
  existingNames: Set<string>;
  planMaxPhotoCount: number | null;
  /** 첫 업로드 전 컨셉 수 모달에서 받은 값. null = 건너뜀. onChangeConcept가 없으면(사진 더 올리기) 표시하지 않는다 */
  conceptCount?: number | null;
  /** "바꾸기" · "넣기" — 컨셉 수 모달을 다시 연다 */
  onChangeConcept?: () => void;
  onClose: () => void;
  onStart: (files: File[]) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<AbortController | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [archiveExcluded, setArchiveExcluded] = useState({ type: 0, size: 0 });
  const [archiveErrors, setArchiveErrors] = useState<string[]>([]);

  useEffect(() => () => selectionRef.current?.abort(), []);
  useEffect(() => {
    // 첫 묶음만 미리 줄인다. 비동기 ZIP 추가는 최신 목록에 합친 뒤 준비한다.
    entries.filter((entry) => entry.excluded === null).slice(0, UPLOAD_ISSUE_BATCH)
      .forEach((entry) => void prepareCached(entry.file).catch(() => undefined));
  }, [entries]);

  const counts = useMemo(() => {
    let valid = 0;
    let bytes = 0;
    let excludedType = 0;
    let excludedSize = 0;
    let duplicates = 0;
    for (const entry of entries) {
      if (entry.excluded === "type") excludedType += 1;
      else if (entry.excluded === "size") excludedSize += 1;
      else if (entry.excluded === "duplicate" && !includeDuplicates) duplicates += 1;
      else {
        if (entry.excluded === "duplicate") duplicates += 1;
        valid += 1;
        bytes += entry.file.size;
      }
    }
    return { valid, bytes, excludedType, excludedSize, duplicates };
  }, [entries, includeDuplicates]);

  const remaining = planMaxPhotoCount === null ? null : Math.max(0, planMaxPhotoCount - existingCount);
  const overPlan = remaining !== null && counts.valid > remaining;

  function stageFiles(list: Iterable<File>) {
    const added: Entry[] = [];
    for (const file of list) {
      const key = uploadSelectionKey(file);
      // JPG는 2048로 줄여 올라가므로 원본이 커도 되지만(80MB까지), PNG · WebP · HEIC는 원본 그대로라 서버 상한 20MB에서 막는다
      const sizeLimit = uploadContentType(file) === "image/jpeg" ? UPLOAD_MAX_BYTES * 4 : UPLOAD_MAX_BYTES;
      const excluded: Entry["excluded"] = !isAcceptedUpload(file)
        ? "type"
        : file.size > sizeLimit
          ? "size"
          : existingNames.has(file.name)
            ? "duplicate"
            : null;
      added.push({ key, file, excluded });
    }
    if (added.length === 0) return;
    setEntries((prev) => {
      const seen = new Set(prev.map((entry) => entry.key));
      return [...prev, ...added.filter((entry) => {
        if (seen.has(entry.key)) return false;
        seen.add(entry.key);
        return true;
      })];
    });
  }

  async function addFiles(list: Iterable<File>) {
    if (selectionRef.current) return;
    const controller = new AbortController();
    selectionRef.current = controller;
    setExtracting("사진을 확인하는 중…");
    setArchiveErrors([]);
    try {
      const selection = await expandUploadSelection(Array.from(list), (name, done, total) => {
        setExtracting(`${name} 압축을 푸는 중…${total > 0 ? ` ${done} / ${total}` : ""}`);
      }, controller.signal);
      controller.signal.throwIfAborted();
      stageFiles(selection.files);
      setArchiveExcluded((prev) => ({ type: prev.type + selection.excludedType, size: prev.size + selection.excludedSize }));
      setArchiveErrors(selection.errors);
    } catch {
      if (!controller.signal.aborted) setArchiveErrors(["파일을 가져오지 못했어요. 다시 골라 주세요."]);
    } finally {
      if (!controller.signal.aborted) {
        selectionRef.current = null;
        setExtracting(null);
      }
    }
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
    if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files);
  }

  function start() {
    const files = entries
      .filter((e) => e.excluded === null || (e.excluded === "duplicate" && includeDuplicates))
      .map((e) => e.file);
    if (files.length === 0 || overPlan || selectionRef.current) return;
    onStart(files);
  }

  const excludedNote = [
    counts.excludedType + archiveExcluded.type > 0 ? `지원하지 않는 형식 ${counts.excludedType + archiveExcluded.type}` : null,
    counts.excludedSize + archiveExcluded.size > 0 ? `너무 큰 파일 ${counts.excludedSize + archiveExcluded.size}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div onDragEnter={onDragEnter} onDragOver={(e) => e.preventDefault()} onDragLeave={onDragLeave} onDrop={onDrop}>
      <GalleryModalShell
        title="사진 업로드"
        desc={
          <>
            올라오는 대로 AI가 컨셉 · 세부 폴더로 나눠요.
            <br />
            원본은 그대로 보관되고 화면에는 줄인 미리보기를 써요.
          </>
        }
        maxWidthClassName="max-w-140"
        onClose={onClose}
      >
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_SELECTION_ACCEPT_ATTR}
          multiple
          disabled={extracting !== null}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {entries.length === 0 ? (
          <button
            type="button"
            disabled={extracting !== null}
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
            <p className="type-content-m text-contents-light-bgd-default">여기에 사진이나 ZIP을 끌어다 놓으세요</p>
            <p className="type-content-xs text-contents-light-bgd-sub">JPG · PNG · WebP · HEIC · HEIF · ZIP</p>
            <p className="type-content-xs text-contents-light-bgd-sub">ZIP 안의 하위 폴더까지 사진만 가져와요</p>
            <p className="type-content-xs text-contents-light-bgd-sub">분할 ZIP은 모든 조각을 한 번에 선택해 주세요</p>
            <span className="mt-3 inline-flex h-9 items-center rounded-(--radius-8) border border-border-default px-4 type-label-medium-s text-contents-light-bgd-default">
              사진이나 ZIP 가져오기
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
                        entry.excluded && !(entry.excluded === "duplicate" && includeDuplicates)
                          ? "text-contents-light-bgd-disabled"
                          : "text-contents-light-bgd-weakness"
                      }`}
                    >
                      <PhotoIcon size={18} />
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate ${
                        entry.excluded && !(entry.excluded === "duplicate" && includeDuplicates)
                          ? "text-contents-light-bgd-disabled line-through"
                          : "text-contents-light-bgd-default"
                      }`}
                    >
                      {entry.file.name}
                    </span>
                    {entry.excluded === "duplicate" ? (
                      <span
                        className={`shrink-0 rounded-(--pill) px-1.5 py-px type-label-semibold-xs ${
                          includeDuplicates
                            ? "bg-surface-default-light text-contents-light-bgd-sub"
                            : "bg-function-warning-background text-function-warning-default"
                        }`}
                      >
                        {includeDuplicates ? "이미 있는 사진 · 그래도 올림" : "건너뜀 · 이미 있는 사진"}
                      </span>
                    ) : entry.excluded ? (
                      <span className="shrink-0 rounded-(--pill) bg-function-warning-background px-1.5 py-px type-label-semibold-xs text-function-warning-default">
                        {entry.excluded === "type" ? "제외 · 지원하지 않는 형식" : "제외 · 너무 큼"}
                      </span>
                    ) : null}
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
            <div className="mb-5 flex items-center justify-between gap-3 px-1 type-content-xs text-contents-light-bgd-sub">
              <span className="tabular-nums">
                {counts.valid}장 · {formatBytes(counts.bytes)}
              </span>
              <span className="flex shrink-0 items-center gap-2 pl-2">
                {onChangeConcept && (
                  <>
                    <span>{conceptCount !== null ? `컨셉 ${conceptCount}개` : "컨셉 수 건너뜀"}</span>
                    <button
                      type="button"
                      onClick={onChangeConcept}
                      className="cursor-pointer text-contents-light-bgd-default underline underline-offset-2"
                    >
                      {conceptCount !== null ? "바꾸기" : "넣기"}
                    </button>
                  </>
                )}
                {excludedNote && <span>{excludedNote}</span>}
                {counts.duplicates > 0 && (
                  <>
                    <span>
                      {includeDuplicates ? "이미 있는 사진도 올림" : "이미 있는 사진 건너뜀"} {counts.duplicates}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIncludeDuplicates((v) => !v)}
                      className="cursor-pointer text-contents-light-bgd-default underline underline-offset-2"
                    >
                      {includeDuplicates ? "건너뛰기" : "그래도 올리기"}
                    </button>
                  </>
                )}
              </span>
            </div>
            {overPlan && (
              <p role="alert" className="mb-4 rounded-(--radius-8) bg-function-warning-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
                플랜에서 올릴 수 있는 사진은 <b>{planMaxPhotoCount}장</b>까지예요. 지금 {existingCount}장이 있어{" "}
                <b>{remaining}장</b>까지 더 올릴 수 있어요. {counts.valid - (remaining ?? 0)}장을 빼 주세요.
              </p>
            )}
          </>
        )}

        {entries.length > 0 && <p className="mb-3 type-content-xs text-contents-light-bgd-sub">분할 ZIP은 모든 조각을 한 번에 선택해 주세요 (.z01 · .zip 또는 .zip.001 · .002)</p>}

        {extracting && <p role="status" className="mb-4 break-words type-content-xs text-contents-light-bgd-sub">{extracting}</p>}
        {entries.length === 0 && excludedNote && <p role="status" className="mb-4 type-content-xs text-contents-light-bgd-sub">제외 · {excludedNote}</p>}
        {archiveErrors.length > 0 && (
          <div role="alert" className="mb-4 break-words type-content-xs text-function-error-default">
            {archiveErrors.map((error, index) => <p key={index}>{error}</p>)}
          </div>
        )}

        {entries.length > 0 && (
          <div className="flex gap-2">
            <Button kind="ghost" onClick={() => inputRef.current?.click()} disabled={extracting !== null} className="flex-1">
              사진 · ZIP 추가
            </Button>
            <Button onClick={start} disabled={counts.valid === 0 || overPlan || extracting !== null} className="flex-1">
              {counts.valid > 0 ? `${counts.valid}장 업로드하기` : "업로드하기"}
            </Button>
          </div>
        )}
      </GalleryModalShell>
    </div>
  );
}
