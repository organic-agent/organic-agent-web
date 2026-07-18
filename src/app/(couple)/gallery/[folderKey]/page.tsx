"use client";

/**
 * 부부 — 폴더 상세 (사진 셀렉)
 * 위치: src/app/(couple)/gallery/[folderKey]/page.tsx
 *
 * 카테고리 폴더 안의 사진을 넘겨보며 후보/고민중/제외를 판단한다.
 * 우측 정보 패널에서 선택 앨범, 협업 셀렉, 메모, 보정 요청,
 * 조회 기록과 진행 요약을 함께 관리한다.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import {
  DEMO_GALLERY_ID,
  SELECT_TARGET,
  addPhotoToFolder,
  addToSelected,
  createFolder,
  getFolderByKey,
  recordPhotoView,
  removeFromSelected,
  setCompareTag,
  setPhotoMemo,
  setRetouchRequest,
  useCompareTags,
  useFolders,
  usePhotoMemos,
  usePhotoViewHistory,
  useRetouchRequests,
  useSelectedIds,
  type CompareTag,
} from "@/lib/couple";
import { useGalleries } from "@/lib/galleries";
import { CollaborationAddModal } from "./_components/CollaborationAddModal";
import { GalleryInfoPanel } from "./_components/GalleryInfoPanel";
import { PhotoFilmstrip } from "./_components/PhotoFilmstrip";
import {
  PhotoFilterChips,
  type PhotoFilter,
} from "./_components/PhotoFilterChips";
import { PhotoViewer } from "./_components/PhotoViewer";

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

const SUMMARY_PANEL_STORAGE_KEY = "wes.galleryDetail.summaryPanelHeight";
const SUMMARY_PANEL_DEFAULT_HEIGHT = 238;
const SUMMARY_PANEL_MIN_HEIGHT = 178;
const SUMMARY_PANEL_MAX_HEIGHT = 420;

function clampSummaryPanelHeight(value: number) {
  return Math.min(
    SUMMARY_PANEL_MAX_HEIGHT,
    Math.max(SUMMARY_PANEL_MIN_HEIGHT, value),
  );
}

export default function FolderDetailPage() {
  const { folderKey } = useParams<{ folderKey: string }>();
  const router = useRouter();
  const selectedIds = useSelectedIds();
  const compareTags = useCompareTags();
  const collaborationFolders = useFolders();
  const photoMemos = usePhotoMemos();
  const photoViewHistory = usePhotoViewHistory();
  const retouchRequests = useRetouchRequests();
  const galleries = useGalleries();
  const selectedSet = new Set(selectedIds);
  const submitted = Boolean(
    galleries.find((g) => g.id === DEMO_GALLERY_ID)?.selectionSubmittedAt,
  );
  // 한글 키가 URL에서 퍼센트 인코딩되어 올 수 있으므로 복원
  let decodedKey = folderKey;
  try {
    decodedKey = decodeURIComponent(folderKey);
  } catch {
    /* 무시 */
  }
  const folder = getFolderByKey(decodedKey);

  const [current, setCurrent] = useState(0);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all");
  // 우측 정보 패널 접기/펴기
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState("");
  const [collaborationModalOpen, setCollaborationModalOpen] = useState(false);
  const [collaborationNotice, setCollaborationNotice] = useState("");
  const [collaborationModalMode, setCollaborationModalMode] = useState<
    "select" | "create"
  >("select");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderMemo, setNewFolderMemo] = useState("");
  const [summaryPanelHeight, setSummaryPanelHeight] = useState(() => {
    if (typeof window === "undefined") return SUMMARY_PANEL_DEFAULT_HEIGHT;
    const saved = window.localStorage.getItem(SUMMARY_PANEL_STORAGE_KEY);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed)
      ? clampSummaryPanelHeight(parsed)
      : SUMMARY_PANEL_DEFAULT_HEIGHT;
  });
  const summaryResizeStart = useRef<{ y: number; height: number } | null>(null);
  const lastRecordedPhotoId = useRef<number | null>(null);
  const total = folder?.photos.length ?? 0;
  const visiblePhotosForHistory =
    folder?.photos.filter((item) => {
      const tag = compareTags[item.id];
      if (photoFilter === "all") return true;
      if (photoFilter === "selected") return selectedSet.has(item.id);
      if (photoFilter === "undecided") return !tag;
      return tag === photoFilter;
    }) ?? [];
  const historyPhotoIndex =
    visiblePhotosForHistory.length > 0
      ? Math.min(current, visiblePhotosForHistory.length - 1)
      : 0;
  const historyPhotoId = visiblePhotosForHistory[historyPhotoIndex]?.id;

  // 키보드 ← → 로 사진 이동
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight")
        setCurrent((c) => Math.min(total - 1, c + 1));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total]);

  useEffect(() => {
    if (!historyPhotoId || lastRecordedPhotoId.current === historyPhotoId)
      return;
    lastRecordedPhotoId.current = historyPhotoId;
    recordPhotoView(historyPhotoId);
  }, [historyPhotoId]);

  if (!folder) {
    return (
      <div className="min-h-dvh bg-white grid place-items-center px-6">
        <div className="text-center">
          <p className="text-[14px] text-ink-2 mb-3">폴더를 찾을 수 없어요</p>
          <Link
            href="/gallery"
            className="text-[13px] text-accent hover:text-accent-press underline underline-offset-2"
          >
            갤러리로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const allFolderPhotos = folder.photos;
  const photos = allFolderPhotos.filter((item) => {
    const tag = compareTags[item.id];
    if (photoFilter === "all") return true;
    if (photoFilter === "selected") return selectedSet.has(item.id);
    if (photoFilter === "undecided") return !tag;
    return tag === photoFilter;
  });
  const filteredTotal = photos.length;
  const currentIndex =
    filteredTotal > 0 ? Math.min(current, filteredTotal - 1) : 0;
  const photo = photos[currentIndex];
  const currentDecision = photo ? compareTags[photo.id] : undefined;
  const currentMemo = photo ? photoMemos[photo.id] ?? "" : "";
  const currentRetouchRequest = photo ? retouchRequests[photo.id] ?? "" : "";
  const currentViewHistory = photo ? photoViewHistory[photo.id] : undefined;
  const isSelected = photo ? selectedSet.has(photo.id) : false;
  const folderSelectedCount = allFolderPhotos.filter((p) =>
    selectedSet.has(p.id),
  ).length;
  const decisionCounts = allFolderPhotos.reduce(
    (acc, item) => {
      const tag = compareTags[item.id];
      if (tag === "good") acc.good += 1;
      else if (tag === "hold") acc.hold += 1;
      else if (tag === "remove") acc.remove += 1;
      else acc.undecided += 1;
      return acc;
    },
    { good: 0, hold: 0, remove: 0, undecided: 0 },
  );
  const filterCounts: Record<PhotoFilter, number> = {
    all: total,
    selected: folderSelectedCount,
    good: decisionCounts.good,
    hold: decisionCounts.hold,
    remove: decisionCounts.remove,
    undecided: decisionCounts.undecided,
  };
  const reviewedCount =
    decisionCounts.good + decisionCounts.hold + decisionCounts.remove;
  const folderProgressItems = [
    {
      label: "후보",
      value: decisionCounts.good,
      className: "bg-select",
    },
    {
      label: "고민중",
      value: decisionCounts.hold,
      className: "bg-hold",
    },
    {
      label: "제외",
      value: decisionCounts.remove,
      className: "bg-ink",
    },
    {
      label: "미정",
      value: decisionCounts.undecided,
      className: "bg-line-strong",
    },
  ];

  function toggleSelected() {
    if (!photo || submitted) return;
    if (isSelected) {
      removeFromSelected(photo.id);
      setSelectionNotice("");
      return;
    }
    const result = addToSelected([photo.id]);
    setSelectionNotice(
      result.rejectedCount > 0
        ? `선택 앨범은 최대 ${SELECT_TARGET}장까지 담을 수 있어요.`
        : "",
    );
  }

  function chooseFilter(nextFilter: PhotoFilter) {
    setPhotoFilter(nextFilter);
    setCurrent(0);
  }

  function applyDecision(tag: CompareTag) {
    if (!photo || submitted) return;
    setCompareTag(photo.id, tag);
  }

  function updateCurrentMemo(value: string) {
    if (!photo || submitted) return;
    setPhotoMemo(photo.id, value);
  }

  function updateCurrentRetouchRequest(value: string) {
    if (!photo || submitted) return;
    setRetouchRequest(photo.id, value);
  }

  function addCurrentPhotoToCollaborationFolder(folderId: string) {
    if (!photo) return;
    addPhotoToFolder(folderId, photo);
    const targetFolder = collaborationFolders.find((item) => item.id === folderId);
    setCollaborationNotice(
      targetFolder
        ? `${targetFolder.name} 폴더에 사진을 담았어요.`
        : "협업 폴더에 사진을 담았어요.",
    );
    setCollaborationModalOpen(false);
  }

  function createCollaborationFolderWithCurrentPhoto() {
    if (!photo || !newFolderName.trim()) return;
    const created = createFolder({
      name: newFolderName.trim(),
      memo: newFolderMemo.trim(),
      photos: [photo],
    });
    setCollaborationModalOpen(false);
    setCollaborationModalMode("select");
    setNewFolderName("");
    setNewFolderMemo("");
    router.push(`/collaboration/${created.id}`);
  }

  function openCollaborationModal() {
    if (!photo) return;
    setCollaborationNotice("");
    setNewFolderName("");
    setNewFolderMemo("");
    setCollaborationModalMode(
      collaborationFolders.length === 0 ? "create" : "select",
    );
    setCollaborationModalOpen(true);
  }

  function startSummaryResize(e: React.MouseEvent<HTMLButtonElement>) {
    summaryResizeStart.current = {
      y: e.clientY,
      height: summaryPanelHeight,
    };
    let latestHeight = summaryPanelHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    function handleMouseMove(event: MouseEvent) {
      const start = summaryResizeStart.current;
      if (!start) return;
      const nextHeight = clampSummaryPanelHeight(
        start.height - (event.clientY - start.y),
      );
      latestHeight = nextHeight;
      setSummaryPanelHeight(nextHeight);
    }

    function handleMouseUp() {
      const start = summaryResizeStart.current;
      summaryResizeStart.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (start) {
        window.localStorage.setItem(
          SUMMARY_PANEL_STORAGE_KEY,
          String(clampSummaryPanelHeight(latestHeight)),
        );
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function resetSummaryPanelHeight() {
    setSummaryPanelHeight(SUMMARY_PANEL_DEFAULT_HEIGHT);
    window.localStorage.setItem(
      SUMMARY_PANEL_STORAGE_KEY,
      String(SUMMARY_PANEL_DEFAULT_HEIGHT),
    );
  }

  return (
    <div className="h-dvh bg-white flex overflow-hidden">
      {/* ═══ 좌: 공용 사이드바 ═══ */}
      <AppSidebar
        menu={SIDEBAR_ITEMS}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />

      {/* ═══ 가운데: 메인 셀렉 영역 ═══ */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 최상단: 뒤로가기 + 폴더명 + 필터 줄 */}
        <header className="h-16 shrink-0 border-b border-line flex items-center gap-4 px-6">
          <Link
            href="/gallery"
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep transition-colors shrink-0"
            aria-label="갤러리로"
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
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-display-ko font-medium text-[18px] text-ink leading-none shrink-0">
            {folder.label}
          </h1>

          <PhotoFilterChips
            activeFilter={photoFilter}
            counts={filterCounts}
            onChange={chooseFilter}
          />
        </header>

        <PhotoFilmstrip
          photos={photos}
          currentIndex={currentIndex}
          onSelect={setCurrent}
        />

        <PhotoViewer
          photos={photos}
          currentIndex={currentIndex}
          onChangeIndex={setCurrent}
          onShowAll={() => chooseFilter("all")}
        />
      </div>

      <GalleryInfoPanel
        collapsed={infoCollapsed}
        onToggleCollapsed={() => setInfoCollapsed((prev) => !prev)}
        photo={photo}
        submitted={submitted}
        currentDecision={currentDecision}
        onDecisionChange={applyDecision}
        isSelected={isSelected}
        selectedCount={selectedIds.length}
        selectedTarget={SELECT_TARGET}
        onToggleSelected={toggleSelected}
        selectionNotice={selectionNotice}
        onOpenCollaborationModal={openCollaborationModal}
        collaborationNotice={collaborationNotice}
        currentMemo={currentMemo}
        onMemoChange={updateCurrentMemo}
        currentRetouchRequest={currentRetouchRequest}
        onRetouchRequestChange={updateCurrentRetouchRequest}
        currentViewHistory={currentViewHistory}
        summaryPanelHeight={summaryPanelHeight}
        onStartSummaryResize={startSummaryResize}
        onResetSummaryPanelHeight={resetSummaryPanelHeight}
        reviewedCount={reviewedCount}
        total={total}
        progressItems={folderProgressItems}
        folderSelectedCount={folderSelectedCount}
      />

      {collaborationModalOpen && photo && (
        <CollaborationAddModal
          photo={photo}
          folders={collaborationFolders}
          mode={collaborationModalMode}
          folderName={newFolderName}
          folderMemo={newFolderMemo}
          onClose={() => setCollaborationModalOpen(false)}
          onModeChange={setCollaborationModalMode}
          onFolderNameChange={setNewFolderName}
          onFolderMemoChange={setNewFolderMemo}
          onAddToFolder={addCurrentPhotoToCollaborationFolder}
          onCreateFolder={createCollaborationFolderWithCurrentPhoto}
        />
      )}
    </div>
  );
}
