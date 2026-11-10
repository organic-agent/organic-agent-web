"use client";

/**
 * 앨범 편집 상태(이슈 168) — 앨범 · 펼침면 이동
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumEditor.ts
 */

import { useCallback, useMemo, useState } from "react";
import { goSpread, indexFrames } from "@/lib/album/model";
import type { AlbumDoc } from "@/lib/album/store";

export function useAlbumEditor(initialDoc: AlbumDoc) {
  const [album, setAlbum] = useState(initialDoc.album);
  const F = useMemo(() => indexFrames(album.spreads), [album.spreads]);

  const go = useCallback((spread: number) => setAlbum((a) => goSpread(a, indexFrames(a.spreads), spread)), []);

  return { album, F, go };
}
