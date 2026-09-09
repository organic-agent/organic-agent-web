/**
 * 폴더 열람 훅 — 선택한 폴더에 든 사진 전부
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_lib/useFolderPhotos.ts
 *
 * 결과에 어느 폴더의 응답인지(groupId·folderId)를 함께 담는다 — 폴더를
 * 옮겨 다닐 때 이전 폴더의 결과가 새 폴더 화면에 잘못 얹히지 않도록,
 * 호출부는 현재 폴더와 일치하는 결과만 쓰고 나머지는 로딩으로 취급한다.
 */

import { useEffect, useState } from "react";
import { getFolderDetail } from "@/lib/api/folders";
import { type GalleryPhoto, toGalleryPhoto } from "@/lib/galleryPhotos";

export type FolderPhotosResult = { groupId: number; folderId: number } & (
  | { kind: "ready"; name: string; photos: GalleryPhoto[] }
  | { kind: "error" }
);

export function useFolderPhotos(
  rawId: string,
  target: { groupId: number; folderId: number } | null,
) {
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0;
  const [result, setResult] = useState<FolderPhotosResult | null>(null);
  const [nonce, setNonce] = useState(0);
  const groupId = target?.groupId;
  const folderId = target?.folderId;

  useEffect(() => {
    if (!validId || groupId === undefined || folderId === undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getFolderDetail(id, groupId, folderId);
        if (cancelled) return;
        setResult({
          groupId,
          folderId,
          kind: "ready",
          name: res.name,
          photos: res.photos
            .filter((p) => p.viewUrl !== null)
            .map(toGalleryPhoto),
        });
      } catch {
        if (!cancelled) setResult({ groupId, folderId, kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, validId, groupId, folderId, nonce]);

  /** 실패 재시도·서명 URL 만료 시 재조회 */
  function reload() {
    setNonce((n) => n + 1);
  }

  return { result, reload };
}
