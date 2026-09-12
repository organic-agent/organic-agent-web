"use client";

/**
 * 보정본 내려받기 — 이 회차의 결과 사진을 원본 파일명으로 ZIP (클라이언트)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ResultsDownloadModal.tsx
 *
 * 결과 서명 URL을 브라우저가 한 장씩 받아 묶는다(S3 CORS GET 필요). 결과가 없는 사진은 건너뛴다.
 */

import { useRef, useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { saveBlob, zipFiles } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/retouchDownload";
import type { RetouchItem } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/roundItems";

export function ResultsDownloadModal({ galleryTitle, roundNo, items, onClose }: { galleryTitle: string; roundNo: number; items: RetouchItem[]; onClose: () => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const withResult = items.filter((it) => it.resultUrl);

  async function run() {
    if (progress || withResult.length === 0) return;
    setNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ done: 0, total: withResult.length });
    try {
      const { blob, missing } = await zipFiles(
        withResult.map((it) => ({ name: it.photo.originalFileName.replace(/\.[^.]+$/, "") + ".jpg", url: it.resultUrl })),
        [],
        (done) => setProgress({ done, total: withResult.length }),
        controller.signal,
      );
      saveBlob(blob, `${galleryTitle} 보정본 ${roundNo}차.zip`);
      if (missing.length > 0) setNotice(`${missing.length}장은 받지 못해 빠졌어요 (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? " …" : ""})`);
      else onClose();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setNotice("묶지 못했어요 · 다시 시도해 주세요");
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  }
  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <GalleryModalShell title="보정본 내려받기" desc={`${roundNo}차 결과 ${withResult.length}장을 원본 파일명의 JPG로 묶어 받아요.`} maxWidthClassName="max-w-105" onClose={close}>
      {progress && (
        <p className="mb-3 type-content-xs text-contents-light-bgd-sub" aria-live="polite">
          받는 중 {progress.done} / {progress.total}
        </p>
      )}
      {notice && (
        <p role="alert" className="mb-3 type-content-xs text-function-warning-default">
          {notice}
        </p>
      )}
      <GalleryModalButtons onClose={close} onConfirm={() => void run()} confirmLabel={progress ? "묶는 중…" : "ZIP 내려받기"} disabled={withResult.length === 0 || progress !== null} />
    </GalleryModalShell>
  );
}
