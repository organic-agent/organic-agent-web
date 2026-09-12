/**
 * 보정 자료 내려받기 — 요청서 CSV · 사진 + 요청서 ZIP (작가 3단계)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/retouchDownload.ts
 *
 * CSV는 회차 항목에서 직접 만든다(UTF-8 BOM, photo_id · filename · request · point_requests · has_result) — 서버 export는
 * 선택 앨범 기준이라 2차 회차를 못 담는다. ZIP은 서버에 있는 2048px JPG(업로드 때 줄인 것)를 원본 파일명으로 묶고 CSV를 동봉한다.
 * 보정 자체는 작가 컴퓨터의 원본으로 해야 하므로 ZIP은 "어떤 사진에 무엇을 해야 하는지" 대조용이다.
 */

import type { RetouchItem } from "./RetouchStage";

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildRequestCsv(items: RetouchItem[]): string {
  const head = ["photo_id", "filename", "request", "point_requests", "has_result"];
  const rows = items.map((it) => {
    const points = it.points
      .map((p, i) => `${i + 1}(${Math.round(p.x * 100)}%,${Math.round(p.y * 100)}%): ${p.useRefinedText && p.refinedText ? p.refinedText : p.text}`)
      .join(" | ");
    return [it.photo.photoId, it.photo.originalFileName, it.requestText ?? "", points, it.hasResult ? "Y" : "N"].map(csvCell).join(",");
  });
  return "﻿" + [head.join(","), ...rows].join("\r\n");
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 사진 + CSV를 ZIP으로 — 진행은 onProgress(받은 장수). 못 받은 사진은 건너뛰고 목록을 돌려준다 */
export async function buildRetouchZip(
  items: RetouchItem[],
  csv: string,
  onProgress: (done: number) => void,
  signal?: AbortSignal,
): Promise<{ blob: Blob; missing: string[] }> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("requests.csv", csv);
  const missing: string[] = [];
  const used = new Set<string>();
  let done = 0;
  for (const it of items) {
    if (signal?.aborted) throw new DOMException("중단", "AbortError");
    let name = it.photo.originalFileName.replace(/\.[^.]+$/, "") + ".jpg";
    if (used.has(name)) name = name.replace(/\.jpg$/, `_${it.photo.photoId}.jpg`);
    used.add(name);
    try {
      if (!it.photo.viewUrl) throw new Error("no url");
      const res = await fetch(it.photo.viewUrl, { signal });
      if (!res.ok) throw new Error(String(res.status));
      zip.file(name, await res.blob());
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      missing.push(it.photo.originalFileName);
    }
    done++;
    onProgress(done);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  return { blob, missing };
}
