"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import {
  COMPARE_TAG_LABEL,
  DEMO_GALLERY_ID,
  SELECT_TARGET,
  addToSelected,
  clearCompareTag,
  getFolderByKey,
  markAutoGood,
  removeFromSelected,
  setCompareTag,
  useCompareTags,
  useSelectedIds,
  type CompareTag,
} from "@/lib/couple";
import { useGalleries } from "@/lib/galleries";
import {
  PhotoFilterChips,
  type PhotoFilter,
} from "./_components/PhotoFilterChips";

const SIDEBAR_ITEMS = [
  {
    key: "gallery",
    label: "카테고리 갤러리",
    href: "/gallery",
    icon: "M4 4h16v16H4zM4 12h16M12 4v16",
    active: true,
  },
  {
    key: "selected",
    label: "선택 앨범",
    href: "/selected",
    icon: "M5 3h14v18l-7-4-7 4z",
  },
  {
    key: "collaboration",
    label: "협업 셀렉",
    href: "/collaboration",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
];

export default function CoupleFolderGridPage() {
  const { folderKey } = useParams<{ folderKey: string }>();
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [batchNotice, setBatchNotice] = useState("");
  const selectedIds = useSelectedIds();
  const compareTags = useCompareTags();
  const galleries = useGalleries();
  const selectedSet = new Set(selectedIds);
  const submitted = Boolean(
    galleries.find((gallery) => gallery.id === DEMO_GALLERY_ID)
      ?.selectionSubmittedAt,
  );
  let decodedKey = folderKey;
  try {
    decodedKey = decodeURIComponent(folderKey);
  } catch {}
  const folder = getFolderByKey(decodedKey);

  if (!folder) {
    return (
      <div className="min-h-dvh grid place-items-center text-center px-6">
        <div>
          <p className="text-sm text-ink-2 mb-3">폴더를 찾을 수 없어요.</p>
          <Link href="/gallery" className="text-sm text-accent underline">
            갤러리로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const counts = folder.photos.reduce(
    (result, photo) => {
      const tag = compareTags[photo.id];
      result.all += 1;
      if (selectedSet.has(photo.id)) result.selected += 1;
      if (tag) result[tag] += 1;
      else result.undecided += 1;
      return result;
    },
    { all: 0, selected: 0, good: 0, hold: 0, remove: 0, undecided: 0 },
  );
  const photos = folder.photos.filter((photo) => {
    const tag = compareTags[photo.id];
    if (photoFilter === "all") return true;
    if (photoFilter === "selected") return selectedSet.has(photo.id);
    if (photoFilter === "undecided") return !tag;
    return tag === photoFilter;
  });
  const selectedPhotoSet = new Set(selectedPhotoIds);
  const allVisiblePhotosSelected =
    photos.length > 0 && photos.every((photo) => selectedPhotoSet.has(photo.id));

  function startSelectionMode() {
    if (submitted) return;
    setSelectionMode(true);
    setSelectedPhotoIds([]);
    setBatchNotice("");
  }

  function cancelSelectionMode() {
    setSelectionMode(false);
    setSelectedPhotoIds([]);
    setBatchNotice("");
  }

  function togglePhoto(photoId: number) {
    if (submitted) return;
    setSelectedPhotoIds((current) =>
      current.includes(photoId)
        ? current.filter((item) => item !== photoId)
        : [...current, photoId],
    );
    setBatchNotice("");
  }

  function toggleAllVisiblePhotos() {
    if (submitted) return;
    setSelectedPhotoIds(
      allVisiblePhotosSelected ? [] : photos.map((photo) => photo.id),
    );
    setBatchNotice("");
  }

  function addSelectedPhotosToAlbum() {
    if (submitted || selectedPhotoIds.length === 0) return;

    const alreadySelectedCount = selectedPhotoIds.filter((photoId) =>
      selectedSet.has(photoId),
    ).length;
    const result = addToSelected(selectedPhotoIds);
    const addedSet = new Set(result.added);
    const promotedIds = selectedPhotoIds.filter(
      (photoId) =>
        (selectedSet.has(photoId) || addedSet.has(photoId)) &&
        (compareTags[photoId] === undefined || compareTags[photoId] === "remove"),
    );
    promotedIds.forEach((photoId) => {
      setCompareTag(photoId, "good");
      markAutoGood(photoId);
    });
    const messages: string[] = [];

    if (result.added.length > 0) {
      messages.push(`${result.added.length}장을 선택 앨범에 담았어요.`);
    }
    if (promotedIds.length > 0) {
      messages.push(`미정·제외 사진 ${promotedIds.length}장은 후보로 변경했어요.`);
    }
    if (alreadySelectedCount > 0) {
      messages.push(`${alreadySelectedCount}장은 이미 선택 앨범에 있어요.`);
    }
    if (result.rejectedCount > 0) {
      messages.push(
        `${result.rejectedCount}장은 최대 ${SELECT_TARGET}장 제한으로 담지 못했어요.`,
      );
    }

    setBatchNotice(messages.join(" "));
    setSelectedPhotoIds([]);
  }

  function applyTagToSelectedPhotos(tag?: CompareTag) {
    if (submitted || selectedPhotoIds.length === 0) return;

    selectedPhotoIds.forEach((photoId) => {
      if (tag === "remove") removeFromSelected(photoId);
      if (tag) setCompareTag(photoId, tag);
      else clearCompareTag(photoId);
    });

    const label = tag ? COMPARE_TAG_LABEL[tag] : "미정";
    setBatchNotice(
      tag === "remove"
        ? `${selectedPhotoIds.length}장을 제외로 지정하고 선택 앨범에서도 제거했어요.`
        : `${selectedPhotoIds.length}장의 선호도를 ${label}(으)로 지정했어요.`,
    );
    setSelectedPhotoIds([]);
  }

  return (
    <div className="min-h-dvh bg-white flex">
      <AppSidebar
        menu={SIDEBAR_ITEMS}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />
      <main className="flex-1 min-w-0">
        <header className="h-16 sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-line flex items-center gap-4 px-6 md:px-8">
          <Link
            href="/gallery"
            aria-label="갤러리로 돌아가기"
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="font-display-ko font-medium text-[18px] text-ink truncate">
              {folder.label}
            </h1>
            <p className="text-[11px] text-ink-3">사진 {folder.photos.length}장</p>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            {!selectionMode && (
              <div className="min-w-0 overflow-x-auto">
                <PhotoFilterChips
                  activeFilter={photoFilter}
                  counts={counts}
                  onChange={setPhotoFilter}
                />
              </div>
            )}
            {!selectionMode && (
              <button
                type="button"
                onClick={startSelectionMode}
                disabled={photos.length === 0 || submitted}
                title={
                  submitted
                    ? "작가에게 전달한 뒤에는 사진을 수정할 수 없어요."
                    : undefined
                }
                className="h-9 shrink-0 rounded-pill border border-line px-4 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink-3 disabled:pointer-events-none disabled:opacity-35"
              >
                여러 장 선택
              </button>
            )}
          </div>
        </header>

        <div className="px-6 md:px-8 py-8">
          {selectionMode && (
            <div className="mb-6 rounded-xl border border-line bg-paper px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-[72px] text-[13px] font-medium text-ink">
                  {selectedPhotoIds.length}장 선택
                </p>
                <button
                  type="button"
                  onClick={toggleAllVisiblePhotos}
                  className="h-9 rounded-pill border border-line bg-white px-3 text-[12px] text-ink-2 transition-colors hover:border-ink-3"
                >
                  {allVisiblePhotosSelected ? "전체 선택 해제" : "현재 목록 전체 선택"}
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addSelectedPhotosToAlbum}
                    disabled={selectedPhotoIds.length === 0}
                    className="h-9 rounded-pill bg-ink px-4 text-[12px] font-medium text-on-ink disabled:pointer-events-none disabled:opacity-35"
                  >
                    선택 앨범에 담기
                  </button>
                  <span className="ml-1 text-[11px] font-medium text-ink-3">
                    선호도 지정
                  </span>
                  <button
                    type="button"
                    onClick={() => applyTagToSelectedPhotos("good")}
                    disabled={selectedPhotoIds.length === 0}
                    className="h-9 rounded-pill border border-select px-3 text-[12px] font-medium text-select disabled:pointer-events-none disabled:opacity-35"
                  >
                    후보
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTagToSelectedPhotos("hold")}
                    disabled={selectedPhotoIds.length === 0}
                    className="h-9 rounded-pill border border-hold px-3 text-[12px] font-medium text-hold disabled:pointer-events-none disabled:opacity-35"
                  >
                    고민중
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTagToSelectedPhotos("remove")}
                    disabled={selectedPhotoIds.length === 0}
                    className="h-9 rounded-pill border border-ink-3 px-3 text-[12px] font-medium text-ink disabled:pointer-events-none disabled:opacity-35"
                  >
                    제외
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTagToSelectedPhotos()}
                    disabled={selectedPhotoIds.length === 0}
                    className="h-9 rounded-pill border border-line bg-white px-3 text-[12px] font-medium text-ink-2 disabled:pointer-events-none disabled:opacity-35"
                  >
                    미정
                  </button>
                  <button
                    type="button"
                    onClick={cancelSelectionMode}
                    className="h-9 rounded-pill px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-white hover:text-ink"
                  >
                    취소
                  </button>
                </div>
              </div>
              {batchNotice && (
                <p
                  role="status"
                  className="mt-3 border-t border-line pt-3 text-[12px] text-ink-2"
                >
                  {batchNotice}
                </p>
              )}
            </div>
          )}
          <PhotoGrid
            photos={photos}
            showIdBadge={false}
            hrefForPhoto={(photo) =>
              `/gallery/${encodeURIComponent(folder.key)}/photos/${photo.id}`
            }
            footerForPhoto={(photo) => (
              <span className="font-mono text-[11px] text-ink-3">
                #{String(photo.id).padStart(3, "0")}
              </span>
            )}
            emptyMessage="현재 필터에 해당하는 사진이 없어요."
            selectionMode={selectionMode}
            selectedIds={selectedPhotoSet}
            onTogglePhoto={(photo) => togglePhoto(photo.id)}
          />
        </div>
      </main>
    </div>
  );
}
