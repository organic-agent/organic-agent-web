"use client";

/**
 * 작가 — 스튜디오 홈(갤러리 목록) 페이지
 * 위치: src/app/(studio)/studio/[studio]/page.tsx
 * 시안: 와이어프레임 02 첫 진입 · 03 스튜디오 화면 · 04 갤러리 모달, 보드 "스튜디오 홈 v2 최종 구성"
 *
 * 주요 책임:
 * - 서버 갤러리 목록 조회(useGalleryList)와 6단계 필터링 (필터는 헤더의 팝업이 담당)
 * - 이용권 소프트 게이트: 없음 → 배너·타일이 결제 모달로, 다 씀 → 타일 잠금 → 결제 모달 → 새 갤러리
 * - 새 갤러리 생성/수정/보관/완전 삭제 모달 열림 상태 관리와 결과의 목록 반영
 * - 팀원 초대 모달(상단바 초대 버튼), 첫 진입 코치마크(갤러리 0개일 때 1회)
 * - 스튜디오 이름 서버 동기화 (공개 주소 정규화 포함)
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { StageFilter } from "@/app/(studio)/_lib/galleryStatus";
import { TicketIcon } from "@/components/icons";
import { StudioHeader } from "@/components/photographer/StudioHeader";
import { StudioTopbar } from "@/components/photographer/StudioTopbar";
import { Button } from "@/components/ui/Button";
import {
  fetchStudio,
  listMyStudios,
  type StudioResponse,
} from "@/lib/api/studios";
import { updateStudioFromServer, useStudioInfo } from "@/lib/studio";
import { useStudioTickets } from "@/lib/studioTickets";
import { ArchiveGalleryConfirmModal } from "../_components/ArchiveGalleryConfirmModal";
import { DeleteGalleryConfirmModal } from "../_components/DeleteGalleryConfirmModal";
import { EditGalleryModal } from "../_components/EditGalleryModal";
import { GalleryCreatedToast } from "../_components/GalleryCreatedToast";
import { GalleryGrid } from "../_components/GalleryGrid";
import {
  GalleryListError,
  GalleryListSkeleton,
} from "../_components/GalleryListStates";
import { NewGalleryModal } from "../_components/NewGalleryModal";
import { StudioCoachMarks } from "../_components/StudioCoachMarks";
import { StudioInviteModal } from "../_components/StudioInviteModal";
import {
  TicketCheckoutModal,
  type TicketCheckoutMode,
} from "../_components/TicketCheckoutModal";
import {
  type GalleryListItem,
  useGalleryList,
} from "../_lib/useGalleryList";

export default function GalleriesPage() {
  // 주소 /studio/[studio] — 공개 주소(serora)가 정식이고 번호(12)로 와도 열린다.
  // 번호로 오면 조회 뒤 주소창을 공개 주소로 바꿔 준다.
  const params = useParams<{ studio: string }>();
  const router = useRouter();
  const [current, setCurrent] = useState<StudioResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const studioId = current?.workspaceId ?? null;
  const { result, reload, addItem, replaceItem, removeItem } = useGalleryList();
  // 작가 갤러리 화면이 아직 이 캐시에서 이름을 읽는다 — 서버 값이 오면 갱신하고, 오기 전엔 캐시로 표시
  const cached = useStudioInfo();
  const studioName = current?.name ?? cached.name;
  const tickets = useStudioTickets(studioId);
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [newGalleryOpen, setNewGalleryOpen] = useState(false);
  const [ticketModal, setTicketModal] = useState<TicketCheckoutMode | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  // 초대는 소유자만(2026-09-10 결정) — 멤버에게는 상단바 초대 버튼을 그리지 않는다
  const isOwner = current?.role === "OWNER";
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState<GalleryListItem | null>(
    null,
  );
  const [archivingGallery, setArchivingGallery] =
    useState<GalleryListItem | null>(null);
  const [deletingGallery, setDeletingGallery] =
    useState<GalleryListItem | null>(null);

  // 주소의 값으로 스튜디오를 찾는다. 번호면 지정 조회, 공개 주소면 내 스튜디오 목록에서.
  useEffect(() => {
    const key = params.studio;
    if (
      current &&
      (current.galleryUrl === key || String(current.workspaceId) === key)
    )
      return;
    let cancelled = false;
    (async () => {
      try {
        const found = /^\d+$/.test(key)
          ? await fetchStudio(key)
          : ((await listMyStudios()).find((s) => s.galleryUrl === key) ?? null);
        if (cancelled) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        setCurrent(found);
        updateStudioFromServer(found.name, found.galleryUrl);
        // 번호로 들어왔으면 정식 주소(공개 주소)로 바꿔 준다
        if (found.galleryUrl !== key) router.replace(`/studio/${found.galleryUrl}`);
      } catch {
        // 소속 아님(403)·없는 번호(404)·네트워크 — 모두 "찾을 수 없음"으로
        if (!cancelled) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.studio, current, router]);

  useEffect(() => {
    if (!createdToast) return;
    const timer = window.setTimeout(() => setCreatedToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [createdToast]);

  // 목록 API는 내 스튜디오 전부의 갤러리를 주므로 이 홈의 스튜디오 것만 남긴다
  const galleries =
    result?.kind === "ready"
      ? result.items.filter((gallery) => gallery.workspaceId === studioId)
      : [];
  // 전체 = 보관 제외. 보관된 갤러리는 "보관됨" 필터에서만 보인다
  const filteredGalleries =
    stageFilter === "ALL"
      ? galleries.filter((gallery) => gallery.stage !== "ARCHIVED")
      : galleries.filter((gallery) => gallery.stage === stageFilter);
  const listReady = result?.kind === "ready" && studioId !== null;

  /** 새 갤러리 동선 — 이용권 상태가 결제 모달과 갤러리 모달 중 무엇을 열지 정한다 */
  function openNewGallery() {
    if (tickets.state === "none") setTicketModal("first");
    else if (tickets.state === "full") setTicketModal("over");
    else setNewGalleryOpen(true);
  }

  function handlePurchased() {
    const mode = ticketModal;
    setTicketModal(null);
    // 첫 결제·다 써서 막혔던 결제는 만들려던 갤러리로 이어진다
    if (mode === "first" || mode === "over") setNewGalleryOpen(true);
  }

  function handleCreated(gallery: GalleryListItem) {
    addItem(gallery);
    setCreatedToast(gallery.title);
  }

  function handleSaved(gallery: GalleryListItem) {
    replaceItem(gallery);
    setEditingGallery(null);
  }

  function handleArchived(gallery: GalleryListItem) {
    replaceItem(gallery);
    setArchivingGallery(null);
  }

  function handleDeleted(id: number) {
    removeItem(id);
    setDeletingGallery(null);
  }

  if (notFound) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background-default-main px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="type-title-m text-contents-light-bgd-default">
            스튜디오를 찾을 수 없어요
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            내 소속이 아니거나 주소가 잘못됐어요.
          </p>
          <Button href="/studio">내 스튜디오로</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-default-main">
      <StudioTopbar
        workspaceId={studioId}
        onInviteClick={isOwner ? () => setInviteOpen(true) : undefined}
      />
      <StudioHeader
        studioName={studioName}
        galleries={galleries}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
        tickets={studioId !== null ? tickets : null}
        onTicketClick={() => setTicketModal(tickets.state === "full" ? "over" : "add")}
      />

      <main className="mx-auto w-full max-w-wrap px-6 pt-5 pb-16">
        {listReady && tickets.state === "none" && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-(--radius-12) border border-divider-default bg-surface-default-lightness px-4 py-3">
            <span className="flex shrink-0 text-brand-secondary-default">
              <TicketIcon size={20} />
            </span>
            <p className="flex-1 type-content-s text-contents-light-bgd-default">
              아직 이용권이 없어요. 갤러리 하나에 이용권 하나가 필요해요.
            </p>
            <Button size="sm" onClick={() => setTicketModal("first")}>
              결제하기
            </Button>
          </div>
        )}

        {result === null ? (
          <GalleryListSkeleton />
        ) : result.kind === "error" ? (
          <GalleryListError onRetry={reload} />
        ) : (
          <GalleryGrid
            filteredGalleries={filteredGalleries}
            stageFilter={stageFilter}
            tickets={tickets}
            onCreateClick={openNewGallery}
            onEditGallery={setEditingGallery}
            onArchiveGallery={setArchivingGallery}
            onDeleteGallery={setDeletingGallery}
            onShowAll={() => setStageFilter("ALL")}
          />
        )}
      </main>

      {studioId !== null && (
        <NewGalleryModal
          open={newGalleryOpen}
          workspaceId={studioId}
          ticketsRemaining={tickets.remaining}
          onClose={() => setNewGalleryOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {studioId !== null && ticketModal && (
        <TicketCheckoutModal
          key={ticketModal}
          mode={ticketModal}
          workspaceId={studioId}
          remaining={tickets.remaining}
          onClose={() => setTicketModal(null)}
          onPurchased={handlePurchased}
        />
      )}
      {editingGallery && (
        <EditGalleryModal
          key={editingGallery.id}
          gallery={editingGallery}
          onClose={() => setEditingGallery(null)}
          onSaved={handleSaved}
        />
      )}
      {archivingGallery && (
        <ArchiveGalleryConfirmModal
          key={archivingGallery.id}
          gallery={archivingGallery}
          onClose={() => setArchivingGallery(null)}
          onArchived={handleArchived}
        />
      )}
      {deletingGallery && (
        <DeleteGalleryConfirmModal
          key={deletingGallery.id}
          gallery={deletingGallery}
          onClose={() => setDeletingGallery(null)}
          onDeleted={handleDeleted}
        />
      )}
      {studioId !== null && inviteOpen && (
        <StudioInviteModal
          workspaceId={studioId}
          studioName={studioName}
          onClose={() => setInviteOpen(false)}
          onManageMembers={() =>
            router.push(
              `/settings?studio=${studioId}&tab=members&from=${encodeURIComponent(`/studio/${current?.galleryUrl ?? studioId}`)}`,
            )
          }
        />
      )}
      <GalleryCreatedToast galleryName={createdToast} />
      {/* 코치마크는 갤러리가 하나도 없는 첫 진입에만 — 이미 쓰고 있는 작가에겐 띄우지 않는다 */}
      <StudioCoachMarks
        ready={
          listReady &&
          galleries.length === 0 &&
          !newGalleryOpen &&
          ticketModal === null &&
          !inviteOpen
        }
      />
    </div>
  );
}
