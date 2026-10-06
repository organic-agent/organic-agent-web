"use client";

/**
 * 클라이언트 3단계 보정 검토 — 보정 중 대기 · 결과 확인(전/후) · 다시 요청 · 확정 (WES-313)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ReviewStage.tsx
 *
 * 전달한 뒤(SELECTION_COMPLETED)부터 확정(ARCHIVED)까지. 회차 · 항목은 작가 3단계와 같은 API(retouch/rounds, rounds/{n})와
 * 부품(RoundList · roundItems · BeforeAfter · Lightbox)을 쓴다. 클라이언트에겐 결과가 회차를 보낸 뒤에만 보이므로
 * 진행 중 회차는 "보정 중", 마지막 회차가 COMPLETED이면 "결과 도착" — 이때 그리드 타일은 결과 사진으로 바뀐다(2026-09-12 확정).
 * 회차는 사이드바 보정 사진 아래 작가와 같은 형식.
 * 다시 요청(이슈 125, 2026-10-06): 담기 모드 없이 — 싱글뷰 "보정 요청" 탭에서 보정본 위에 점 · 문장을 적은 사진이 곧 다음 회차에
 * 들어가는 사진이다(초안은 브라우저, 다 지우면 빠진다). 그리드는 적은 사진에 "n차 요청" 표시만 하고, 하단 "n차 요청 보내기"
 * (rounds/{n}/requests, 남은 횟수 1 소진) → 보정 중. 싱글뷰는 열면 원본 한 장 · 패널 닫힘이고 조작 줄 가운데 네 칸(원본 · 보정본 ·
 * 슬라이더 · 분할)으로 비교한다. 탭은 정보(사진 정보 + 보낸 요청서) · 보정 요청(보정본이 없거나 횟수가 없으면 잠김) 둘.
 *
 * 개인 갤러리(personal, 묶음 C 2026-09-23): 작가가 없어 요청서를 내보낸 뒤 **받은 보정본을 부부가 직접 올린다** —
 * 하단 [내려받기(요청서 CSV · ZIP, 작가 모달)][보정본 올리기 → 더 올리기 → 바꾸기] + 소유자에게 [갤러리 마무리], 타일 호버 ↑로 한 장씩(작가 3단계 부품).
 * 확정은 없고 결과는 올리는 즉시 보인다. 2차 요청은 작가에게 보내는 대신 초안 회차에 담아 요청서로 내려받는다(PersonalReRequestModal).
 * 플랜 기간이 끝나면 서버가 자동 보관 — 배너 문구만 다르다.
 */

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Lightbox, type LightboxTabDef } from "@/components/app/Lightbox";
import { ArchiveIcon, BrushIcon, CheckCircleIcon, DownloadIcon, EditNoteIcon, HourglassIcon, InfoIcon, LockIcon, PhotoIcon, ScheduleIcon, SparkleIcon, UploadIcon } from "@/components/icons";
import { BeforeAfter } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/BeforeAfter";
import { CloseGalleryModal } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/CloseGalleryModal";
import { ResultUploadModal } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ResultUploadModal";
import { RetouchDownloadModal } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/RetouchDownloadModal";
import { ProgressBar } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/UploadProgress";
import { type ResultAssignment, useResultUpload } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/useResultUpload";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { hasMemo, normalizeRoundItems, type RetouchItem } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/roundItems";
import { RoundList } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/RoundList";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { SHELL_BODY_CLASS } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellSidebar";
import { useRetouchOverview, useRetouchRoundDetail } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/useRetouchOverview";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryResponse } from "@/lib/api/galleries";
import type { PhotoResponse } from "@/lib/api/photos";
import type { RetouchRequestItem } from "@/lib/api/retouch";
import { ALL_FILTER, ClientFolderTree } from "./ClientFolderTree";
import { ClientReviewCoachMarks } from "./ClientReviewCoachMarks";
import { PersonalReviewCoachMarks } from "./PersonalReviewCoachMarks";
import { ClientSidebar, type ClientView, type StatusLine } from "./ClientSidebar";
import { ConfirmRetouchModal } from "./ConfirmRetouchModal";
import { ResultsDownloadModal } from "./ResultsDownloadModal";
import type { ClientPhase } from "./clientStages";
import { PhotoInfoPanel } from "./PhotoInfoPanel";
import { draftOf, newPointId, retouchDraftStore, toRequestItems, writeDraft } from "./retouchDraft";
import { RetouchPanel, RetouchPins } from "./RetouchPanel";
import { PersonalReRequestModal } from "./PersonalReRequestModal";
import { SendReRequestModal } from "./SendReRequestModal";
import { useGuestSharing } from "./useGuestSharing";

type Tab = "none" | "info" | "request";
/** 결과가 있는 사진을 어떻게 보일지 — 조작 줄 가운데 네 칸 */
type PhotoView = "original" | "result" | "slider" | "side";
const PHOTO_VIEWS: { key: PhotoView; label: string }[] = [
  { key: "original", label: "원본" },
  { key: "result", label: "보정본" },
  { key: "slider", label: "슬라이더" },
  { key: "side", label: "분할" },
];
const EMPTY_IDS: ReadonlySet<number> = new Set();

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function ReviewStage({
  galleryId,
  gallery,
  phase,
  photos,
  folders,
  sidebarOpen,
  reloadGallery,
  inviteOpen,
  onInviteClose,
  personal = false,
  owner = false,
  autoOpenDownload = false,
  onAutoOpenDownloadHandled,
}: {
  galleryId: number;
  gallery: GalleryResponse;
  phase: ClientPhase;
  photos: PhotoResponse[];
  folders: ConceptFolderResponse[] | null;
  sidebarOpen: boolean;
  /** 확정 뒤 갤러리 단계(ARCHIVED)를 다시 읽는다 */
  reloadGallery: () => void;
  /** 상단 "게스트 초대" 버튼 */
  inviteOpen: boolean;
  onInviteClose: () => void;
  /** 개인 결제 클라이언트 — 보정본을 직접 올리고 마무리한다(다시 요청 · 확정 없음) */
  personal?: boolean;
  /** 개인 소유자 — 갤러리 마무리 버튼 */
  owner?: boolean;
  /** 요청서를 막 내보낸 뒤 — 회차가 읽히면 내려받기 모달을 바로 연다 */
  autoOpenDownload?: boolean;
  onAutoOpenDownloadHandled?: () => void;
}) {
  const { overview, error: overviewError, reload: reloadOverview } = useRetouchOverview(galleryId, true);
  const [detailNonce, setDetailNonce] = useState(0);
  // 개인 — 보정본 올리기(작가 3단계 부품) · 요청서 내려받기 · 마무리
  const [uploadOpen, setUploadOpen] = useState<{ presetPhotoId: number | null } | null>(null);
  const [requestDownloadOpen, setRequestDownloadOpen] = useState(false);
  const [autoDownloadHandled, setAutoDownloadHandled] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const slotInputRef = useRef<HTMLInputElement>(null);
  const slotTargetRef = useRef<number | null>(null);
  const [reModalOpen, setReModalOpen] = useState(false);
  const [personalReOpen, setPersonalReOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const draftsRaw = useSyncExternalStore(retouchDraftStore.subscribe, () => retouchDraftStore.readRaw(galleryId), () => "");
  const drafts = useMemo(() => retouchDraftStore.parse(draftsRaw), [draftsRaw]);
  const [selectedRoundNo, setSelectedRoundNo] = useState<number | null>(null);
  const [view, setView] = useState<ClientView>("retouch");
  const [sideTab, setSideTab] = useState<"folder" | "share">("folder");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("none");
  const [scrollToId, setScrollToId] = useState<number | null>(null);
  const [photoView, setPhotoView] = useState<PhotoView>("original");
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));

  // ── 회차 · 항목 ──
  const rounds = overview?.rounds ?? [];
  const currentRound = overview?.currentRound ?? null;
  const latest = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const activeRoundNo = selectedRoundNo ?? currentRound?.roundNo ?? latest?.roundNo ?? null;
  const activeSummary = rounds.find((r) => r.roundNo === activeRoundNo) ?? null;
  const detail = useRetouchRoundDetail(galleryId, activeRoundNo, detailNonce + (overview ? 1 : 0));
  const items = useMemo<RetouchItem[]>(() => normalizeRoundItems(currentRound, detail, activeRoundNo), [currentRound, detail, activeRoundNo]);
  const resultCount = items.filter((it) => it.resultUrl).length;
  const upload = useResultUpload(galleryId, activeRoundNo, () => {
    reloadOverview();
    setDetailNonce((n) => n + 1);
  });
  function pickResultFor(photoId: number) {
    slotTargetRef.current = photoId;
    slotInputRef.current?.click();
  }
  function startUpload(assignments: ResultAssignment[]) {
    setUploadOpen(null);
    void upload.run(assignments);
  }
  /** 선택한 사진 = 보정 대상 전부(서버가 제출한 사진 모두를 회차에 넣는다) */
  const selectedIds = useMemo(() => new Set(items.map((it) => it.photo.photoId)), [items]);
  const sharing = useGuestSharing({ galleryId, photos, folders, pickedIds: selectedIds, inviteOpen, onInviteClose, personal: personal && owner ? { galleryTitle: gallery.title } : undefined });
  const itemById = useMemo(() => new Map(items.map((it) => [it.photo.photoId, it])), [items]);
  const memoCount = items.filter(hasMemo).length;

  // ── 하위 상태 ──
  // 개인: 플랜 기간이 지나면 서버가 자동 보관한다 — 스케줄러가 돌기 전 몇 분도 화면은 보관으로 본다
  const planExpired = personal && gallery.planExpiresAt !== null && new Date(gallery.planExpiresAt).getTime() <= now;
  const archived = phase === "done" || gallery.stage === "ARCHIVED" || planExpired;
  /** 결과 사진을 보여 줄 조건 — 개인은 올리는 즉시(회차 보내기가 없다), 초대 클라이언트는 회차가 보내진 뒤 */
  const resultArrived = personal ? resultCount > 0 : activeSummary?.status === "COMPLETED";
  const allDone = items.length > 0 && resultCount === items.length;
  const canUpload = personal && !archived && activeRoundNo !== null && items.length > 0 && !upload.state.running;
  const waiting = !archived && activeSummary?.status === "REQUESTED";
  const isLatest = activeRoundNo !== null && activeRoundNo === latest?.roundNo;
  const remaining = overview?.remainingRoundCount ?? null;
  const maxRounds = overview?.maxRetouchRoundCount ?? gallery.maxRetouchRoundCount;
  const roundLabel = activeRoundNo !== null ? `${activeRoundNo}차` : "";
  const canReRequest = resultArrived && isLatest && !archived && (remaining === null || remaining > 0);
  const nextRoundNo = (latest?.roundNo ?? 0) + 1;

  // ── 다시 요청(이슈 125): 보정 요청 탭에 글이나 점을 적은 사진이 곧 다음 회차에 들어가는 사진 — 담기 상태가 따로 없다 ──
  function addPoint(photoId: number, x: number, y: number) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, { ...d, points: [...d.points, { id: newPointId(), x, y, text: "", refinedText: null, useRefinedText: false }] });
  }
  function removePoint(photoId: number, id: string) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, { ...d, points: d.points.filter((pt) => pt.id !== id) });
  }
  /** 보낼 본문 — 이 회차 사진 중 문장이나 글 있는 점을 적은 것 */
  const reRequests = useMemo<RetouchRequestItem[]>(() => toRequestItems(drafts, selectedIds), [drafts, selectedIds]);
  const drafted = useMemo(() => new Set(reRequests.map((r) => r.photoId)), [reRequests]);
  const draftPoints = reRequests.reduce((n, r) => n + r.points.length, 0);

  // ── 그리드 사진: 결과가 왔으면 결과 사진으로(원본 id 유지) ──
  const folderNameOf = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of folders ?? []) for (const d of c.details) for (const id of d.photoIds) map.set(id, `${c.name} / ${d.name}`);
    return (photo: PhotoResponse) => map.get(photo.photoId) ?? null;
  }, [folders]);
  const gridPhotos = useMemo<PhotoResponse[]>(() => {
    if (view === "all") return photos;
    if (view === "selected") return items.map((it) => it.photo);
    return items.map((it) => (resultArrived && it.resultUrl ? { ...it.photo, viewUrl: it.resultUrl, previewReady: true } : it.photo));
  }, [view, photos, items, resultArrived]);

  // ── 싱글뷰 ──
  const currentIndex = currentId === null ? -1 : gridPhotos.findIndex((p) => p.photoId === currentId);
  const currentPhoto = currentIndex >= 0 ? gridPhotos[currentIndex] : null;
  const currentItem = currentPhoto ? itemById.get(currentPhoto.photoId) ?? null : null;
  function openPhoto(photoId: number) {
    setCurrentId(photoId);
    setScrollToId(null);
    setLightboxOpen(true);
    // 열면 원본 한 장 · 패널 닫힘(이슈 125)
    setTab("none");
    setPhotoView("original");
  }
  function closeLightbox() {
    setLightboxOpen(false);
    setScrollToId(currentId);
  }
  function step(delta: number) {
    if (gridPhotos.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : 0;
    setCurrentId(gridPhotos[(base + delta + gridPhotos.length) % gridPhotos.length].photoId);
  }

  // ── 상태줄 · 배너 · 하단 ──
  const status: StatusLine = (() => {
    if (!overview) return { text: overviewError ?? "불러오는 중…", tone: overviewError ? "error" : "muted" };
    if (personal) {
      if (archived) return { text: planExpired ? "이용 기간 끝 · 보관됨" : "마무리 · 보관됨", tone: "muted" };
      if (resultCount === 0) return { text: activeRoundNo !== null && activeRoundNo > 1 ? `${roundLabel} 요청서 · 보정본 기다리는 중` : "선택 완료 · 보정본 기다리는 중", tone: "muted" };
      return { text: `보정본 ${resultCount} / ${items.length}장 · 원본과 비교할 수 있어요`, tone: "accent" };
    }
    if (archived) return { text: `보정 확정 · ${rounds.length}회 · 보관됨`, tone: "muted" };
    if (waiting) return { text: `${roundLabel} 보정 중${remaining !== null ? ` · 남은 횟수 ${remaining}` : ""}`, tone: "muted" };
    if (resultArrived) return { text: `${roundLabel} 결과 도착 · ${items.length}장 · 확인해 주세요`, tone: "accent" };
    return { text: "보정 검토", tone: "accent" };
  })();
  const banner = (() => {
    if (!overview) return null;
    if (personal) {
      if (archived && planExpired) return { tone: "err" as const, icon: <ScheduleIcon size={18} />, text: <><b className="font-semibold">이용 기간이 끝나 갤러리를 보관했어요.</b> 열람 · 내려받기만 할 수 있어요.</> };
      if (archived) return { tone: "lock" as const, icon: <ArchiveIcon size={18} />, text: <><b className="font-semibold">갤러리를 마무리했어요.</b> 열람 · 내려받기만 할 수 있어요.</> };
      if (resultCount === 0) return { tone: "lock" as const, icon: <LockIcon size={18} />, text: <><b className="font-semibold">{activeRoundNo !== null && activeRoundNo > 1 ? `${roundLabel} 요청서를 만들었어요` : "선택을 마쳤어요"} · {items.length}장</b> · 받은 보정본을 올리면 원본과 비교할 수 있어요</> };
      return { tone: "ok" as const, icon: <CheckCircleIcon size={18} />, text: <><b className="font-semibold">보정본 {resultCount} / {items.length}장</b> · 사진을 누르면 원본과 보정본을 비교해요</> };
    }
    if (archived) return { tone: "ok" as const, icon: <CheckCircleIcon size={18} />, text: <><b className="font-semibold">보정이 확정됐어요</b> · 갤러리는 보관됐고 보정본은 언제든 내려받을 수 있어요</> };
    if (waiting) return { tone: "info" as const, icon: <HourglassIcon size={18} />, text: <><b className="font-semibold">작가가 {roundLabel} 보정을 하고 있어요</b>{memoCount > 0 ? ` · 요청 ${memoCount}장` : ""} · 결과가 오면 알림으로 알려 드려요</> };
    if (resultArrived && isLatest) return { tone: "ok" as const, icon: <BrushIcon size={18} />, text: <><b className="font-semibold">{roundLabel} 보정 결과 {items.length}장이 도착했어요</b> · {shortDate(activeSummary?.completedAt ?? null)} · 전/후로 확인하고 더 고칠 곳이 있으면 다시 요청하세요{remaining !== null ? `(남은 ${remaining}회)` : ""}</> };
    return null;
  })();
  // 개인은 배너가 같은 말을 하니 하단 안내는 장수만(문구 점검 C22)
  const bottomHint = personal
    ? archived || resultCount === 0
      ? null
      : `보정본 ${resultCount} / ${items.length}장${allDone ? "" : ` · ${items.length - resultCount}장은 아직`}`
    : archived
    ? "보정이 끝났어요 · 갤러리는 보관 상태라 열람만 할 수 있어요"
    : waiting
      ? "결과가 오면 알림으로 알려 드려요 · 보낸 요청은 크게 보기의 정보 탭에서 볼 수 있어요"
      : resultArrived
        ? "다 확인했으면 확정하고, 더 고칠 곳이 있으면 다시 요청해요"
        : "";

  const title =
    view === "all" ? (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{photos.length}장</small>
      </>
    ) : view === "selected" ? (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <CheckCircleIcon size={18} />
        </span>
        선택한 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{items.length}장</small>
      </>
    ) : (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <BrushIcon size={18} />
        </span>
        보정 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
          {roundLabel} {resultArrived ? "보정본" : "요청"} · {items.length}장{!resultArrived && memoCount > 0 ? ` · 보정 요청 ${memoCount}` : ""}
        </small>
      </>
    );

  const overlayOf = (photo: PhotoResponse, detailed: boolean) => {
    if (view !== "retouch") return null;
    const it = itemById.get(photo.photoId);
    if (!it) return null;
    return (
      <>
        {hasMemo(it) && detailed && !resultArrived && (
          <span className="absolute top-2 left-2 inline-flex h-4.5 items-center gap-0.5 rounded-(--pill) bg-black/55 pr-1.5 pl-1 type-label-semibold-xs text-white">
            <EditNoteIcon size={11} />
            내 요청
          </span>
        )}
        {drafted.has(photo.photoId) && canReRequest && (
          <span className="absolute top-2 left-2 inline-flex h-4.5 items-center gap-0.5 rounded-(--pill) bg-brand-secondary-default pr-1.5 pl-1 type-label-semibold-xs text-white">
            <BrushIcon size={11} />
            {nextRoundNo}차 요청
          </span>
        )}
        {(it.hasResult || it.resultUrl) && (
          <span className="absolute top-2 right-2 inline-flex h-4.5 items-center rounded-(--pill) bg-function-success-default px-1.5 type-label-semibold-xs text-white">
            {personal ? "보정본 ✓" : "결과 ✓"}
          </span>
        )}
        {canUpload && detailed && (
          <button
            type="button"
            aria-label={`${photo.originalFileName} ${it.resultUrl ? "보정본 바꾸기" : "보정본 올리기"}`}
            onClick={(e) => {
              e.stopPropagation();
              pickResultFor(photo.photoId);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 left-2 grid size-6 cursor-pointer place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100 hover:bg-black/65 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
          >
            <UploadIcon size={15} />
          </button>
        )}
        {detailed &&
          !resultArrived &&
          it.points.map((pt, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute grid size-4.5 -translate-1/2 place-items-center rounded-full border-2 border-white bg-brand-secondary-default type-label-semibold-xs text-white shadow-[0_1px_4px_rgba(0,0,0,.35)]"
              style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
            >
              {i + 1}
            </span>
          ))}
      </>
    );
  };

  // ── 싱글뷰 탭 · 보기(이슈 125) ──
  const hasResult = Boolean(currentItem?.resultUrl && currentItem.photo.viewUrl);
  const requestLocked: string | null = !currentItem
    ? "이 회차의 사진이 아니에요"
    : archived
      ? "마무리된 갤러리예요"
      : !isLatest
        ? "지난 회차는 다시 요청할 수 없어요"
        : !resultArrived
          ? personal
            ? "보정본을 올리면 다시 요청할 수 있어요"
            : "보정본이 오면 다시 요청할 수 있어요"
          : remaining !== null && remaining <= 0
            ? "남은 요청 횟수가 없어요"
            : null;
  const lightboxTabs: LightboxTabDef[] = [
    { key: "info", label: "정보", icon: <InfoIcon size={18} /> },
    { key: "request", label: "보정 요청", icon: <BrushIcon size={18} />, ...(requestLocked ? { empty: requestLocked } : {}) },
  ];
  // 잠긴 사진으로 넘어왔으면 보정 요청 패널은 닫힌 것으로
  const openTab: Tab = tab === "request" && requestLocked ? "none" : tab;
  const writing = openTab === "request" && currentItem !== null;
  // 보정 요청을 쓰는 동안은 점을 찍는 보정본에 고정
  const shownView: PhotoView = !hasResult ? "original" : writing ? "result" : photoView;

  return (
    <>
      <div className={SHELL_BODY_CLASS}>
        {sidebarOpen && (
          <ClientSidebar
            title={gallery.title}
            status={status}
            phase={phase}
            photoCount={photos.length}
            selectedCount={items.length}
            maxSelectable={gallery.maxSelectablePhotoCount}
            retouchCount={items.length}
            view={view}
            onViewChange={(next) => {
              setView(next);
              setCurrentId(null);
              sharing.closeReactions();
            }}
            extra={
              overview && rounds.length > 0 ? (
                <div>
                  <RoundList
                    rounds={rounds}
                    activeRoundNo={activeRoundNo}
                    remaining={remaining}
                    maxRounds={maxRounds}
                    personal={personal}
                    onSelect={(n) => {
                      setSelectedRoundNo(n);
                      setView("retouch");
                      setCurrentId(null);
                    }}
                  />
                </div>
              ) : undefined
            }
            tabs={{
              tab: sideTab,
              onTabChange: setSideTab,
              folder:
                folders && folders.length > 0 ? (
                  <ClientFolderTree folders={folders} pickedIds={selectedIds} unsortedIds={new Set()} filter={ALL_FILTER} onFocus={() => {}} onToggle={() => {}} />
                ) : (
                  <p className="px-2 type-content-xs text-contents-light-bgd-weakness">폴더가 없어요</p>
                ),
              share: sharing.shareTab,
            }}
          />
        )}

        {sharing.reactionsOpen ? sharing.reactionsView : (
        <main className="flex min-w-0 flex-1 flex-col">
          {!overview && !overviewError ? (
            <div className="flex-1" aria-busy="true" />
          ) : (
            <>
              <ShellMainHeader
                title={title}
                zoom={zoom}
                onZoomChange={writeZoom}
                sort="uploaded"
                onSortChange={() => {}}
                filter="none"
                onFilterChange={() => {}}
                sortable={false}
              />
              {banner && (
                <div
                  className={`mx-5 mb-2 flex items-center gap-2.5 rounded-(--radius-8) px-3 py-2.5 type-content-s text-contents-light-bgd-default ${
                    banner.tone === "info"
                      ? "bg-function-info-background"
                      : banner.tone === "lock"
                        ? "bg-surface-default-medium"
                        : banner.tone === "err"
                          ? "bg-function-error-background"
                          : "bg-brand-secondary-background"
                  }`}
                >
                  <span
                    className={
                      banner.tone === "info"
                        ? "text-function-info-default"
                        : banner.tone === "lock"
                          ? "text-contents-light-bgd-sub"
                          : banner.tone === "err"
                            ? "text-function-error-default"
                            : "text-brand-secondary-default"
                    }
                  >
                    {banner.icon}
                  </span>
                  <span className="min-w-0 flex-1">{banner.text}</span>
                </div>
              )}
              <div data-coach="results" className="scrollbar-slim scrollbar-stable min-h-0 flex-1 overflow-y-auto">
                {gridPhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">{view === "retouch" ? (personal ? "아직 선택을 마치지 않았어요" : "보정 회차가 아직 없어요") : "사진이 없어요"}</p>
                ) : (
                  <PhotoGrid
                    photos={gridPhotos}
                    zoom={zoom}
                    selectedIds={EMPTY_IDS}
                    onToggle={() => {}}
                    selectable={false}
                    markStyle="check"
                    currentId={currentId}
                    onOpen={openPhoto}
                    toggleOn="check"
                    captionOf={(p) => {
                      const it = itemById.get(p.photoId);
                      if (view === "retouch" && it) return hasMemo(it) ? it.requestText?.trim() || it.points[0]?.text || `핀 ${it.points.length}` : "보정 요청 없음";
                      return folderNameOf(p);
                    }}
                    overlayOf={overlayOf}
                    scrollToId={scrollToId}
                  />
                )}
              </div>
            </>
          )}
        </main>
        )}
      </div>

      <ShellBottomBar
        selectionCount={0}
        onClearSelection={() => {}}
        onMoveSelection={() => {}}
        hint={bottomHint}
        progress={
          upload.state.running ? (
            <ProgressBar
              icon={<UploadIcon size={18} />}
              title={`보정본 업로드 ${upload.state.done} / ${upload.state.total}`}
              ratio={upload.state.total ? upload.state.done / upload.state.total : null}
              sub={
                <button type="button" onClick={upload.cancel} className="cursor-pointer underline underline-offset-2">
                  중단
                </button>
              }
            />
          ) : undefined
        }
        actions={
          <>
          {personal ? (
            archived ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-(--pill) bg-surface-default-medium px-3 py-1.5 type-label-semibold-s text-contents-light-bgd-sub">
                  <ArchiveIcon size={16} />
                  {planExpired ? "보관" : "마무리"} · {items.length}장
                </span>
                <ShellCta kind="outline" disabled={resultCount === 0} onClick={() => setDownloadOpen(true)}>
                  <DownloadIcon size={18} />
                  보정본 내려받기
                </ShellCta>
              </>
            ) : (
              <>
                {/* 요청서는 보정본을 올린 뒤에도 받을 수 있어야 한다("이어서 요청서를 내려받아요"의 약속 — 문구 점검 C10) */}
                {/* 보정 요청 탭에 적어 둔 2차가 있으면 먼저 2차 요청서를 만들지 묻는다(이슈 125) */}
                <ShellCta kind="outline" disabled={items.length === 0} onClick={() => (canReRequest && drafted.size > 0 ? setPersonalReOpen(true) : setRequestDownloadOpen(true))}>
                  <DownloadIcon size={18} />
                  요청서 내려받기
                </ShellCta>
                {resultCount > 0 && (
                  <ShellCta kind="outline" onClick={() => setDownloadOpen(true)}>
                    <DownloadIcon size={18} />
                    보정본 내려받기
                  </ShellCta>
                )}
                <span data-coach="result-upload" className="inline-flex">
                  <ShellCta kind={allDone ? "secondary" : "primary"} disabled={!canUpload} onClick={() => setUploadOpen({ presetPhotoId: null })}>
                    <UploadIcon size={18} />
                    {resultCount === 0 ? "보정본 올리기" : allDone ? "보정본 바꾸기" : "보정본 더 올리기"}
                  </ShellCta>
                </span>
                {owner && (
                  <span data-coach="close" className="inline-flex">
                    <ShellCta kind="outline" onClick={() => setCloseOpen(true)}>
                      <ArchiveIcon size={18} />
                      갤러리 마무리
                    </ShellCta>
                  </span>
                )}
              </>
            )
          ) : resultArrived && isLatest && !archived ? (
            <>
              <span data-coach="download" className="inline-flex">
                <ShellCta kind="outline" disabled={resultCount === 0} onClick={() => setDownloadOpen(true)}>
                  <DownloadIcon size={18} />
                  보정본 내려받기
                </ShellCta>
              </span>
              <span data-coach="rerequest" title={canReRequest ? undefined : "남은 보정 횟수가 없어요 · 작가에게 문의해 주세요"} className="inline-flex">
                <ShellCta kind="outline" disabled={!canReRequest || drafted.size === 0} onClick={() => setReModalOpen(true)}>
                  <EditNoteIcon size={18} />
                  {nextRoundNo}차 요청 보내기
                </ShellCta>
              </span>
              <span data-coach="confirm" className="inline-flex">
                <ShellCta onClick={() => setConfirmOpen(true)}>이대로 확정</ShellCta>
              </span>
            </>
          ) : archived ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-(--pill) bg-brand-secondary-background px-3 py-1.5 type-label-semibold-s text-brand-secondary-dark">
                <CheckCircleIcon size={16} />
                확정 완료 · {items.length}장
              </span>
              <ShellCta kind="outline" disabled={resultCount === 0} onClick={() => setDownloadOpen(true)}>
                <DownloadIcon size={18} />
                보정본 내려받기
              </ShellCta>
            </>
          ) : resultArrived && !isLatest ? (
            <ShellCta kind="outline" disabled={resultCount === 0} onClick={() => setDownloadOpen(true)}>
              <DownloadIcon size={18} />
              {roundLabel} 보정본 내려받기
            </ShellCta>
          ) : null}
          </>
        }
      />

      {sharing.modals}
      <ClientReviewCoachMarks ready={!personal && overview !== null && resultArrived && isLatest && !archived && !lightboxOpen && !confirmOpen && !downloadOpen} />
      {/* 개인 — 요청서 창(내보낸 직후 저절로 열림)이 닫힌 뒤, 올릴 보정본이 남아 있는 동안 */}
      <PersonalReviewCoachMarks
        ready={
          personal && overview !== null && canUpload && !allDone && !lightboxOpen && uploadOpen === null && !closeOpen && !downloadOpen &&
          !requestDownloadOpen && !(autoOpenDownload && !autoDownloadHandled)
        }
        owner={owner}
      />
      {personal && (requestDownloadOpen || (autoOpenDownload && !autoDownloadHandled && items.length > 0)) && activeRoundNo !== null && (
        <RetouchDownloadModal
          galleryId={galleryId}
          galleryTitle={gallery.title}
          roundNo={activeRoundNo}
          items={items}
          personal
          onClose={() => {
            setRequestDownloadOpen(false);
            setAutoDownloadHandled(true);
            onAutoOpenDownloadHandled?.();
          }}
        />
      )}
      {personal && uploadOpen && activeRoundNo !== null && (
        <ResultUploadModal galleryId={galleryId} roundNo={activeRoundNo} items={items} presetPhotoId={uploadOpen.presetPhotoId} onClose={() => setUploadOpen(null)} onStart={startUpload} />
      )}
      {personal && closeOpen && (
        <CloseGalleryModal
          galleryId={galleryId}
          desc={
            <>
              보정본 <b className="text-contents-light-bgd-default">{resultCount} / {items.length}장</b> · 마무리하면 보관되고 열람 · 내려받기만 할 수 있어요
            </>
          }
          onClose={() => setCloseOpen(false)}
          onDone={() => {
            setCloseOpen(false);
            reloadOverview();
            reloadGallery();
          }}
        />
      )}
      {personal && (
        <input
          ref={slotInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            const photoId = slotTargetRef.current;
            e.target.value = "";
            if (file && photoId !== null) void upload.run([{ file, photoId }]);
          }}
        />
      )}
      {downloadOpen && activeRoundNo !== null && (
        <ResultsDownloadModal galleryTitle={gallery.title} roundNo={activeRoundNo} items={items} onClose={() => setDownloadOpen(false)} />
      )}
      {confirmOpen && (
        <ConfirmRetouchModal
          galleryId={galleryId}
          photoCount={items.length}
          roundCount={rounds.length}
          remaining={remaining}
          onClose={() => setConfirmOpen(false)}
          onConfirmed={() => {
            setConfirmOpen(false);
            reloadOverview();
            reloadGallery();
          }}
        />
      )}

      {reModalOpen && (
        <SendReRequestModal
          galleryId={galleryId}
          roundNo={nextRoundNo}
          requests={reRequests}
          pickedCount={drafted.size}
          remaining={remaining}
          onClose={() => setReModalOpen(false)}
          onSent={() => {
            setReModalOpen(false);
            for (const id of drafted) writeDraft(galleryId, id, null);
            setSelectedRoundNo(null);
            reloadOverview();
          }}
        />
      )}
      {personal && personalReOpen && latest && (
        <PersonalReRequestModal
          galleryId={galleryId}
          latestRound={latest}
          allResultsIn={allDone}
          nextRoundNo={nextRoundNo}
          requests={reRequests}
          points={draftPoints}
          onClose={() => setPersonalReOpen(false)}
          onDownloadOnly={() => {
            setPersonalReOpen(false);
            setRequestDownloadOpen(true);
          }}
          onCreated={(roundNo) => {
            setPersonalReOpen(false);
            for (const id of drafted) writeDraft(galleryId, id, null);
            setSelectedRoundNo(roundNo);
            reloadOverview();
            setRequestDownloadOpen(true);
          }}
        />
      )}

      {lightboxOpen && currentPhoto && (
        <Lightbox
          photo={currentItem?.photo ?? currentPhoto}
          index={currentIndex}
          total={gridPhotos.length}
          caption={folderNameOf(currentPhoto)}
          tab={openTab}
          tabs={currentItem ? lightboxTabs : []}
          onTabChange={(next) => setTab(next as Tab)}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          middle={
            currentItem && hasResult ? (
              <div role="tablist" aria-label="보기" className="flex items-center gap-0.5">
                {PHOTO_VIEWS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    role="tab"
                    aria-selected={shownView === v.key}
                    disabled={writing && v.key !== "result"}
                    onClick={() => setPhotoView(v.key)}
                    className={`h-8 cursor-pointer rounded-(--radius-8) px-2.5 type-label-semibold-s text-white transition-colors duration-fast hover:bg-white/15 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent ${
                      shownView === v.key ? "bg-white/22" : ""
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            ) : currentItem && !personal && waiting ? (
              <span className="inline-flex h-7 items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s text-white/60">
                <HourglassIcon size={14} />
                보정본 기다리는 중
              </span>
            ) : undefined
          }
          photoNode={
            currentItem?.resultUrl && currentItem.photo.viewUrl && shownView !== "original"
              ? shownView === "result"
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentItem.resultUrl} alt={currentItem.photo.originalFileName} draggable={false} className="block max-h-(--lb-photo-max) max-w-full rounded-(--radius-12) object-contain" />
                : <BeforeAfter before={currentItem.photo.viewUrl} after={currentItem.resultUrl} afterLabel={personal ? "보정본" : `${roundLabel} 보정본`} mode={shownView === "side" ? "side" : "slider"} />
              : undefined
          }
          onPhotoClick={writing && currentItem ? (x, y) => addPoint(currentItem.photo.photoId, x, y) : undefined}
          overlay={
            writing && currentItem ? (
              <RetouchPins points={draftOf(drafts, currentItem.photo.photoId).points} onRemove={(id) => removePoint(currentItem.photo.photoId, id)} />
            ) : currentItem && openTab === "info" && !hasResult && currentItem.points.length > 0 ? (
              <>
                {currentItem.points.map((pt, i) => (
                  <span
                    key={i}
                    title={pt.useRefinedText && pt.refinedText ? pt.refinedText : pt.text}
                    className="absolute grid size-5.5 -translate-1/2 place-items-center rounded-full border-2 border-white bg-brand-secondary-default type-label-semibold-xs text-white shadow-[0_2px_6px_rgba(0,0,0,.35)]"
                    style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
                  >
                    {i + 1}
                  </span>
                ))}
              </>
            ) : undefined
          }
          panel={
            currentItem ? (
              openTab === "request" ? (
                <RetouchPanel galleryId={galleryId} photoId={currentItem.photo.photoId} picked editable personal={personal} />
              ) : (
                <>
                  <PhotoInfoPanel galleryId={galleryId} photo={currentItem.photo} showViewed={false} score={currentItem.photo.score} editable={false} onRate={() => {}} />
                  <SentRequestPanel item={currentItem} roundLabel={roundLabel} />
                </>
              )
            ) : (
              <p className="type-content-s text-contents-light-bgd-sub">이 회차의 사진이 아니에요.</p>
            )
          }
        />
      )}
    </>
  );
}

/** 정보 탭 아래 — 보낸(개인은 요청서에 실은) 이 회차의 요청 읽기. 없으면 아무것도 안 그린다 */
function SentRequestPanel({ item, roundLabel }: { item: RetouchItem; roundLabel: string }) {
  if (!hasMemo(item)) return null;
  return (
    <section className="flex flex-col gap-3 border-t border-divider-default pt-4">
      <h4 className="type-label-semibold-s text-contents-light-bgd-default">{roundLabel} 요청서</h4>
      {item.requestText?.trim() && (
        <section className="rounded-(--radius-8) bg-surface-default-lightness px-3 py-2.5">
          <h4 className="mb-1 type-label-semibold-xs text-contents-light-bgd-weakness">사진 전체 요청</h4>
          <p className="type-content-s leading-relaxed whitespace-pre-wrap text-contents-light-bgd-default">{item.requestText}</p>
        </section>
      )}
      {item.points.length > 0 && (
        <ol className="flex flex-col gap-3">
          {item.points.map((pt, i) => {
            const refined = pt.useRefinedText && pt.refinedText;
            return (
              <li key={i} className="flex flex-col gap-1.5 rounded-(--radius-8) border border-border-default p-2.5">
                <span className="flex items-center gap-2 type-label-semibold-s text-contents-light-bgd-default">
                  <span className="grid size-4.5 place-items-center rounded-full bg-brand-secondary-default type-label-semibold-xs text-white">{i + 1}</span>
                  핀 {i + 1}
                </span>
                <p className="type-content-s leading-relaxed text-contents-light-bgd-default">{refined ? pt.refinedText : pt.text}</p>
                {refined && (
                  <p className="inline-flex flex-wrap items-center gap-1 type-content-xs text-contents-light-bgd-weakness">
                    <span className="inline-flex items-center gap-0.5 text-brand-secondary-dark">
                      <SparkleIcon size={12} />
                      AI가 다듬은 문장
                    </span>
                    · 원문: {pt.text}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
