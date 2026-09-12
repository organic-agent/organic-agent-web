"use client";

/**
 * 보정 결과 올리기 모달 — 파일 고르기 → 파일명 자동 매칭 → 짝 확인 → 올리기
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ResultUploadModal.tsx
 *
 * 서버 results/match가 파일명(확장자 제외)으로 회차 항목의 원본 파일명과 맞춘다: 일치 / 후보 여럿(고르기) / 못 찾음(직접 지정).
 * 이미 결과가 있는 사진에 다시 올리면 바꾼다. 한 사진에 두 파일이 걸리면 뒤 것을 막는다. 올리기는 부모(useResultUpload)가 한다.
 * presetPhotoId가 있으면 한 장 슬롯 — 파일 하나를 그 사진에 바로 짝 짓는다.
 */

import { useRef, useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { CloudUploadIcon, ErrorIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { matchRetouchResults, type ResultMatch } from "@/lib/api/retouch";
import type { RetouchItem } from "./roundItems";
import type { ResultAssignment } from "./useResultUpload";

type Row = { file: File; match: ResultMatch | null; photoId: number | null };

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export function ResultUploadModal({
  galleryId,
  roundNo,
  items,
  presetPhotoId = null,
  onClose,
  onStart,
}: {
  galleryId: number;
  roundNo: number;
  items: RetouchItem[];
  presetPhotoId?: number | null;
  onClose: () => void;
  onStart: (assignments: ResultAssignment[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemById = new Map(items.map((it) => [it.photo.photoId, it]));
  const preset = presetPhotoId !== null ? itemById.get(presetPhotoId) ?? null : null;

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    if (files.length === 0) return;
    setError(null);
    if (preset) {
      setRows([{ file: files[0], match: null, photoId: preset.photo.photoId }]);
      return;
    }
    setMatching(true);
    try {
      const res = await matchRetouchResults(
        galleryId,
        roundNo,
        files.map((f) => ({ filename: f.name, contentType: f.type || "image/jpeg" })),
      );
      const byName = new Map(res.matches.map((m) => [m.filename, m]));
      setRows((prev) => [
        ...prev,
        ...files.map((file) => {
          const match = byName.get(file.name) ?? null;
          return { file, match, photoId: match?.photoId ?? null };
        }),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "파일명을 맞추지 못했어요 · 다시 시도해 주세요");
    } finally {
      setMatching(false);
    }
  }

  const assignedIds = rows.map((r) => r.photoId).filter((id): id is number => id !== null);
  const duplicated = new Set(assignedIds.filter((id, i) => assignedIds.indexOf(id) !== i));
  const ready = rows.filter((r) => r.photoId !== null && !duplicated.has(r.photoId));
  const replacing = ready.filter((r) => itemById.get(r.photoId!)?.hasResult).length;
  const unmatched = rows.filter((r) => r.photoId === null).length;

  return (
    <GalleryModalShell
      title={preset ? `${preset.photo.originalFileName}의 결과 올리기` : `${roundNo}차 보정 결과 올리기`}
      desc={
        preset
          ? "이 사진의 보정 결과 파일 하나를 골라 주세요. 이미 결과가 있으면 바꿔요."
          : `${items.length}장 · 파일명(확장자 제외)이 같은 사진에 자동으로 맞춰요. 원본 크기 그대로 올라가요.`
      }
      maxWidthClassName="max-w-140"
      onClose={onClose}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} multiple={!preset} hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`mb-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-(--radius-12) border border-dashed px-5 py-6 text-center transition-colors duration-fast ${
          dragging ? "border-brand-secondary-default bg-brand-secondary-background" : "border-border-default hover:bg-surface-default-lightness"
        }`}
      >
        <span className="grid size-11 place-items-center rounded-full bg-brand-secondary-background text-brand-secondary-default">
          <CloudUploadIcon size={22} />
        </span>
        <p className="type-label-semibold-m text-contents-light-bgd-default">{preset ? "결과 파일을 끌어다 놓거나 고르기" : "결과 파일들을 끌어다 놓거나 고르기"}</p>
        <p className="type-content-xs text-contents-light-bgd-weakness">JPG · PNG · WebP{preset ? "" : " · 한 번에 여러 장"}</p>
      </div>

      {matching && <p className="mb-3 type-content-xs text-contents-light-bgd-sub">파일명을 맞추는 중…</p>}
      {rows.length > 0 && (
        <ul className="mb-4 max-h-56 divide-y divide-divider-default overflow-y-auto rounded-(--radius-8) border border-border-default type-content-xs">
          {rows.map((r, i) => {
            const target = r.photoId !== null ? itemById.get(r.photoId) : null;
            const dup = r.photoId !== null && duplicated.has(r.photoId);
            return (
              <li key={`${r.file.name}-${i}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-3 py-2">
                <span className="truncate text-contents-light-bgd-sub" title={r.file.name}>
                  {r.file.name}
                </span>
                <span className="text-contents-light-bgd-weakness">→</span>
                {preset ? (
                  <span className="truncate text-contents-light-bgd-default">{preset.photo.originalFileName}</span>
                ) : (
                  <select
                    value={r.photoId ?? ""}
                    onChange={(e) => setRows((prev) => prev.map((row, j) => (j === i ? { ...row, photoId: e.target.value ? Number(e.target.value) : null } : row)))}
                    aria-label={`${r.file.name}의 짝`}
                    className="h-7 min-w-0 cursor-pointer rounded-(--radius-4) bg-surface-default-light px-1.5 text-contents-light-bgd-default focus:outline-none"
                  >
                    <option value="">{r.match && r.match.candidates.length > 1 ? `후보 ${r.match.candidates.length} — 고르기` : "못 찾음 — 직접 지정"}</option>
                    {(r.match && r.match.candidates.length > 1 ? r.match.candidates.map((c) => itemById.get(c.photoId)).filter((it): it is RetouchItem => !!it) : items).map((it) => (
                      <option key={it.photo.photoId} value={it.photo.photoId}>
                        {it.photo.originalFileName}
                        {it.hasResult ? " · 결과 있음" : ""}
                      </option>
                    ))}
                  </select>
                )}
                <span className={`shrink-0 type-label-semibold-xs ${dup ? "text-function-error-default" : r.photoId === null ? "text-function-warning-default" : target?.hasResult ? "text-function-warning-default" : "text-brand-secondary-dark"}`}>
                  {dup ? "겹침" : r.photoId === null ? "미정" : target?.hasResult ? "바꿈" : r.match?.photoId ? "일치" : "지정"}
                </span>
                <button type="button" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))} aria-label={`${r.file.name} 빼기`} className="col-span-4 hidden" />
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p role="alert" className="mb-3 inline-flex items-center gap-1 type-content-xs text-function-error-default">
          <ErrorIcon size={14} />
          {error}
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-x-3 type-content-xs text-contents-light-bgd-weakness">
        {rows.length > 0 && <span>{rows.length}개 파일 · 올릴 수 있는 {ready.length}장</span>}
        {unmatched > 0 && <span className="text-function-warning-default">미정 {unmatched}</span>}
        {duplicated.size > 0 && <span className="text-function-error-default">같은 사진에 두 파일 {duplicated.size}</span>}
        {replacing > 0 && <span>기존 결과를 바꾸는 {replacing}장</span>}
      </div>
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => onStart(ready.map((r) => ({ file: r.file, photoId: r.photoId! })))}
        confirmLabel={ready.length > 0 ? `${ready.length}장 올리기` : "올리기"}
        disabled={ready.length === 0 || matching}
      />
    </GalleryModalShell>
  );
}
