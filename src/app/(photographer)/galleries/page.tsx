"use client";

/**
 * 작가 — 갤러리 목록(홈) 페이지
 * 위치: src/app/(photographer)/galleries/page.tsx
 * 시안: 피그마 Photographer/Home (탑바 + 스튜디오 헤더 + 카드 그리드)
 *
 * 주요 책임:
 * - 서버 갤러리 목록 조회(useGalleryList)와 상태 필터링 (필터는 헤더의 팝업이 담당)
 * - 새 갤러리 생성/수정/삭제 모달 열림 상태 관리와 결과의 목록 반영
 * - 스튜디오 이름과 작업공간 ID를 서버에서 조회
 */

import { useEffect, useState } from "react";
import type { GalleryResponse } from "@/lib/api/galleries";
import { StudioHeader } from "@/components/photographer/StudioHeader";
import { StudioTopbar } from "@/components/photographer/StudioTopbar";
import { StudioMembersPanel } from "@/components/photographer/StudioMembersPanel";
import { useStudioInfo } from "@/lib/studio";
import { DeleteGalleryConfirmModal } from "./_components/DeleteGalleryConfirmModal";
import { EditGalleryModal } from "./_components/EditGalleryModal";
import { GalleryCreatedToast } from "./_components/GalleryCreatedToast";
import { GalleryGrid } from "./_components/GalleryGrid";
import {
  GalleryListError,
  GalleryListSkeleton,
} from "./_components/GalleryListStates";
import { NewGalleryModal } from "./_components/NewGalleryModal";
import {
  type GalleryListItem,
  useGalleryList,
} from "./_lib/useGalleryList";

export default function GalleriesPage() {
  const [stageFilter, setStageFilter] = useState<GalleryResponse["stage"] | null>(null);
  const { result, reload, addItem, replaceItem, removeItem } = useGalleryList(stageFilter ?? undefined);
  const studio = useStudioInfo();
  const [newGalleryOpen, setNewGalleryOpen] = useState(false);
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState<GalleryListItem | null>(
    null,
  );
  const [deletingGallery, setDeletingGallery] =
    useState<GalleryListItem | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    if (!createdToast) return;
    const timer = window.setTimeout(() => setCreatedToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [createdToast]);

  const galleries = result?.kind === "ready" ? result.items : [];
  const filteredGalleries = galleries;

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
    <div className="min-h-dvh bg-bg-layer-default">
      <StudioTopbar
        studioInitial={studio.name.trim().slice(0, 1) || "스"}
        onMembersClick={studio.workspaceId === null ? undefined : () => setMembersOpen(true)}
      />
      <StudioHeader
        studioName={studio.name}
        galleries={galleries}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
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
            onShowAll={() => setStageFilter(null)}
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
      <StudioMembersPanel open={membersOpen} workspaceId={studio.workspaceId} onClose={() => setMembersOpen(false)} />
    </div>
  );
}
