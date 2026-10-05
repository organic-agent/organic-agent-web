/**
 * 보정 자료 내려받기 — 요청서 PDF · 사진 + 요청서 ZIP (작가 3단계)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/retouchDownload.ts
 *
 * ZIP에는 서버가 만든 회차 요청서 PDF와 같은 범위의 2048px JPG(업로드 때 줄인 것)를 함께 담는다.
 * 보정 자체는 작가 컴퓨터의 원본으로 해야 하므로 ZIP은 "어떤 사진에 무엇을 해야 하는지" 대조용이다.
 */

import type { RetouchItem } from "./roundItems";

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export class RetouchZipError extends Error {}

/** 서버 PDF + 해당 사진을 ZIP으로. 사진이 빠지면 불완전한 ZIP을 저장하지 않는다. */
export async function buildRetouchZip(
  items: RetouchItem[],
  pdf: Blob,
  onProgress: (done: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  signal?.throwIfAborted();
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("요청서.pdf", await pdf.arrayBuffer());
  const missing: string[] = [];
  const used = new Set<string>();
  let done = 0;
  for (const it of items) {
    signal?.throwIfAborted();
    const raw = it.photo.originalFileName.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "").replace(/[<>:"|?*]/g, "_") ?? "";
    const base = Array.from(raw).filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
      .join("").replace(/[ .]+$/, "").slice(0, 120) || `photo_${it.photo.photoId}`;
    let name = `${base}.jpg`;
    for (let duplicate = 1; used.has(name.toLowerCase()); duplicate++) name = `${base}_${it.photo.photoId}_${duplicate}.jpg`;
    used.add(name.toLowerCase());
    try {
      if (!it.photo.viewUrl) throw new Error("no url");
      // <img>가 Origin 없이 저장한 S3 응답을 재사용하면 CORS 헤더가 빠질 수 있다.
      const res = await fetch(it.photo.viewUrl, { signal, cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength === 0) throw new Error("empty photo");
      zip.file(`photos/${name}`, bytes);
    } catch (err) {
      signal?.throwIfAborted();
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      missing.push(it.photo.originalFileName);
    }
    done++;
    onProgress(done);
  }
  if (missing.length > 0) throw new RetouchZipError(`${missing.length}장의 사진을 받지 못했어요. 화면을 새로 고친 뒤 다시 시도해 주세요 (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? " …" : ""})`);
  signal?.throwIfAborted();
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, () => signal?.throwIfAborted());
  signal?.throwIfAborted();
  return blob;
}

/** 이름 · URL 목록을 ZIP으로(보정본 내려받기 등) — 진행은 onProgress(받은 수). 못 받은 것은 건너뛰고 이름을 돌려준다 */
export async function zipFiles(
  entries: { name: string; url: string | null }[],
  extra: { name: string; text: string }[],
  onProgress: (done: number) => void,
  signal?: AbortSignal,
): Promise<{ blob: Blob; missing: string[] }> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const e of extra) zip.file(e.name, e.text);
  const missing: string[] = [];
  const used = new Set<string>();
  let done = 0;
  for (const entry of entries) {
    if (signal?.aborted) throw new DOMException("중단", "AbortError");
    let name = entry.name;
    if (used.has(name)) name = name.replace(/(\.[^.]+)?$/, `_${done + 1}$1`);
    used.add(name);
    try {
      if (!entry.url) throw new Error("no url");
      const res = await fetch(entry.url, { signal });
      if (!res.ok) throw new Error(String(res.status));
      zip.file(name, await res.blob());
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      missing.push(entry.name);
    }
    done++;
    onProgress(done);
  }
  return { blob: await zip.generateAsync({ type: "blob", compression: "STORE" }), missing };
}
