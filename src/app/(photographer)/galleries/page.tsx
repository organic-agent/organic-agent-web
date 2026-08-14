"use client";

/**
 * 작가 — 갤러리 목록(홈) 페이지
 * 위치: src/app/(photographer)/galleries/page.tsx
 * 시안: 피그마 Photographer/Home (탑바 + 스튜디오 헤더 + 카드 그리드)
 *
 * 주요 책임:
 * - 갤러리 목록 조회와 상태 필터링 (필터는 헤더의 팝업이 담당)
 * - 새 갤러리 생성/수정/삭제 모달 열림 상태 관리
 *
 * 참고:
 * - 생성은 localStorage 목업 저장소에 반영되며, 세션·API·사진 업로드는 아직 미연결이다.
 */

import { useEffect, useState } from "react";
import { StudioHeader } from "@/components/photographer/StudioHeader";
import { StudioTopbar } from "@/components/photographer/StudioTopbar";
import {
  type Gallery,
  deleteGallery,
  getGalleryBadge,
  updateGallery,
  useGalleries,
} from "@/lib/galleries";
import { useStudioInfo } from "@/lib/studio";
import { DeleteGalleryConfirmModal } from "./_components/DeleteGalleryConfirmModal";
import { EditGalleryModal } from "./_components/EditGalleryModal";
import { GalleryCreatedToast } from "./_components/GalleryCreatedToast";
import { GalleryGrid } from "./_components/GalleryGrid";
import { NewGalleryModal } from "./_components/NewGalleryModal";

export default function GalleriesPage() {
  const galleries = useGalleries();
  const studio = useStudioInfo();
  const [statusFilter, setStatusFilter] = useState("전체");
  const [newGalleryOpen, setNewGalleryOpen] = useState(false);
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
  const [deletingGallery, setDeletingGallery] = useState<Gallery | null>(null);

  useEffect(() => {
    if (!createdToast) return;
    const timer = window.setTimeout(() => setCreatedToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [createdToast]);

  const filteredGalleries =
    statusFilter === "전체"
      ? galleries
      : galleries.filter(
          (gallery) => getGalleryBadge(gallery).label === statusFilter,
        );

  function saveGalleryEdit(
    patch: Pick<
      Gallery,
      "couple" | "dueDate" | "target" | "conceptCount" | "memo"
    >,
  ) {
    if (!editingGallery) return;
    updateGallery(editingGallery.id, patch);
    setEditingGallery(null);
  }

  function confirmDeleteGallery() {
    if (!deletingGallery) return;
    deleteGallery(deletingGallery.id);
    setDeletingGallery(null);
  }

  return (
    <div className="min-h-dvh bg-bg-layer-default">
      <StudioTopbar
        studioInitial={studio.name.trim().slice(0, 1) || "스"}
      />
      <StudioHeader
        studioName={studio.name}
        galleries={galleries}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <main className="mx-auto w-full max-w-wrap px-6 pb-10 pt-6">
        <GalleryGrid
          galleries={galleries}
          filteredGalleries={filteredGalleries}
          onCreateClick={() => setNewGalleryOpen(true)}
          onEditGallery={setEditingGallery}
          onDeleteGallery={setDeletingGallery}
          onShowAll={() => setStatusFilter("전체")}
        />
      </main>

      <NewGalleryModal
        open={newGalleryOpen}
        onClose={() => setNewGalleryOpen(false)}
        onCreated={setCreatedToast}
      />
      {editingGallery && (
        <EditGalleryModal
          key={editingGallery.id}
          gallery={editingGallery}
          onClose={() => setEditingGallery(null)}
          onSave={saveGalleryEdit}
        />
      )}
      <DeleteGalleryConfirmModal
        gallery={deletingGallery}
        onClose={() => setDeletingGallery(null)}
        onConfirm={confirmDeleteGallery}
      />
      <GalleryCreatedToast galleryName={createdToast} />
    </div>
  );
}
