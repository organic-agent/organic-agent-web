"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import {
  DEMO_GALLERY_ID,
  SELECT_TARGET,
  addToSelected,
  clearAutoGood,
  clearCompareTag,
  getFolderByKey,
  isAutoGood,
  markAutoGood,
  recordPhotoView,
  removeFromSelected,
  setCompareTag,
  setPhotoMemo,
  setRetouchRequest,
  toggleCompareTag,
  useCompareTags,
  usePhotoMemos,
  usePhotoViewHistory,
  useRetouchRequests,
  useSelectedIds,
  type CompareTag,
  type Photo,
} from "@/lib/couple";
import { useGalleries } from "@/lib/galleries";
import {
  PHOTO_FILTERS,
  type PhotoFilter,
} from "../../_components/PhotoFilterChips";
import {
  SelectionConflictModal,
  type SelectionConflictKind,
} from "../../_components/SelectionConflictModal";
import { ComparisonInfoPanel } from "./ComparisonInfoPanel";
import { ComparisonPhotoCard } from "./ComparisonPhotoCard";

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

type Pair = [number, number];

type PendingSelectionConflict = {
  kind: SelectionConflictKind;
  photoId: number;
};

type Props = {
  folderKey: string;
  initialLeftPhotoId: number;
  initialRightPhotoId: number;
  initialFilter: string;
};

function isPhotoFilter(value: string): value is PhotoFilter {
  return PHOTO_FILTERS.some((filter) => filter.key === value);
}

function filterPhotos(
  photos: Photo[],
  filter: PhotoFilter,
  compareTags: Record<number, CompareTag>,
  selectedSet: Set<number>,
) {
  return photos.filter((photo) => {
    const tag = compareTags[photo.id];
    if (filter === "all") return true;
    if (filter === "selected") return selectedSet.has(photo.id);
    if (filter === "undecided") return !tag;
    return tag === filter;
  });
}

function initialPairFor(
  photos: Photo[],
  leftPhotoId: number,
  rightPhotoId: number,
): Pair {
  const leftExists = photos.some((photo) => photo.id === leftPhotoId);
  const rightExists = photos.some((photo) => photo.id === rightPhotoId);
  if (leftExists && rightExists && leftPhotoId !== rightPhotoId) {
    return [leftPhotoId, rightPhotoId];
  }
  return [photos[0]?.id ?? 0, photos[1]?.id ?? photos[0]?.id ?? 0];
}

export function ComparisonWorkspace({
  folderKey,
  initialLeftPhotoId,
  initialRightPhotoId,
  initialFilter,
}: Props) {
  const router = useRouter();
  const folder = getFolderByKey(folderKey);
  const compareTags = useCompareTags();
  const selectedIds = useSelectedIds();
  const photoMemos = usePhotoMemos();
  const photoViewHistory = usePhotoViewHistory();
  const retouchRequests = useRetouchRequests();
  const galleries = useGalleries();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const photoFilter = isPhotoFilter(initialFilter) ? initialFilter : "all";
  const allPhotos = folder?.photos ?? [];
  const [pairHistory, setPairHistory] = useState<Pair[]>(() => [
    initialPairFor(allPhotos, initialLeftPhotoId, initialRightPhotoId),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activePhotoId, setActivePhotoId] = useState(
    pairHistory[0]?.[0] ?? 0,
  );
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState("");
  const [pendingSelectionConflict, setPendingSelectionConflict] =
    useState<PendingSelectionConflict | null>(null);
  const submitted = Boolean(
    galleries.find((gallery) => gallery.id === DEMO_GALLERY_ID)
      ?.selectionSubmittedAt,
  );

  const currentPair = pairHistory[historyIndex] ?? pairHistory[0];
  const leftPhoto = allPhotos.find((photo) => photo.id === currentPair?.[0]);
  const rightPhoto = allPhotos.find((photo) => photo.id === currentPair?.[1]);
  const activePhoto =
    allPhotos.find((photo) => photo.id === activePhotoId) ?? leftPhoto;
  const leftPhotoViewId = leftPhoto?.id;
  const rightPhotoViewId = rightPhoto?.id;
  const filteredPhotos = filterPhotos(
    allPhotos,
    photoFilter,
    compareTags,
    selectedSet,
  );
  const filterLabel =
    PHOTO_FILTERS.find((filter) => filter.key === photoFilter)?.label ?? "전체";

  const nextPair = useMemo(() => {
    if (!currentPair) return undefined;
    const filteredIds = filteredPhotos.map((photo) => photo.id);
    const seenIds = new Set(
      pairHistory.slice(0, historyIndex + 1).flatMap((pair) => pair),
    );
    const unseenIds = filteredIds.filter((photoId) => !seenIds.has(photoId));
    const activeAnchor = filteredIds.includes(activePhotoId)
      ? activePhotoId
      : currentPair.find((photoId) => filteredIds.includes(photoId));

    if (activeAnchor !== undefined && unseenIds.length > 0) {
      return [activeAnchor, unseenIds[0]] as Pair;
    }
    if (activeAnchor === undefined && unseenIds.length >= 2) {
      return [unseenIds[0], unseenIds[1]] as Pair;
    }
    return undefined;
  }, [activePhotoId, currentPair, filteredPhotos, historyIndex, pairHistory]);

  useEffect(() => {
    if (!leftPhotoViewId || !rightPhotoViewId) return;
    recordPhotoView(leftPhotoViewId);
    recordPhotoView(rightPhotoViewId);
  }, [leftPhotoViewId, rightPhotoViewId]);

  if (
    !folder ||
    !leftPhoto ||
    !rightPhoto ||
    !activePhoto ||
    allPhotos.length < 2
  ) {
    return (
      <div className="min-h-dvh bg-white grid place-items-center px-6 text-center">
        <div>
          <p className="text-[14px] text-ink-2 mb-3">
            비교할 사진 두 장을 찾을 수 없어요.
          </p>
          <Link
            href={`/gallery/${encodeURIComponent(folderKey)}`}
            className="text-[13px] text-accent underline underline-offset-2"
          >
            사진 그리드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  function applyDecision(photoId: number, tag: CompareTag) {
    if (submitted) return;
    setActivePhotoId(photoId);
    setSelectionNotice("");
    if (
      tag === "remove" &&
      compareTags[photoId] !== "remove" &&
      selectedSet.has(photoId)
    ) {
      setPendingSelectionConflict({ kind: "exclude-selected", photoId });
      return;
    }
    toggleCompareTag(photoId, tag);
  }

  function toggleSelected(photoId: number) {
    if (submitted) return;
    setActivePhotoId(photoId);
    setSelectionNotice("");
    if (selectedSet.has(photoId)) {
      // 담기로 자동으로 붙은 후보만 함께 해제 (직접 지정한 후보는 유지)
      const wasAutoGood =
        compareTags[photoId] === "good" && isAutoGood(photoId);
      removeFromSelected(photoId);
      clearAutoGood(photoId);
      if (wasAutoGood) clearCompareTag(photoId);
      return;
    }
    if (compareTags[photoId] === "remove") {
      setPendingSelectionConflict({ kind: "select-excluded", photoId });
      return;
    }
    const result = addToSelected([photoId]);
    if (result.added.includes(photoId) && !compareTags[photoId]) {
      setCompareTag(photoId, "good");
      markAutoGood(photoId);
    }
    setSelectionNotice(
      result.rejectedCount > 0
        ? `선택 앨범은 최대 ${SELECT_TARGET}장까지 담을 수 있어요.`
        : "",
    );
  }

  function confirmSelectionConflict() {
    if (!pendingSelectionConflict || submitted) return;
    const { kind, photoId } = pendingSelectionConflict;
    setPendingSelectionConflict(null);
    setSelectionNotice("");

    if (kind === "exclude-selected") {
      removeFromSelected(photoId);
      setCompareTag(photoId, "remove");
      return;
    }

    const result = addToSelected([photoId]);
    if (result.added.includes(photoId)) {
      setCompareTag(photoId, "good");
      markAutoGood(photoId);
    }
    if (result.rejectedCount > 0) {
      setSelectionNotice(
        `선택 앨범은 최대 ${SELECT_TARGET}장까지 담을 수 있어요.`,
      );
    }
  }

  function showPreviousPair() {
    if (historyIndex === 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setActivePhotoId(pairHistory[nextIndex][0]);
    setSelectionNotice("");
  }

  function showNextPair() {
    if (historyIndex < pairHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setActivePhotoId(pairHistory[nextIndex][0]);
      setSelectionNotice("");
      return;
    }
    if (!nextPair) return;
    const nextHistory = [...pairHistory.slice(0, historyIndex + 1), nextPair];
    setPairHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setActivePhotoId(nextPair[0]);
    setSelectionNotice("");
  }

  const activeLabel = activePhoto.id === rightPhoto.id ? "B" : "A";
  const canMoveNext = historyIndex < pairHistory.length - 1 || Boolean(nextPair);

  return (
    <div className="h-dvh bg-white flex overflow-hidden">
      <AppSidebar
        menu={SIDEBAR_ITEMS}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 border-b border-line px-5 flex items-center gap-3 bg-white">
          <Link
            href={`/gallery/${encodeURIComponent(folder.key)}/photos/${leftPhoto.id}`}
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep transition-colors shrink-0"
            aria-label="사진 상세로 돌아가기"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display-ko text-[17px] font-medium text-ink">
              {folder.label}
            </h1>
            <p className="text-[11px] text-ink-3">
              2장 비교 중 · {filterLabel} {filteredPhotos.length}장
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-9 px-3.5 rounded-pill border border-line text-[12px] font-medium text-ink-2 hover:border-ink-3 hover:text-ink transition-colors"
            >
              사진 다시 선택
            </button>
            <Link
              href={`/gallery/${encodeURIComponent(folder.key)}/photos/${activePhoto.id}`}
              className="h-9 px-3.5 rounded-pill bg-ink text-on-ink text-[12px] font-medium inline-flex items-center"
            >
              비교 종료
            </Link>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden bg-paper p-4">
          <div className="h-full min-w-[680px] grid grid-cols-2 gap-4">
            <ComparisonPhotoCard
              label="A"
              photo={leftPhoto}
              active={activePhoto.id === leftPhoto.id}
              currentDecision={compareTags[leftPhoto.id]}
              isSelected={selectedSet.has(leftPhoto.id)}
              onActivate={() => {
                setActivePhotoId(leftPhoto.id);
                setSelectionNotice("");
              }}
            />
            <ComparisonPhotoCard
              label="B"
              photo={rightPhoto}
              active={activePhoto.id === rightPhoto.id}
              currentDecision={compareTags[rightPhoto.id]}
              isSelected={selectedSet.has(rightPhoto.id)}
              onActivate={() => {
                setActivePhotoId(rightPhoto.id);
                setSelectionNotice("");
              }}
            />
          </div>
        </div>

        <footer className="h-16 shrink-0 border-t border-line px-5 flex items-center justify-between gap-4 bg-white">
          <div className="min-w-0">
            <p className="text-[12px] text-ink-2">
              {activeLabel} 사진을 기준으로 다음 사진과 이어서 비교할 수 있어요.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={showPreviousPair}
              disabled={historyIndex === 0}
              className="h-9 px-4 rounded-pill border border-line text-[12px] font-medium text-ink-2 hover:border-ink-3 disabled:opacity-35 disabled:pointer-events-none"
            >
              이전 비교
            </button>
            <button
              type="button"
              onClick={showNextPair}
              disabled={!canMoveNext}
              className="h-9 px-4 rounded-pill bg-ink text-on-ink text-[12px] font-medium hover:bg-[#333] disabled:opacity-35 disabled:pointer-events-none"
            >
              다음 비교
            </button>
          </div>
        </footer>
      </div>

      <ComparisonInfoPanel
        collapsed={infoCollapsed}
        onToggleCollapsed={() => setInfoCollapsed((current) => !current)}
        photo={activePhoto}
        photoLabel={activeLabel}
        currentDecision={compareTags[activePhoto.id]}
        onDecisionChange={(tag) => applyDecision(activePhoto.id, tag)}
        isSelected={selectedSet.has(activePhoto.id)}
        selectedCount={selectedIds.length}
        selectedTarget={SELECT_TARGET}
        onToggleSelected={() => toggleSelected(activePhoto.id)}
        selectionNotice={selectionNotice}
        memo={photoMemos[activePhoto.id] ?? ""}
        onMemoChange={(value) => setPhotoMemo(activePhoto.id, value)}
        retouchRequest={retouchRequests[activePhoto.id] ?? ""}
        onRetouchRequestChange={(value) =>
          setRetouchRequest(activePhoto.id, value)
        }
        viewHistory={photoViewHistory[activePhoto.id]}
        submitted={submitted}
      />

      {pendingSelectionConflict && (
        <SelectionConflictModal
          kind={pendingSelectionConflict.kind}
          onCancel={() => setPendingSelectionConflict(null)}
          onConfirm={confirmSelectionConflict}
        />
      )}
    </div>
  );
}
