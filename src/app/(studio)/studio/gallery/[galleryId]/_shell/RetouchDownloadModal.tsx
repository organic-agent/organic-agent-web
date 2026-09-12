"use client";

/**
 * 보정 자료 내려받기 모달 — 요청서 CSV / 사진 + 요청서 ZIP, 범위 3
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/RetouchDownloadModal.tsx
 *
 * 어떤 사진에 무엇을 해야 하는지 대조할 자료. 서버에는 업로드 때 줄인 2048px만 있어 보정은 작가 컴퓨터의 원본으로.
 */

import { useRef, useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { DocIcon, FolderIcon } from "@/components/icons";
import { hasMemo, type RetouchItem } from "./roundItems";
import { buildRequestCsv, buildRetouchZip, saveBlob } from "./retouchDownload";

type Kind = "csv" | "zip";
type Scope = "all" | "noResult" | "memo";

export function RetouchDownloadModal({
  galleryTitle,
  roundNo,
  items,
  onClose,
}: {
  galleryTitle: string;
  roundNo: number;
  items: RetouchItem[];
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>("csv");
  const [scope, setScope] = useState<Scope>("all");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scoped = scope === "noResult" ? items.filter((it) => !it.hasResult) : scope === "memo" ? items.filter(hasMemo) : items;
  const base = `${galleryTitle} ${roundNo}차 보정`;

  async function run() {
    if (progress) return;
    setNotice(null);
    const csv = buildRequestCsv(scoped);
    if (kind === "csv") {
      saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${base} 요청서.csv`);
      onClose();
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ done: 0, total: scoped.length });
    try {
      const { blob, missing } = await buildRetouchZip(scoped, csv, (done) => setProgress({ done, total: scoped.length }), controller.signal);
      saveBlob(blob, `${base}.zip`);
      if (missing.length > 0) setNotice(`${missing.length}장은 받지 못해 빠졌어요 (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? " …" : ""})`);
      else onClose();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setNotice("묶지 못했어요 · 다시 시도해 주세요");
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  }

  return (
    <GalleryModalShell
      title={`${roundNo}차 보정 자료 내려받기`}
      desc="어떤 사진에 무엇을 해야 하는지 대조할 자료예요. 보정은 컴퓨터에 있는 원본으로 해 주세요 — 서버에는 업로드 때 줄인 2048px만 있어요."
      maxWidthClassName="max-w-120"
      onClose={() => {
        abortRef.current?.abort();
        onClose();
      }}
    >
      <div className="mb-4 flex flex-col gap-2" role="radiogroup" aria-label="내려받을 것">
        {(
          [
            ["csv", <DocIcon key="i" size={20} />, "요청서 CSV", "photo_id · 파일명 · 전체 요청 · 점 요청(번호 · 위치 · 문장) · 결과 여부"],
            ["zip", <FolderIcon key="i" size={20} />, "사진 + 요청서 ZIP", `2048px JPG(원본 파일명) + 요청서 CSV · 브라우저에서 묶어요(${scoped.length}장 약 ${Math.max(1, Math.ceil(scoped.length / 40))}분)`],
          ] as [Kind, React.ReactNode, string, string][]
        ).map(([k, icon, label, sub]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`flex cursor-pointer items-start gap-3 rounded-(--radius-8) border px-3 py-2.5 text-left transition-colors duration-fast ${
              kind === k ? "border-brand-secondary-default bg-brand-secondary-background" : "border-border-default hover:bg-surface-default-lightness"
            }`}
          >
            <span className="mt-0.5 text-brand-secondary-default">{icon}</span>
            <span className="flex flex-col gap-0.5">
              <span className="type-label-semibold-s text-contents-light-bgd-default">{label}</span>
              <span className="type-content-xs text-contents-light-bgd-weakness">{sub}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mb-1.5 type-label-semibold-s text-contents-light-bgd-default">범위</p>
      <div className="mb-5 flex rounded-(--radius-8) bg-surface-default-medium p-0.75" role="tablist" aria-label="범위">
        {(
          [
            ["all", `이 회차 전부 ${items.length}`],
            ["noResult", `결과 없는 ${items.filter((it) => !it.hasResult).length}`],
            ["memo", `메모 있는 ${items.filter(hasMemo).length}`],
          ] as [Scope, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={scope === k}
            onClick={() => setScope(k)}
            className={`flex-1 cursor-pointer rounded-(--radius-4) py-1.5 type-label-medium-s transition-colors duration-fast ${
              scope === k ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-contents-light-bgd-weakness"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {progress && (
        <p className="mb-3 type-content-xs text-contents-light-bgd-sub" aria-live="polite">
          사진 받는 중 {progress.done} / {progress.total}
        </p>
      )}
      {notice && (
        <p role="alert" className="mb-3 type-content-xs text-function-warning-default">
          {notice}
        </p>
      )}
      <GalleryModalButtons
        onClose={() => {
          abortRef.current?.abort();
          onClose();
        }}
        onConfirm={() => void run()}
        confirmLabel={progress ? "묶는 중…" : kind === "csv" ? "CSV 내려받기" : "ZIP 내려받기"}
        disabled={scoped.length === 0 || progress !== null}
      />
    </GalleryModalShell>
  );
}
