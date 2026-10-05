"use client";

/**
 * 보정 자료 내려받기 모달 — 요청서 PDF / 사진 + 요청서 ZIP, 범위 2(전체 · 보정 요청 존재)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/RetouchDownloadModal.tsx
 *
 * 어떤 사진에 무엇을 해야 하는지 대조할 자료. 서버에는 업로드 때 줄인 2048px만 있어 보정은 작가 컴퓨터의 원본으로 —
 * 그래서 묶음의 사진은 "확인용"이라고만 적는다. 작가의 보정 작업 화면과 개인 갤러리의 보정 확인 화면이 같이 쓰고,
 * 개인 갤러리(personal)는 제목만 "요청서 내려받기"다. 문구는 설명 문장 없이 짧게(2차 QA).
 */

import { useEffect, useRef, useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { DocIcon, FolderIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { downloadRetouchPdf } from "@/lib/api/retouch";
import { hasMemo, type RetouchItem } from "./roundItems";
import { buildRetouchZip, RetouchZipError, saveBlob } from "./retouchDownload";

type Kind = "pdf" | "zip";
type Scope = "all" | "memo";

export function RetouchDownloadModal({
  galleryId,
  galleryTitle,
  roundNo,
  items,
  personal = false,
  onClose,
}: {
  galleryId: number;
  galleryTitle: string;
  roundNo: number;
  items: RetouchItem[];
  /** 개인 갤러리 — 부부가 작가에게 보낼 요청서를 받는다(제목이 다르다) */
  personal?: boolean;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>("pdf");
  const [scope, setScope] = useState<Scope>("all");
  const [progress, setProgress] = useState<{ phase: "pdf" | "photos"; done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scoped = scope === "memo" ? items.filter(hasMemo) : items;
  const base = `${galleryTitle} ${roundNo}차 보정`;

  useEffect(() => () => abortRef.current?.abort(), []);

  async function run() {
    if (abortRef.current || scoped.length === 0) return;
    setNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ phase: "pdf", done: 0, total: scoped.length });
    try {
      const pdf = await downloadRetouchPdf(galleryId, roundNo, scope, controller.signal);
      controller.signal.throwIfAborted();
      if (kind === "pdf") {
        saveBlob(pdf, `${base} 요청서.pdf`);
      } else {
        setProgress({ phase: "photos", done: 0, total: scoped.length });
        const blob = await buildRetouchZip(scoped, pdf, (done) => {
          if (!controller.signal.aborted) setProgress({ phase: "photos", done, total: scoped.length });
        }, controller.signal);
        controller.signal.throwIfAborted();
        saveBlob(blob, `${base}.zip`);
      }
      onClose();
    } catch (err) {
      if (!controller.signal.aborted) {
        setNotice(err instanceof ApiError || err instanceof RetouchZipError ? err.message : "내려받지 못했어요 · 다시 시도해 주세요");
      }
    } finally {
      abortRef.current = null;
      if (!controller.signal.aborted) setProgress(null);
    }
  }

  return (
    <GalleryModalShell
      title={personal ? "요청서 내려받기" : `${roundNo}차 보정 자료 내려받기`}
      maxWidthClassName="max-w-120"
      onClose={() => {
        abortRef.current?.abort();
        onClose();
      }}
    >
      <div className="mt-5 mb-4 flex flex-col gap-2" role="radiogroup" aria-label="내려받을 것">
        {(
          [
            ["pdf", <DocIcon key="i" size={20} />, "요청서 (PDF)", "사진 · 핀 번호 · 요청 내용"],
            ["zip", <FolderIcon key="i" size={20} />, "사진 + 요청서 (ZIP)", `확인용 사진 ${scoped.length}장`],
          ] as [Kind, React.ReactNode, string, string][]
        ).map(([k, icon, label, sub]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            disabled={progress !== null}
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
            ["all", `전체 ${items.length}`],
            ["memo", `보정 요청 존재 ${items.filter(hasMemo).length}`],
          ] as [Scope, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={scope === k}
            disabled={progress !== null}
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
          {progress.phase === "pdf" ? "요청서 만드는 중…" : progress.done === progress.total ? "묶는 중…" : `사진 받는 중 ${progress.done} / ${progress.total}`}
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
        confirmLabel={progress ? kind === "pdf" ? "만드는 중…" : "묶는 중…" : "내려받기"}
        disabled={scoped.length === 0 || progress !== null}
      />
    </GalleryModalShell>
  );
}
