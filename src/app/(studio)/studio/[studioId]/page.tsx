"use client";

/**
 * 작가 — 갤러리 목록(홈) 페이지
 * 위치: src/app/(studio)/studio/[studioId]/page.tsx
 * 시안: 피그마 Photographer/Home (탑바 + 스튜디오 헤더 + 카드 그리드)
 *
 * 주요 책임:
 * - 서버 갤러리 목록 조회(useGalleryList)와 상태 필터링 (필터는 헤더의 팝업이 담당)
 * - 새 갤러리 생성/수정/삭제 모달 열림 상태 관리와 결과의 목록 반영
 * - 스튜디오 이름 서버 동기화 (GET /studios/me → 로컬 캐시, 실패 시 캐시 유지)
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { STATUS_LABEL } from "@/app/(studio)/_lib/galleryStatus";
import { StudioHeader } from "@/components/photographer/StudioHeader";
import { StudioTopbar } from "@/components/photographer/StudioTopbar";
import { fetchStudio } from "@/lib/api/studios";
import { updateStudioFromServer, useStudioInfo } from "@/lib/studio";
import { DeleteGalleryConfirmModal } from "../_components/DeleteGalleryConfirmModal";
import { EditGalleryModal } from "../_components/EditGalleryModal";
import { GalleryCreatedToast } from "../_components/GalleryCreatedToast";
import { GalleryGrid } from "../_components/GalleryGrid";
import {
  GalleryListError,
  GalleryListSkeleton,
} from "../_components/GalleryListStates";
import { NewGalleryModal } from "../_components/NewGalleryModal";
import {
  type GalleryListItem,
  useGalleryList,
} from "../_lib/useGalleryList";

export default function GalleriesPage() {
  // 주소 /studio/[studioId] — 어느 스튜디오 홈인지는 주소가 정한다
  const params = useParams<{ studioId: string }>();
  const studioId = Number(params.studioId);
  const { result, reload, addItem, replaceItem, removeItem } = useGalleryList();
  const studio = useStudioInfo();
  const [statusFilter, setStatusFilter] = useState("전체");
  const [newGalleryOpen, setNewGalleryOpen] = useState(false);
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState<GalleryListItem | null>(
    null,
  );
  const [deletingGallery, setDeletingGallery] =
    useState<GalleryListItem | null>(null);

  // 스튜디오 이름은 서버가 진실 — 주소의 studioId로 조회해 캐시를 갱신하고, 실패하면 캐시로 표시
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await fetchStudio(params.studioId);
        if (!cancelled) updateStudioFromServer(mine.name, mine.galleryUrl);
      } catch {
        // 미로그인·소속 아님 등 — 캐시 이름으로 표시를 유지한다
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.studioId]);

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
  const filteredGalleries =
    statusFilter === "전체"
      ? galleries
      : galleries.filter(
          (gallery) => STATUS_LABEL[gallery.status] === statusFilter,
        );

  function handleCreated(gallery: GalleryListItem) {
    addItem(gallery);
    setCreatedToast(gallery.title);
  }

  function handleSaved(gallery: GalleryListItem) {
    replaceItem(gallery);
    setEditingGallery(null);
  }

  function handleDeleted(id: number) {
    removeItem(id);
    setDeletingGallery(null);
  }

  return (
    <div className="min-h-dvh bg-background-default-main">
      <StudioTopbar
        studioId={params.studioId}
        studioInitial={studio.name.trim().slice(0, 1) || "스"}
      />
      <StudioHeader
        studioName={studio.name}
        galleries={galleries}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <main className="mx-auto w-full max-w-wrap px-6 pb-10 pt-6">
        {result === null ? (
          <GalleryListSkeleton />
        ) : result.kind === "error" ? (
          <GalleryListError onRetry={reload} />
        ) : (
          <GalleryGrid
            galleries={galleries}
            filteredGalleries={filteredGalleries}
            onCreateClick={() => setNewGalleryOpen(true)}
            onEditGallery={setEditingGallery}
            onDeleteGallery={setDeletingGallery}
            onShowAll={() => setStatusFilter("전체")}
          />
        )}
      </main>

      <NewGalleryModal
        open={newGalleryOpen}
        onClose={() => setNewGalleryOpen(false)}
        onCreated={handleCreated}
      />
      {editingGallery && (
        <EditGalleryModal
          key={editingGallery.id}
          gallery={editingGallery}
          onClose={() => setEditingGallery(null)}
          onSaved={handleSaved}
        />
      )}
      <DeleteGalleryConfirmModal
        gallery={deletingGallery}
        onClose={() => setDeletingGallery(null)}
        onDeleted={handleDeleted}
      />
      <GalleryCreatedToast galleryName={createdToast} />
    </div>
  );
}
