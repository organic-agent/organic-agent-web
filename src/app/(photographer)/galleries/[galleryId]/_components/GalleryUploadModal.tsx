"use client";

/**
 * 작가 — 사진 업로드 모달 (피그마 Modal/Upload 대응, 시안 보드 v5)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryUploadModal.tsx
 *
 * 선택 즉시 업로드 — 확인 단계가 없다. 파일을 고르거나 떨어뜨리는 순간
 * 발급→S3 PUT→통보가 시작되고, 진행 중에도 목록에 끌어다 놓으면 이어서
 * 올라간다(목록 자체가 드롭 타깃, 드래그 오버 시 문구 없는 점선 오버레이).
 *
 * 부분 실패 시 성공분은 이미 통보돼 서버에 남고, 실패분만 재시도한다.
 * 업로드 중 닫으면 남은 업로드가 중단된다 — 경고는 설명 줄이 겸한다.
 * 전부 성공하면 완료 문구를 잠시 보여주고 자동으로 닫힌다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { GalleryModalShell } from "../../_components/GalleryModalShell";
import { useUploadQueue } from "../_lib/useUploadQueue";
import { UploadFileRow } from "./UploadFileRow";

type Props = {
  galleryId: number;
  onClose: () => void;
  /** 이번 세션에서 1장 이상 업로드가 완료됐을 때 (닫힐 때 호출) */
  onUploaded?: (doneCount: number) => void;
};

const AUTO_CLOSE_MS = 1400;

export function GalleryUploadModal({ galleryId, onClose, onUploaded }: Props) {
  const { entries, addFiles, retryFailed, abortAll } = useUploadQueue(galleryId);
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const c = { valid: 0, done: 0, failed: 0, excluded: 0, active: 0, bytes: 0 };
    for (const e of entries) {
      if (e.status === "excluded") {
        c.excluded += 1;
        continue;
      }
      c.valid += 1;
      c.bytes += e.size;
      if (e.status === "done") c.done += 1;
      else if (e.status === "failed") c.failed += 1;
      else c.active += 1; // waiting·uploading
    }
    return c;
  }, [entries]);

  const allDone = counts.valid > 0 && counts.done === counts.valid;

  function handleClose() {
    abortAll();
    if (counts.done > 0) onUploaded?.(counts.done);
    onClose();
  }

  // 전부 성공 → 완료 문구를 잠시 보여주고 자동 닫힘
  useEffect(() => {
    if (!allDone) return;
    const timer = window.setTimeout(handleClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  // 드롭 타깃은 모달 전체 — 시각 강조는 목록 영역 오버레이가 담당
  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragOver(false);
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  const totalMb = (counts.bytes / (1024 * 1024)).toFixed(1);
  const desc = allDone
    ? `${counts.done}장 업로드 완료`
    : counts.active > 0
      ? `업로드 중 ${counts.done} / ${counts.valid} — 창을 닫으면 남은 업로드가 중단돼요.`
      : counts.failed > 0
        ? `${counts.done}장은 저장됐어요. ${counts.failed}장이 실패했어요.`
        : "이미지 파일을 끌어다 놓으세요.";

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <GalleryModalShell title="사진 업로드" desc={desc} onClose={handleClose}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {entries.length === 0 ? (
          // 진입 상태 — 대형 드롭 존 (기존과 동일)
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`mb-6 grid w-full cursor-pointer place-items-center rounded-(--radius-16) border-2 border-dashed py-12 text-center transition-colors duration-fast ${
              dragOver
                ? "border-fg-neutral bg-bg-layer-default-hover"
                : "border-stroke-neutral-weak hover:bg-bg-layer-default-hover"
            }`}
          >
            <UploadIcon size={32} className="mb-3 text-fg-neutral-subtle" />
            <p className="type-body-medium text-fg-neutral-muted">
              사진을 끌어다 놓거나 클릭해서 선택하세요
            </p>
            <p className="mt-1 type-body-small text-fg-neutral-muted">
              JPG·PNG 등 이미지 파일 · 여러 장 한 번에
            </p>
          </button>
        ) : (
          <>
            <div className="relative">
              {dragOver && (
                <div
                  aria-hidden
                  className="absolute -inset-1.5 z-10 rounded-(--radius-8) border-2 border-dashed border-fg-neutral bg-bg-layer-default/70"
                />
              )}
              <div className="scrollbar-slim mb-2 flex max-h-62 flex-col gap-1 overflow-y-auto pr-1.5">
                {entries.map((entry) => (
                  <UploadFileRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
            <p className="mb-3.5 px-1 type-body-small text-fg-neutral-subtle">
              사진을 이 목록에 끌어다 놓으면 이어서 올라가요
            </p>
            <div className="mb-5 flex items-center justify-between px-1 type-body-small text-fg-neutral-muted">
              <span>
                {counts.valid}장 · {totalMb}MB
              </span>
              <span className="shrink-0 pl-2">
                {[
                  counts.excluded > 0 ? `제외 ${counts.excluded}` : null,
                  counts.done > 0 ? `완료 ${counts.done}` : null,
                  counts.failed > 0 ? `실패 ${counts.failed}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </>
        )}

        {/* 상태별 푸터 */}
        {entries.length === 0 ? (
          <div className="flex gap-2">
            <Button kind="ghost" onClick={handleClose} className="flex-1">
              취소
            </Button>
            <Button disabled className="flex-1">
              업로드 시작
            </Button>
          </div>
        ) : counts.active > 0 ? (
          <Button disabled className="w-full">
            업로드 중 {counts.done} / {counts.valid}…
          </Button>
        ) : counts.failed > 0 ? (
          <>
            <p
              role="alert"
              className="mb-4 text-center type-body-small text-fg-critical"
            >
              네트워크가 불안정했어요. 실패한 사진만 다시 올릴 수 있어요.
            </p>
            <div className="flex gap-2">
              <Button kind="ghost" onClick={handleClose} className="flex-1">
                닫기
              </Button>
              <Button onClick={retryFailed} className="flex-1">
                실패 {counts.failed}장 재시도
              </Button>
            </div>
          </>
        ) : (
          <Button disabled className="w-full">
            {counts.done}장 업로드 완료
          </Button>
        )}
      </GalleryModalShell>
    </div>
  );
}
