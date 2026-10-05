"use client";

/**
 * 클라이언트 2단계 — 셀렉 & 보정 요청 화면 (WES-312, 2026-09-12 보드 확정)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/SelectStage.tsx
 *
 * 폴더 확정 뒤에는 폴더 열이 사라지고 2열이다: 사이드바(기본 열림 — 폴더 | 공유 탭, 체크박스 트리) + 그리드.
 * 그리드에 레일 · 우측 패널은 없고 정보 · 보정 요청은 싱글뷰에서 한다.
 * 선택 앨범(photo-selection)은 서버가 정본 — 신랑 · 신부가 같이 고르므로 화면이 보일 때 주기적으로 다시 읽는다
 * (useSelectionSync: 화면은 즉시, 서버는 잠깐 뒤 차이만). 타일 표시 = 체크만 + 현재 사진 올리브 선 + 별점 배지.
 * 선택은 **체크박스(왼쪽 위)만** 바꾸고 타일 클릭은 현재 사진으로 — 빼기는 확인 모달을 거친다(2026-09-12 피드백).
 * 싱글뷰(Lightbox)는 사진을 눌러 열고(선택은 왼쪽 위 체크), 닫으면 그 사진으로 스크롤한다.
 * 넘기는 순서는 화면에 그려진 순서(AI 추천 묶음 먼저 · 별점 순이면 점수 묶음 순)이고, 열려 있는 동안은 열 때의 순서를 붙잡아 둔다.
 * 별점은 사진당 한 칸을 신랑 · 신부 · 작가가 같이 쓴다(ratings API) — 화면은 override로 바로 바꾸고, 저장은 사진별로 한 번에 하나씩
 * 보낸다(기다리는 동안 다시 매기면 마지막 값만). 저장이 끝나면 그 값을 목록에 적고 override를 걷는다. 실패는 싱글뷰 안 스낵바로 알린다.
 * 싱글뷰에서 마우스로 처음 별점을 매기면 별 위 말풍선(1~5 키 모양)으로 숫자 키도 된다고 한 번 알린다(브라우저에 한 번).
 * 보정 요청은 싱글뷰 "보정 요청" 탭에서 사진 위를 눌러 점을 찍고, 초안은 브라우저(retouchDraft)에 두다가 전달하기에 실린다.
 * AI 추천은 헤더 버튼 하나(폴더 단위, 입력 없음) → 결과가 그리드 맨 위 그룹 + ✦ 배지, 싱글뷰에서는 정보 탭 맨 위 "AI 추천" 칩.
 * 하단: 선택 요약 · "선택 장수 추가 요청"(작가 알림) · "작가에게 전달하기"(계약 장수를 채웠을 때만 — 서버가 정확히 채워야 받는다).
 * 개인 갤러리(personal)는 작가가 없어 전달 대신 **"요청서 내보내기"**(ExportSelectionModal: 초안 저장 → export → 잠김)이고
 * 장수 추가 요청이 없다(묶음 C, 2026-09-23).
 * 전달한 뒤(submitted 이후)는 page가 ReviewStage를 그린다 — 여기는 select 단계만 다룬다(옛 제출됨 분기 정리 2026-09-12).
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AddPhotoIcon, CheckCircleIcon, DownloadIcon, EditNoteIcon, GroupIcon, HeartFillIcon, InfoIcon, PhotoIcon, PlaylistAddCheckIcon, RefreshIcon, SparkleIcon, StarFillIcon, StarIcon } from "@/components/icons";
import { Lightbox, type LightboxTabDef, Sep } from "@/components/app/Lightbox";
import { deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { type CustomMenu, ShellMainHeader, type SortKey, sortPhotos } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { SHELL_BODY_CLASS } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellSidebar";
import { parseZoom, readZoomRaw, subscribeZoom, writeZoom } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/zoomMemory";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryResponse } from "@/lib/api/galleries";
import { ApiError } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";
import { clearPhotoRating, ratePhoto } from "@/lib/api/ratings";
import { ALL_FILTER, ClientFolderTree, type FolderKey, isAllFilter, type PhotoFilter } from "./ClientFolderTree";
import { ClientSelectCoachMarks } from "./ClientSelectCoachMarks";
import { ClientSidebar, type ClientView, type StatusLine } from "./ClientSidebar";
import { DeselectConfirmModal } from "./DeselectConfirmModal";
import { ExportSelectionModal } from "./ExportSelectionModal";
import { countView, takeRateKeysHint } from "./clientMemory";
import type { ClientPhase } from "./clientStages";
import { increaseStore, readIncreaseRequest, writeIncreaseRequest } from "./increaseMemory";
import { IncreaseRequestModal } from "./IncreaseRequestModal";
import { PhotoInfoPanel } from "./PhotoInfoPanel";
import { countDrafts, draftOf, newPointId, retouchDraftStore, toRequestItems, writeDraft } from "./retouchDraft";
import { SubmitSelectionModal } from "./SubmitSelectionModal";
import { RetouchPanel, RetouchPins } from "./RetouchPanel";
import { useAiRecommendations } from "./useAiRecommendations";
import { useGuestSharing } from "./useGuestSharing";
import { useSelectionSync } from "./useSelectionSync";

type LightboxTab = "none" | "info" | "memo";
const LIGHTBOX_TABS: LightboxTabDef[] = [
  { key: "info", label: "정보", icon: <InfoIcon size={18} /> },
  { key: "memo", label: "보정 요청", icon: <EditNoteIcon size={18} /> },
];

function ddayLabel(deadline: string | null): string {
  const offset = deadlineOffset(deadline);
  if (offset === null) return "기한 없음";
  if (offset < 0) return `D-${-offset}`;
  if (offset === 0) return "오늘 마감";
  return `${offset}일 지남`;
}

export function SelectStage({
  galleryId,
  gallery,
  phase,
  photos,
  photosLoaded,
  folders,
  sidebarOpen,
  reloadGallery,
  inviteOpen,
  onInviteClose,
  personal = false,
  owner = false,
  partnerName = null,
  onExported,
  onPhotoUrlError,
  onScoreSaved,
}: {
  galleryId: number;
  gallery: GalleryResponse;
  phase: ClientPhase;
  /** 올라온(UPLOADED) 사진 전부 */
  photos: PhotoResponse[];
  photosLoaded: boolean;
  /** 정규화된 컨셉 폴더(null = 아직) */
  folders: ConceptFolderResponse[] | null;
  sidebarOpen: boolean;
  /** 전달한 뒤 갤러리 단계를 다시 읽는다 */
  reloadGallery: () => void;
  /** 상단 "게스트 초대" 버튼 */
  inviteOpen: boolean;
  onInviteClose: () => void;
  /** 개인 결제 클라이언트 — 단계 5칸, 작가에게 전달 대신 요청서 내보내기, 장수 추가 요청 없음 */
  personal?: boolean;
  /** 개인 — 소유자면 초대 모달이 파트너 | 게스트 탭, 파트너면 초대 클라이언트와 같은 게스트 초대 모달 */
  owner?: boolean;
  /** 개인 — 함께 고르는 사람 이름(내보내기 모달의 알림 한 줄) */
  partnerName?: string | null;
  /** 개인 — 내보낸 뒤(페이지가 보정 확인 화면으로 넘기며 내려받기 모달을 연다) */
  onExported?: () => void;
  /** 싱글뷰 사진이 그려지지 않았을 때(주소 만료) — 페이지가 목록을 다시 읽는다 */
  onPhotoUrlError?: () => void;
  /** 별점 저장이 끝났을 때 서버에 남은 값 — 페이지가 사진 목록에 적는다 */
  onScoreSaved: (photoId: number, score: number | null) => void;
}) {
  const editable = phase === "select";
  const maxSelectable = gallery.maxSelectablePhotoCount;
  const { selection, pickedIds, toggle, pickMany, refresh: refreshSelection, notice, clearNotice } = useSelectionSync(galleryId, editable, maxSelectable);
  const [deselectId, setDeselectId] = useState<number | null>(null);
  const sharing = useGuestSharing({ galleryId, photos, folders, pickedIds, inviteOpen, onInviteClose, personal: personal && owner ? { galleryTitle: gallery.title } : undefined });
  /** 담기는 바로, 빼기는 확인 뒤 */
  function requestToggle(photoId: number) {
    if (!editable) return;
    if (pickedIds.has(photoId)) setDeselectId(photoId);
    else toggle(photoId);
  }
  const [increaseOpen, setIncreaseOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const increaseRaw = useSyncExternalStore(increaseStore.subscribe, () => increaseStore.readRaw(galleryId), () => "");
  const increasePending = useMemo(() => {
    void increaseRaw;
    return readIncreaseRequest(galleryId);
  }, [increaseRaw, galleryId]);
  // 작가가 장수를 바꿨으면(요청 당시와 다름) "요청함" 기억을 지운다
  useEffect(() => {
    if (increasePending && increasePending.maxAtRequest !== maxSelectable) writeIncreaseRequest(galleryId, null);
  }, [increasePending, maxSelectable, galleryId]);
  const ai = useAiRecommendations(galleryId);
  const { current: aiCurrent, byPhotoId: aiByPhotoId } = ai;
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  /** 싱글뷰를 열 때의 사진 순서 — 보는 중에 별점을 매기거나(별점 순) AI 추천이 도착해도 다음 사진이 바뀌지 않게 붙잡아 둔다 */
  const [navIds, setNavIds] = useState<number[] | null>(null);
  const [tab, setTab] = useState<LightboxTab>("none");
  const [scrollToId, setScrollToId] = useState<number | null>(null);
  /** 별점 낙관적 갱신 — 서버 답이 오기 전에 화면부터(저장이 끝나면 걷는다) */
  const [scoreOverrides, setScoreOverrides] = useState<Map<number, number | null>>(() => new Map());
  /** 저장 중인 별점 — saved는 서버에 남은 값, want는 화면이 바라는 값 */
  const rateJobsRef = useRef(new Map<number, { saved: number | null; want: number | null }>());
  const [rateError, setRateError] = useState<{ text: string } | null>(null);
  /** 별점 숫자 키 안내(말풍선) — 방금 마우스로 누른 점수. null이면 안 보인다 */
  const [keyHint, setKeyHint] = useState<number | null>(null);
  useEffect(() => {
    if (keyHint === null) return;
    const timer = window.setTimeout(() => setKeyHint(null), 5000);
    return () => window.clearTimeout(timer);
  }, [keyHint]);
  useEffect(() => {
    if (!rateError) return;
    const timer = window.setTimeout(() => setRateError(null), 2400);
    return () => window.clearTimeout(timer);
  }, [rateError]);
  const [view, setView] = useState<ClientView>("all");
  const [sideTab, setSideTab] = useState<"folder" | "share">("folder");
  const [filter, setFilter] = useState<PhotoFilter>(ALL_FILTER);
  const [sort, setSort] = useState<SortKey>("uploaded");
  // 하객 반응 겹쳐 보기(2026-09-13) — 켜면 타일에 ♥ n(공유폴더 전부 합산), 정렬 목록에 "하객 좋아요순"
  const [guestOn, setGuestOn] = useState(false);
  const [guestSort, setGuestSort] = useState(false);
  const likesByPhoto = sharing.reactions.likesByPhoto;
  const guestSortMenu: CustomMenu = {
    value: guestSort ? "guest" : sort,
    options: [
      { key: "guest", label: "하객 좋아요순" },
      { key: "uploaded", label: "업로드 순" },
      { key: "name", label: "이름 순" },
      { key: "score", label: "별점 순" },
    ],
    onChange: (key) => {
      if (key === "guest") setGuestSort(true);
      else {
        setGuestSort(false);
        setSort(key as SortKey);
      }
    },
  };
  const guestOverlay = guestOn
    ? (photo: PhotoResponse) => {
        const n = likesByPhoto.get(photo.photoId) ?? 0;
        return n > 0 ? (
          <span className="absolute right-2 bottom-2 inline-flex h-6 items-center gap-1 rounded-(--pill) bg-black/60 px-2 type-label-semibold-xs text-white tabular-nums">
            <HeartFillIcon size={13} />
            {n}
          </span>
        ) : null;
      }
    : undefined;
  const zoom = parseZoom(useSyncExternalStore(subscribeZoom, readZoomRaw, () => ""));
  const draftsRaw = useSyncExternalStore(retouchDraftStore.subscribe, () => retouchDraftStore.readRaw(galleryId), () => "");
  const drafts = useMemo(() => retouchDraftStore.parse(draftsRaw), [draftsRaw]);
  const draftCount = useMemo(() => countDrafts(drafts), [drafts]);

  // ── 파생값 ──
  const scoredPhotos = useMemo(
    () => (scoreOverrides.size === 0 ? photos : photos.map((p) => (scoreOverrides.has(p.photoId) ? { ...p, score: scoreOverrides.get(p.photoId) ?? null } : p))),
    [photos, scoreOverrides],
  );
  const photoById = useMemo(() => new Map(scoredPhotos.map((p) => [p.photoId, p])), [scoredPhotos]);
  // 고른 사진 — 화면(local)이 정본, 서버 응답의 보정본 정보는 아직 안 쓴다
  const pickedPhotos = useMemo(
    () => [...pickedIds].map((id) => photoById.get(id)).filter((p): p is PhotoResponse => p !== undefined),
    [pickedIds, photoById],
  );
  const selectedCount = pickedIds.size;
  const full = maxSelectable !== null && selectedCount >= maxSelectable;
  const details = useMemo(() => folders?.flatMap((c) => c.details) ?? [], [folders]);
  const sortedIds = useMemo(() => new Set(details.flatMap((d) => d.photoIds)), [details]);
  const unsortedIds = useMemo(
    () => new Set(photos.filter((p) => !sortedIds.has(p.photoId)).map((p) => p.photoId)),
    [photos, sortedIds],
  );
  /** 사진 → "컨셉 / 세부" (호버 캡션) */
  const folderNameOf = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of folders ?? []) for (const d of c.details) for (const id of d.photoIds) map.set(id, `${c.name} / ${d.name}`);
    return (photo: PhotoResponse) => map.get(photo.photoId) ?? (unsortedIds.has(photo.photoId) ? "미분류" : null);
  }, [folders, unsortedIds]);
  const visiblePhotos = useMemo(() => {
    let list = scoredPhotos;
    if (!isAllFilter(filter)) {
      const ids = new Set<number>();
      for (const d of details) if (filter.detailIds.has(d.id)) for (const id of d.photoIds) ids.add(id);
      if (filter.unsorted) for (const id of unsortedIds) ids.add(id);
      list = list.filter((p) => ids.has(p.photoId));
    }
    if (guestOn && guestSort) return [...sortPhotos(list, "uploaded")].sort((a, b) => (likesByPhoto.get(b.photoId) ?? 0) - (likesByPhoto.get(a.photoId) ?? 0));
    return sortPhotos(list, sort);
  }, [scoredPhotos, filter, details, unsortedIds, sort, guestOn, guestSort, likesByPhoto]);

  // ── 폴더 필터 ──
  function focusFolder(key: FolderKey) {
    setView("all");
    setFilter(key === "unsorted" ? { detailIds: new Set(), unsorted: true } : { detailIds: new Set([key]), unsorted: false });
  }
  function toggleFolder(key: FolderKey) {
    setView("all");
    setFilter((prev) => {
      if (key === "unsorted") return { detailIds: prev.detailIds, unsorted: !prev.unsorted };
      const next = new Set(prev.detailIds);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { detailIds: next, unsorted: prev.unsorted };
    });
  }

  // ── 상태줄 · 제목 ──
  const status: StatusLine = (() => {
    if (selection === null) return { text: "불러오는 중…", tone: "muted" };
    const count = maxSelectable !== null ? `${selectedCount} / ${maxSelectable}장` : `${selectedCount}장`;
    return { text: `${count} 선택했어요 · ${ddayLabel(gallery.selectionDeadline)}`, tone: "accent" };
  })();
  const focusedDetail = filter.detailIds.size === 1 && !filter.unsorted ? details.find((d) => d.id === [...filter.detailIds][0]) ?? null : null;
  const focusedConcept = focusedDetail ? folders?.find((c) => c.details.some((d) => d.id === focusedDetail.id)) ?? null : null;
  // 세부 폴더 하나만 볼 때 제목 앞에 붙는 상위(컨셉) 이름 — 좁으면 헤더가 통째로 숨긴다
  const titleParent = view !== "selected" && focusedDetail && focusedConcept ? focusedConcept.name : undefined;
  const title = (() => {
    if (view === "selected")
      return (
        <>
          <span className="flex text-contents-light-bgd-weakness">
            <CheckCircleIcon size={18} />
          </span>
          선택한 사진
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
            {maxSelectable !== null ? `${selectedCount} / ${maxSelectable}장` : `${selectedCount}장`}
          </small>
        </>
      );
    if (focusedDetail && focusedConcept)
      return (
        <>
          <span className="truncate">{focusedDetail.name}</span>
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{visiblePhotos.length}장</small>
        </>
      );
    if (!isAllFilter(filter)) {
      const n = filter.detailIds.size + (filter.unsorted ? 1 : 0);
      return (
        <>
          {filter.detailIds.size === 0 ? "미분류" : `폴더 ${n}개`}
          <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{visiblePhotos.length}장</small>
        </>
      );
    }
    return (
      <>
        <span className="flex text-contents-light-bgd-weakness">
          <PhotoIcon size={18} />
        </span>
        모든 사진
        <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{photos.length}장</small>
      </>
    );
  })();

  const gridPhotos = view === "selected" ? pickedPhotos : visiblePhotos;

  // ── AI 추천: 지금 보는 범위 안의 이번 라운드 추천 ──
  const visibleIds = useMemo(() => new Set(visiblePhotos.map((p) => p.photoId)), [visiblePhotos]);
  const aiInScope = useMemo(() => aiCurrent.filter((r) => visibleIds.has(r.photo.photoId)), [aiCurrent, visibleIds]);
  const aiIds = useMemo(() => new Set(aiInScope.map((r) => r.photo.photoId)), [aiInScope]);
  const aiPhotos = useMemo(
    () => aiInScope.map((r) => photoById.get(r.photo.photoId)).filter((p): p is PhotoResponse => p !== undefined),
    [aiInScope, photoById],
  );
  // 로딩은 이번 라운드 사진이 뜨기 전까지만
  const aiBusy = ai.phase === "requesting" || ai.phase === "running";
  const showAiGroup = view === "all" && (aiPhotos.length > 0 || aiBusy || ai.error !== null);
  const restPhotos = useMemo(() => (showAiGroup ? gridPhotos.filter((p) => !aiIds.has(p.photoId)) : gridPhotos), [showAiGroup, gridPhotos, aiIds]);
  const scopeLabel = focusedDetail ? focusedDetail.name : isAllFilter(filter) ? "모든 사진" : "보는 폴더";
  const aiUnpicked = aiPhotos.filter((p) => !pickedIds.has(p.photoId));
  /** 별점 순이면 점수별 그룹(5 → 1 → 없음) */
  const scoreGroups = useMemo(() => {
    if (sort !== "score" || view !== "all") return null;
    const groups: { score: number | null; photos: PhotoResponse[] }[] = [];
    for (const sc of [5, 4, 3, 2, 1]) {
      const ps = restPhotos.filter((p) => p.score === sc);
      if (ps.length > 0) groups.push({ score: sc, photos: ps });
    }
    const none = restPhotos.filter((p) => !p.score);
    if (none.length > 0) groups.push({ score: null, photos: none });
    return groups;
  }, [sort, view, restPhotos]);

  // ── 전달하기 ──
  const ratedCount = scoredPhotos.filter((p) => p.score !== null).length;
  const requests = useMemo(() => toRequestItems(drafts, pickedIds), [drafts, pickedIds]);
  const unpickedDraftCount = draftCount.photos - requests.length;
  const canSubmit = editable && selectedCount > 0 && (maxSelectable === null || selectedCount === maxSelectable);
  const verb = personal ? "내보낼" : "전달할";
  const submitHint =
    editable && maxSelectable !== null && selectedCount !== maxSelectable
      ? selectedCount < maxSelectable
        ? `${maxSelectable}장을 채우면 ${verb} 수 있어요 (지금 ${selectedCount}장)`
        : `${maxSelectable}장까지만 ${verb} 수 있어요 (지금 ${selectedCount}장)`
      : null;

  // ── 싱글뷰 ──
  /** 화면에 그려진 순서 — AI 추천 묶음이 먼저, 별점 순이면 점수 묶음 순 */
  const displayPhotos = useMemo(
    () => [...(showAiGroup ? aiPhotos : []), ...(scoreGroups ? scoreGroups.flatMap((g) => g.photos) : restPhotos)],
    [showAiGroup, aiPhotos, scoreGroups, restPhotos],
  );
  const navPhotos = useMemo(
    () => (navIds === null ? displayPhotos : navIds.map((id) => photoById.get(id)).filter((p): p is PhotoResponse => p !== undefined)),
    [navIds, displayPhotos, photoById],
  );
  const currentIndex = currentId === null ? -1 : navPhotos.findIndex((p) => p.photoId === currentId);
  const currentPhoto = currentIndex >= 0 ? navPhotos[currentIndex] : null;
  function openPhoto(photoId: number) {
    setNavIds(displayPhotos.map((p) => p.photoId));
    setCurrentId(photoId);
    setScrollToId(null);
    setLightboxOpen(true);
    countView(galleryId, photoId);
  }
  function closeLightbox() {
    setLightboxOpen(false);
    setKeyHint(null);
    setNavIds(null);
    setTab("none");
    setScrollToId(currentId);
  }
  function step(delta: number) {
    if (navPhotos.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : 0;
    const next = navPhotos[(base + delta + navPhotos.length) % navPhotos.length];
    setKeyHint(null);
    setCurrentId(next.photoId);
    countView(galleryId, next.photoId);
  }
  function rate(photoId: number, score: number | null) {
    if (!editable) return;
    setScoreOverrides((prev) => new Map(prev).set(photoId, score));
    const running = rateJobsRef.current.get(photoId);
    if (running) {
      running.want = score;
      return;
    }
    const job = { saved: photoById.get(photoId)?.score ?? null, want: score };
    rateJobsRef.current.set(photoId, job);
    void saveRating(photoId, job);
  }
  /** 마우스로 매긴 별점 — 처음이면 숫자 키 안내를 띄우고, 떠 있는 동안은 누른 점수를 따라간다 */
  function rateByMouse(photoId: number, score: number | null) {
    rate(photoId, score);
    if (!editable || score === null) setKeyHint(null);
    else if (keyHint !== null || takeRateKeysHint()) setKeyHint(score);
  }
  /** 한 사진의 별점을 서버와 맞춘다 — 요청이 엇갈려 옛 값이 남지 않게 한 번에 하나씩, 바라는 값이 바뀌었으면 이어서 보낸다 */
  async function saveRating(photoId: number, job: { saved: number | null; want: number | null }) {
    let failure: unknown = null;
    while (job.want !== job.saved) {
      const sending = job.want;
      try {
        if (sending === null) await clearPhotoRating(galleryId, photoId);
        else await ratePhoto(galleryId, photoId, sending);
        job.saved = sending;
      } catch (err) {
        // 그사이 다시 매겼으면 그 값을 이어서 보내 본다
        if (job.want !== sending) continue;
        failure = err;
        break;
      }
    }
    rateJobsRef.current.delete(photoId);
    // 서버에 남은 값을 목록에 적고 덮어쓰기를 걷는다 — 실패했으면 화면이 그 값으로 되돌아간다
    onScoreSaved(photoId, job.saved);
    setScoreOverrides((prev) => {
      const next = new Map(prev);
      next.delete(photoId);
      return next;
    });
    if (failure !== null) {
      setRateError({ text: "별점을 저장하지 못했어요" });
      setLocalNotice(failure instanceof ApiError ? failure.message : "별점을 저장하지 못했어요 · 다시 시도해 주세요");
    }
  }
  function addPoint(photoId: number, x: number, y: number) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, {
      ...d,
      points: [...d.points, { id: newPointId(), x, y, text: "", refinedText: null, useRefinedText: false }],
    });
  }
  function removePoint(photoId: number, id: string) {
    const d = draftOf(drafts, photoId);
    writeDraft(galleryId, photoId, { ...d, points: d.points.filter((pt) => pt.id !== id) });
  }
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const shownNotice = notice ?? localNotice;
  function clearNotices() {
    clearNotice();
    setLocalNotice(null);
  }

  return (
    <>
      <div className={SHELL_BODY_CLASS}>
        {sidebarOpen && (
          <ClientSidebar
            title={gallery.title}
            status={status}
            phase={phase}
            photoCount={photosLoaded ? photos.length : null}
            selectedCount={selectedCount}
            maxSelectable={maxSelectable}
            view={view}
            onViewChange={(next) => {
              setView(next);
              sharing.closeReactions();
              if (next !== "all") setFilter(ALL_FILTER);
            }}
            tabs={{
              tab: sideTab,
              onTabChange: setSideTab,
              folder:
                folders && folders.length > 0 ? (
                  <ClientFolderTree
                    folders={folders}
                    pickedIds={pickedIds}
                    unsortedIds={unsortedIds}
                    filter={view === "all" ? filter : ALL_FILTER}
                    onFocus={focusFolder}
                    onToggle={toggleFolder}
                  />
                ) : (
                  <p className="px-2 type-content-xs text-contents-light-bgd-weakness">폴더가 없어요 — 모든 사진에서 고르면 돼요.</p>
                ),
              share: sharing.shareTab,
            }}
          />
        )}

        {sharing.reactionsOpen ? sharing.reactionsView : (
        <main className="flex min-w-0 flex-1 flex-col">
          {!photosLoaded ? (
            <div className="flex-1" aria-busy="true" />
          ) : photos.length === 0 ? (
            <div className="grid flex-1 place-items-center px-6 py-8">
              <p className="type-content-s text-contents-light-bgd-sub">아직 올라온 사진이 없어요</p>
            </div>
          ) : (
            <>
              <ShellMainHeader
                title={title}
                titleParent={titleParent}
                leading={
                  <>
                  {view === "all" && (
                    <button
                      type="button"
                      data-coach="ai"
                      aria-pressed={aiPhotos.length > 0}
                      aria-label={`AI 추천${aiPhotos.length > 0 ? ` ${aiPhotos.length}` : ""}`}
                      disabled={!editable || aiBusy || ai.jobActive}
                      onClick={() => void ai.request(focusedDetail?.id ?? null)}
                      title={focusedDetail ? `${focusedDetail.name}에서 약 10%를 이유와 함께 골라 드려요` : "폴더마다 몇 장씩 이유와 함께 골라 드려요"}
                      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-(--radius-8) border px-3 whitespace-nowrap type-content-s transition-colors duration-fast disabled:cursor-default disabled:opacity-60 max-[860px]:px-2.25 ${
                        aiPhotos.length > 0
                          ? "border-brand-secondary-default bg-brand-secondary-background text-contents-light-bgd-default"
                          : "border-border-default text-contents-light-bgd-default hover:bg-surface-default-lightness"
                      }`}
                    >
                      <span className="text-brand-secondary-default">
                        <SparkleIcon size={18} />
                      </span>
                      <span className="max-[860px]:hidden">AI 추천{aiPhotos.length > 0 ? ` ${aiPhotos.length}` : ""}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-pressed={guestOn}
                    aria-label="하객 반응"
                    onClick={() => setGuestOn((v) => !v)}
                    title="공유폴더에서 온 하객 좋아요를 타일에 겹쳐 봐요"
                    className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-(--radius-8) border px-3 whitespace-nowrap type-content-s transition-colors duration-fast max-[860px]:px-2.25 ${
                      guestOn ? "border-brand-secondary-default bg-brand-secondary-background text-contents-light-bgd-default" : "border-border-default text-contents-light-bgd-default hover:bg-surface-default-lightness"
                    }`}
                  >
                    <span className={guestOn ? "text-brand-secondary-default" : "text-contents-light-bgd-sub"}>
                      <GroupIcon size={18} />
                    </span>
                    <span className="max-[860px]:hidden">하객 반응</span>
                  </button>
                  </>
                }
                zoom={zoom}
                onZoomChange={writeZoom}
                sort={sort}
                onSortChange={setSort}
                filter="none"
                onFilterChange={() => {}}
                showFilters={false}
                sortable={view === "all"}
                customSort={guestOn ? guestSortMenu : undefined}
              />
              <div data-coach="pick" className="scrollbar-slim scrollbar-stable min-h-0 flex-1 overflow-y-auto">
                {showAiGroup && (
                  <div className="px-5 pt-1 pb-3">
                    <div className="mb-2 flex items-center gap-2.5 rounded-(--radius-8) bg-brand-secondary-background px-3 py-2 type-content-s text-contents-light-bgd-default">
                      {aiBusy ? (
                        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-border-default border-t-brand-secondary-default" />
                      ) : (
                        <span className="text-brand-secondary-default">
                          <SparkleIcon size={18} />
                        </span>
                      )}
                      {aiBusy ? (
                        <>
                          <b className="font-semibold">{scopeLabel}에서 고르는 중…</b>
                          <span className="type-content-xs text-contents-light-bgd-weakness">보통 10초 안에 끝나요</span>
                        </>
                      ) : ai.error && aiPhotos.length === 0 ? (
                        <span className="text-function-error-default">{ai.error}</span>
                      ) : (
                        <>
                          <b className="font-semibold">AI 추천 {aiPhotos.length}장</b>
                          <span className="type-content-xs text-contents-light-bgd-weakness tabular-nums">
                            {scopeLabel} 중
                          </span>
                        </>
                      )}
                      <span className="flex-1" />
                      {!aiBusy && editable && (
                        <>
                          {/* 서버 잡이 도는 동안은 새 요청이 409 — 끝날 때까지 꺼 둔다 */}
                          <button
                            type="button"
                            disabled={ai.jobActive}
                            onClick={() => void ai.request(focusedDetail?.id ?? null)}
                            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--pill) border border-border-default px-2.5 type-label-medium-xs text-contents-light-bgd-default transition-colors duration-fast hover:bg-background-default-main disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                          >
                            <RefreshIcon size={14} />
                            다시 추천
                          </button>
                          {aiUnpicked.length > 0 && (
                            <button
                              type="button"
                              onClick={() => pickMany(aiUnpicked.map((p) => p.photoId))}
                              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--pill) bg-contents-light-bgd-default px-2.5 type-label-medium-xs text-contents-dark-bgd-default transition-opacity duration-fast hover:opacity-90"
                            >
                              <PlaylistAddCheckIcon size={14} />
                              모두 선택{aiUnpicked.length < aiPhotos.length ? ` (${aiUnpicked.length})` : ""}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {aiPhotos.length > 0 && (
                      <PhotoGrid
                        photos={aiPhotos}
                        zoom={Math.min(100, zoom + 15)}
                        selectedIds={pickedIds}
                        onToggle={requestToggle}
                        toggleOn="check"
                        selectable={editable}
                        markStyle="check"
                        currentId={currentId}
                        showScore
                        onOpen={openPhoto}
                        aiIds={aiIds}
                        overlayOf={guestOverlay}
                      />
                    )}
                    {aiPhotos.length > 0 && restPhotos.length > 0 && (
                      <p className="flex items-center gap-2 px-0 pt-1 type-content-xs text-contents-light-bgd-weakness after:h-px after:flex-1 after:bg-divider-default after:content-['']">
                        나머지 {restPhotos.length}장
                      </p>
                    )}
                  </div>
                )}
                {gridPhotos.length === 0 ? (
                  <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">
                    {view === "selected" ? "아직 고른 사진이 없어요" : "조건에 맞는 사진이 없어요"}
                  </p>
                ) : restPhotos.length === 0 ? null : scoreGroups ? (
                  scoreGroups.map((g) => (
                    <div key={g.score ?? "none"} className="pt-1">
                      <p className="flex items-center gap-0.5 px-5 pb-2 type-content-xs text-contents-light-bgd-weakness">
                        {g.score !== null ? (
                          <span className="flex text-brand-secondary-default" aria-label={`별점 ${g.score}`}>
                            {[1, 2, 3, 4, 5].map((n) => (n <= g.score! ? <StarFillIcon key={n} size={14} /> : <StarIcon key={n} size={14} className="text-border-default" />))}
                          </span>
                        ) : (
                          <span className="type-label-semibold-xs text-contents-light-bgd-sub">별점 없음</span>
                        )}
                        <span className="ml-2">{g.photos.length}장</span>
                      </p>
                      <PhotoGrid
                        photos={g.photos}
                        zoom={zoom}
                        selectedIds={pickedIds}
                        onToggle={requestToggle}
                        toggleOn="check"
                        selectable={editable}
                        markStyle="check"
                        currentId={currentId}
                        showScore={false}
                        onOpen={openPhoto}
                        captionOf={folderNameOf}
                        scrollToId={scrollToId}
                        overlayOf={guestOverlay}
                      />
                    </div>
                  ))
                ) : (
                  <PhotoGrid
                    photos={restPhotos}
                    zoom={zoom}
                    selectedIds={pickedIds}
                    onToggle={requestToggle}
                    toggleOn="check"
                    selectable={editable}
                    markStyle="check"
                    currentId={currentId}
                    showScore
                    onOpen={openPhoto}
                    captionOf={folderNameOf}
                    scrollToId={scrollToId}
                    overlayOf={guestOverlay}
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
        hint={
          shownNotice ? (
            <button type="button" onClick={clearNotices} className="cursor-pointer text-left text-function-warning-default">
              {shownNotice}
            </button>
          ) : selectedCount === 0 ? (
            "왼쪽 위 체크로 선택해요 · 사진을 누르면 크게 보며 별점과 보정 요청"
          ) : (
            `마감 ${ddayLabel(gallery.selectionDeadline)}${draftCount.photos > 0 ? ` · 보정 요청 ${draftCount.photos}장 · 점 ${draftCount.points}개` : ""}${submitHint ? ` · ${submitHint}` : ""}`
          )
        }
        hintIsNotice={shownNotice !== null}
        status={
          <span className="flex items-center gap-2 type-content-s text-contents-light-bgd-sub">
            <span className="max-sm:hidden">선택한 사진</span>
            <b className={`type-label-semibold-l tabular-nums ${full ? "text-function-warning-default" : "text-contents-light-bgd-default"}`}>
              {selectedCount}
            </b>
            {maxSelectable !== null && <span className="text-contents-light-bgd-weakness">/ {maxSelectable}</span>}
            {pickedPhotos.length > 0 && (
              <span className="ml-1 flex max-lg:hidden" aria-hidden>
                {pickedPhotos.slice(-3).map((p) => (
                  <span key={p.photoId} className="-ml-2 size-6.5 overflow-hidden rounded-(--radius-4) border-2 border-background-default-main bg-surface-default-light first:ml-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.viewUrl && <img src={p.viewUrl} alt="" className="size-full object-cover" />}
                  </span>
                ))}
              </span>
            )}
          </span>
        }
        actions={
          <>
            {personal ? null : increasePending ? (
                <span className="inline-flex h-10 items-center gap-1.5 rounded-(--radius-8) border border-border-default px-3 type-label-medium-s text-contents-light-bgd-sub">
                  <AddPhotoIcon size={16} />
                  {increasePending.requestedCount}장 요청함 · 작가 확인 중
                </span>
              ) : (
                <ShellCta kind="outline" onClick={() => setIncreaseOpen(true)}>
                  <AddPhotoIcon size={18} />
                  선택 장수 추가 요청
                </ShellCta>
              )}
            <span data-coach="submit" className="inline-flex" title={submitHint ?? undefined}>
              {personal ? (
                <ShellCta disabled={!canSubmit} onClick={() => setExportOpen(true)}>
                  <DownloadIcon size={18} />
                  요청서 내보내기
                </ShellCta>
              ) : (
                <ShellCta disabled={!canSubmit} short="전달하기" onClick={() => setSubmitOpen(true)}>
                  작가에게 전달하기
                </ShellCta>
              )}
            </span>
          </>
        }
      />

      <ClientSelectCoachMarks ready={editable && photosLoaded && photos.length > 0 && selection !== null && !lightboxOpen} personal={personal} />

      {deselectId !== null && photoById.get(deselectId) && (
        <DeselectConfirmModal
          photo={photoById.get(deselectId)!}
          onClose={() => setDeselectId(null)}
          onConfirm={() => {
            toggle(deselectId);
            setDeselectId(null);
          }}
        />
      )}
      {sharing.modals}
      {increaseOpen && (
        <IncreaseRequestModal
          galleryId={galleryId}
          currentMax={maxSelectable}
          selectedCount={selectedCount}
          onClose={() => setIncreaseOpen(false)}
          onRequested={(count) => {
            setIncreaseOpen(false);
            setLocalNotice(`${count}장으로 늘려 달라고 요청했어요 · 작가가 정하면 알림이 와요`);
          }}
        />
      )}
      {exportOpen && (
        <ExportSelectionModal
          galleryId={galleryId}
          selectedCount={selectedCount}
          maxSelectable={maxSelectable}
          requests={requests}
          unpickedDraftCount={unpickedDraftCount}
          ratedCount={ratedCount}
          partnerName={partnerName}
          onClose={() => setExportOpen(false)}
          onExported={() => {
            setExportOpen(false);
            // 내보낸 요청은 서버 회차가 가졌으니 초안을 지운다(안 고른 사진의 초안은 남긴다)
            for (const id of pickedIds) writeDraft(galleryId, id, null);
            setLocalNotice("요청서를 내보냈어요");
            void refreshSelection();
            reloadGallery();
            onExported?.();
          }}
        />
      )}
      {submitOpen && (
        <SubmitSelectionModal
          galleryId={galleryId}
          selectedCount={selectedCount}
          maxSelectable={maxSelectable}
          requests={requests}
          unpickedDraftCount={unpickedDraftCount}
          ratedCount={ratedCount}
          onClose={() => setSubmitOpen(false)}
          onSubmitted={() => {
            setSubmitOpen(false);
            // 전달된 초안은 서버가 가졌으니 지운다(안 고른 사진의 초안은 남긴다)
            for (const id of pickedIds) writeDraft(galleryId, id, null);
            setLocalNotice("작가에게 전달했어요");
            void refreshSelection();
            reloadGallery();
          }}
        />
      )}

      {lightboxOpen && currentPhoto && (
        <Lightbox
          photo={currentPhoto}
          index={currentIndex}
          total={navPhotos.length}
          caption={folderNameOf(currentPhoto)}
          tab={tab}
          tabs={LIGHTBOX_TABS}
          onImageError={onPhotoUrlError}
          notice={rateError ? { kind: "error", text: rateError.text } : null}
          onTabChange={(next) => setTab(next as LightboxTab)}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          middle={
            <SelectionControls
              picked={pickedIds.has(currentPhoto.photoId)}
              editable={editable}
              score={currentPhoto.score}
              keyHint={keyHint}
              onTogglePick={() => requestToggle(currentPhoto.photoId)}
              onRate={(score) => rateByMouse(currentPhoto.photoId, score)}
            />
          }
          onKeyDown={(e) => {
            if (!editable) return false;
            if (/^[0-5]$/.test(e.key)) setKeyHint(null);
            if (/^[1-5]$/.test(e.key)) rate(currentPhoto.photoId, Number(e.key));
            else if (e.key === "0") rate(currentPhoto.photoId, null);
            else if (e.key === " ") {
              e.preventDefault();
              requestToggle(currentPhoto.photoId);
            } else return false;
            return true;
          }}
          overlay={
            tab === "memo" ? (
              <RetouchPins
                points={draftOf(drafts, currentPhoto.photoId).points}
                onRemove={editable ? (id) => removePoint(currentPhoto.photoId, id) : undefined}
              />
            ) : undefined
          }
          onPhotoClick={tab === "memo" && editable ? (x, y) => addPoint(currentPhoto.photoId, x, y) : undefined}
          panel={
            tab === "info" ? (
              <PhotoInfoPanel
                galleryId={galleryId}
                photo={currentPhoto}
                folderName={folderNameOf(currentPhoto)}
                score={currentPhoto.score}
                editable={editable}
                aiPicked={aiByPhotoId.has(currentPhoto.photoId)}
                onRate={(score) => rateByMouse(currentPhoto.photoId, score)}
              />
            ) : (
              <RetouchPanel galleryId={galleryId} photoId={currentPhoto.photoId} picked={pickedIds.has(currentPhoto.photoId)} editable={editable} />
            )
          }
        />
      )}
    </>
  );
}

/** 싱글뷰 하단 컨트롤 가운데 칸 — ★★★★★ | 선택 / 선택됨 (클라이언트 전용) */
function SelectionControls({
  picked,
  editable,
  score,
  keyHint,
  onTogglePick,
  onRate,
}: {
  picked: boolean;
  editable: boolean;
  score: number | null;
  /** 숫자 키 안내 말풍선에서 칠할 키(방금 누른 점수) — null이면 말풍선 없음 */
  keyHint: number | null;
  onTogglePick: () => void;
  onRate: (score: number | null) => void;
}) {
  return (
    <>
      <div role="radiogroup" aria-label="별점" className="relative flex items-center gap-0.5 px-1">
        {keyHint !== null && (
          <span
            role="status"
            className="pointer-events-none absolute bottom-11 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-(--radius-12) bg-white px-3.5 py-3 whitespace-nowrap text-[#1a1a1a] shadow-(--shadow-modal) after:absolute after:-bottom-1.25 after:left-1/2 after:size-2.5 after:-translate-x-1/2 after:rotate-45 after:bg-white after:content-['']"
          >
            <span aria-hidden className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <kbd
                  key={n}
                  className={`grid size-6.5 place-items-center rounded-[6px] border border-b-2 type-label-semibold-s ${
                    n === keyHint ? "border-[#1a1a1a] bg-[#1a1a1a] text-white" : "border-black/18 bg-white"
                  }`}
                >
                  {n}
                </kbd>
              ))}
            </span>
            <span className="type-label-medium-xs">숫자 키로도 매길 수 있어요</span>
          </span>
        )}
        {[1, 2, 3, 4, 5].map((n) => {
          const on = score !== null && n <= score;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`별점 ${n}`}
              disabled={!editable}
              onClick={() => onRate(score === n ? null : n)}
              className={`grid size-7 place-items-center rounded-full transition-colors duration-fast ${editable ? "cursor-pointer hover:bg-white/15" : "cursor-default"} ${on ? "text-white" : "text-white/35"}`}
            >
              {on ? <StarFillIcon size={20} /> : <StarIcon size={20} />}
            </button>
          );
        })}
      </div>
      <Sep />
      <button
        type="button"
        aria-pressed={picked}
        disabled={!editable}
        onClick={onTogglePick}
        className={`inline-flex h-7 items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s transition-colors duration-fast ${
          picked ? "bg-brand-secondary-default text-white" : "bg-white/15 text-white hover:bg-white/25"
        } ${editable ? "cursor-pointer" : "cursor-default"}`}
      >
        {picked && (
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
        )}
        {picked ? "선택됨" : "선택"}
      </button>
    </>
  );
}
