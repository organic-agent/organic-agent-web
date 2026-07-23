"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { usePhotoMemos, useRetouchRequests } from "@/lib/couple";
import {
  getGalleryFolderOptions,
  movePhotosToFolder,
  useCompareTags,
  useGalleryFolders,
  useSelectedIds,
} from "@/lib/galleryPhotos";

type PhotoStatusFilter =
  | "all"
  | "selected"
  | "good"
  | "hold"
  | "remove"
  | "undecided"
  | "retouch";

const STATUS_FILTERS: { key: PhotoStatusFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "selected", label: "선택앨범" },
  { key: "good", label: "후보" },
  { key: "hold", label: "고민중" },
  { key: "remove", label: "제외" },
  { key: "undecided", label: "미정" },
  { key: "retouch", label: "보정요청" },
];

export default function PhotographerFolderGridPage() {
  const { galleryId, folderKey } = useParams<{
    galleryId: string;
    folderKey: string;
  }>();
  const router = useRouter();
  const compareTags = useCompareTags();
  const albumSelectedSet = new Set(useSelectedIds());
  const photoMemos = usePhotoMemos();
  const retouchRequests = useRetouchRequests();
  const folders = useGalleryFolders();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [targetFolderKey, setTargetFolderKey] = useState("");
  const [statusFilter, setStatusFilter] = useState<PhotoStatusFilter>("all");
  let decodedKey = folderKey;
  try {
    decodedKey = decodeURIComponent(folderKey);
  } catch {}
  const folder = folders.find((item) => item.key === decodedKey);

  if (!folder) {
    return (
      <div className="min-h-dvh grid place-items-center text-center px-6">
        <div>
          <p className="text-sm text-ink-2 mb-3">폴더를 찾을 수 없어요.</p>
          <Link href={`/galleries/${galleryId}`} className="text-sm text-accent underline">
            스튜디오 갤러리로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const currentFolder = folder;
  const selectedPhotoSet = new Set(selectedPhotoIds);
  const targetFolders = getGalleryFolderOptions().filter(
    (item) => item.key !== currentFolder.key,
  );

  // 사진 하나가 특정 상태 필터에 해당하는지 판단한다.
  function matchesStatus(photoId: number, filter: PhotoStatusFilter): boolean {
    const tag = compareTags[photoId];
    if (filter === "all") return true;
    if (filter === "selected") return albumSelectedSet.has(photoId);
    if (filter === "undecided") return !tag;
    if (filter === "retouch") return Boolean(retouchRequests[photoId]);
    return tag === filter; // good · hold · remove
  }

  const visiblePhotos = currentFolder.photos.filter((photo) =>
    matchesStatus(photo.id, statusFilter),
  );
  const visibleIds = visiblePhotos.map((photo) => photo.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedPhotoSet.has(id));
  const statusCounts = STATUS_FILTERS.reduce(
    (acc, item) => {
      acc[item.key] = currentFolder.photos.filter((photo) =>
        matchesStatus(photo.id, item.key),
      ).length;
      return acc;
    },
    {} as Record<PhotoStatusFilter, number>,
  );

  function toggleSelectionMode() {
    setSelectionMode((current) => !current);
    setSelectedPhotoIds([]);
    setTargetFolderKey("");
  }

  function togglePhoto(photoId: number) {
    setSelectedPhotoIds((current) =>
      current.includes(photoId)
        ? current.filter((item) => item !== photoId)
        : [...current, photoId],
    );
  }

  // 현재 필터에 보이는 사진 전체를 선택/해제한다.
  function toggleAllPhotos() {
    setSelectedPhotoIds(allVisibleSelected ? [] : visibleIds);
  }

  function moveSelectedPhotos() {
    const target = targetFolders.find((item) => item.key === targetFolderKey);
    if (!target || selectedPhotoIds.length === 0) return;
    const movingEveryPhoto = selectedPhotoIds.length === currentFolder.photos.length;
    movePhotosToFolder(selectedPhotoIds, target);
    setSelectedPhotoIds([]);
    setTargetFolderKey("");
    setSelectionMode(false);
    if (movingEveryPhoto) router.push(`/galleries/${galleryId}`);
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="h-16 sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-line flex items-center gap-4 px-6 md:px-8">
        <Link
          href={`/galleries/${galleryId}`}
          aria-label="스튜디오 갤러리로 돌아가기"
          className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep"
        >
          ←
        </Link>
        <div>
          <p className="text-[11px] text-ink-3">민준 & 서연 · 사진 폴더</p>
          <h1 className="font-display-ko font-medium text-[18px] text-ink">
            {currentFolder.label}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <p className="text-[13px] text-ink-2">사진 {currentFolder.photos.length}장</p>
          <button
            type="button"
            onClick={toggleSelectionMode}
            className={`h-9 px-4 rounded-pill text-[12px] font-medium border transition-colors ${
              selectionMode
                ? "bg-ink text-on-ink border-ink"
                : "border-line text-ink-2 hover:border-ink-3"
            }`}
          >
            {selectionMode ? "취소" : "사진 이동"}
          </button>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-[15px] font-medium text-ink">사진 전체보기</h2>
          <p className="mt-1 text-[12px] text-ink-3">
            사진을 선택하면 부부의 셀렉 결과와 보정 요청을 확인할 수 있어요.
          </p>
        </div>

        {/* 상태 필터 */}
        <div className="mb-6 flex items-center gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              className={`h-8 shrink-0 px-3 rounded-pill text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 ${
                statusFilter === item.key
                  ? "bg-ink text-on-ink"
                  : "border border-line text-ink-2 hover:border-ink-3"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`font-mono text-[11px] ${
                  statusFilter === item.key ? "text-white/70" : "text-ink-3"
                }`}
              >
                {statusCounts[item.key]}
              </span>
            </button>
          ))}
        </div>

        {selectionMode && (
          <div className="mb-6 rounded-xl border border-line bg-paper px-4 py-3 flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-medium text-ink">
              {selectedPhotoIds.length}장 선택
            </p>
            <button
              type="button"
              onClick={toggleAllPhotos}
              className="h-9 px-3 rounded-pill border border-line bg-white text-[12px] text-ink-2 hover:border-ink-3"
            >
              {allVisibleSelected ? "전체 선택 해제" : "전체 선택"}
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                value={targetFolderKey}
                onChange={(event) => setTargetFolderKey(event.target.value)}
                aria-label="이동할 폴더"
                className="h-10 min-w-[190px] rounded-md border border-line bg-white px-3 text-[12px] text-ink outline-none focus:border-ink-3"
              >
                <option value="">이동할 폴더 선택</option>
                {targetFolders.map((target) => (
                  <option key={target.key} value={target.key}>
                    {target.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={moveSelectedPhotos}
                disabled={selectedPhotoIds.length === 0 || !targetFolderKey}
                className="h-10 px-4 rounded-pill bg-ink text-on-ink text-[12px] font-medium disabled:opacity-35 disabled:pointer-events-none"
              >
                선택 사진 이동
              </button>
            </div>
          </div>
        )}

        <PhotoGrid
          photos={visiblePhotos}
          showIdBadge={false}
          hrefForPhoto={(photo) =>
            `/galleries/${galleryId}/folders/${encodeURIComponent(currentFolder.key)}/photos/${photo.id}`
          }
          footerForPhoto={(photo) => (
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] text-ink-3">
                #{String(photo.id).padStart(3, "0")}
              </span>
              <span className="text-[12px] text-ink-2 truncate">
                {photoMemos[photo.id] || "메모 없음"}
              </span>
            </div>
          )}
          emptyMessage="해당 상태의 사진이 없어요."
          selectionMode={selectionMode}
          selectedIds={selectedPhotoSet}
          onTogglePhoto={(photo) => togglePhoto(photo.id)}
        />
      </main>
    </div>
  );
}
