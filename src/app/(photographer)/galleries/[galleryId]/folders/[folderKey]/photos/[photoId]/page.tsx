"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { PhotoDetailStage } from "@/components/gallery/PhotoDetailStage";
import {
  useCompareTags,
  usePhotoMemos,
  useRetouchRequests,
  useSelectedIds,
} from "@/lib/couple";
import { useGalleryFolders } from "@/lib/galleryPhotos";
import { PhotographerPhotoInfoPanel } from "./PhotographerPhotoInfoPanel";

export default function PhotographerPhotoDetailPage() {
  const { galleryId, folderKey, photoId } = useParams<{
    galleryId: string;
    folderKey: string;
    photoId: string;
  }>();
  const searchParams = useSearchParams();
  const compareTags = useCompareTags();
  const selectedSet = new Set(useSelectedIds());
  const galleryFolders = useGalleryFolders();
  const photoMemos = usePhotoMemos();
  const retouchRequests = useRetouchRequests();
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  let decodedKey = folderKey;
  try {
    decodedKey = decodeURIComponent(folderKey);
  } catch {}
  const folder = galleryFolders.find((item) => item.key === decodedKey);
  const photo = folder?.photos.find((item) => item.id === Number(photoId));

  if (!folder || !photo) {
    return (
      <div className="min-h-dvh grid place-items-center text-center px-6">
        <div>
          <p className="text-sm text-ink-2 mb-3">사진을 찾을 수 없어요.</p>
          <Link href={`/galleries/${galleryId}`} className="text-sm text-accent underline">
            스튜디오 갤러리로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const gridHref = `/galleries/${galleryId}/folders/${encodeURIComponent(folder.key)}`;
  const fromFinalSelection = searchParams.get("from") === "final-selection";
  const showIncompleteOnly = searchParams.get("workStatus") === "incomplete";
  const finalSelectionHref = `/galleries/${galleryId}/final-selection${
    showIncompleteOnly ? "?workStatus=incomplete#work-status" : ""
  }`;
  const detailContext = fromFinalSelection
    ? `?from=final-selection${showIncompleteOnly ? "&workStatus=incomplete" : ""}`
    : "";
  const detailPhotos = fromFinalSelection
    ? galleryFolders.flatMap((item) =>
        item.photos
          .filter((target) => selectedSet.has(target.id) || target.id === photo.id)
          .map((target) => ({ ...target, folderKey: item.key })),
      )
    : folder.photos.map((item) => ({ ...item, folderKey: folder.key }));

  return (
    <div className="h-dvh bg-white flex overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-line flex items-center gap-4 px-6">
          <Link
            href={fromFinalSelection ? finalSelectionHref : gridHref}
            aria-label={
              fromFinalSelection
                ? "최종 선택본으로 돌아가기"
                : "사진 그리드로 돌아가기"
            }
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep"
          >
            ←
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-3">
              민준 & 서연 · {fromFinalSelection ? "최종 선택본" : "작가 갤러리"}
            </p>
            <h1 className="font-display-ko font-medium text-[17px] text-ink truncate">
              {folder.label}
            </h1>
          </div>
        </header>
        <PhotoDetailStage
          photos={detailPhotos}
          currentPhotoId={photo.id}
          hrefForPhoto={(item) =>
            `/galleries/${galleryId}/folders/${encodeURIComponent(item.folderKey)}/photos/${item.id}${detailContext}`
          }
        />
      </div>
      <PhotographerPhotoInfoPanel
        collapsed={infoCollapsed}
        onToggleCollapsed={() => setInfoCollapsed((current) => !current)}
        photo={photo}
        folderLabel={folder.label}
        decision={compareTags[photo.id]}
        selected={selectedSet.has(photo.id)}
        memo={photoMemos[photo.id] ?? ""}
        retouchRequest={retouchRequests[photo.id] ?? ""}
      />
    </div>
  );
}
