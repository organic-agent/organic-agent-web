"use client";

/**
 * 작가 — 갤러리 목록 페이지
 * 위치: src/app/(photographer)/galleries/page.tsx
 *
 * 작가가 관리하는 갤러리 목록 화면을 그린다.
 * 상태 필터, 갤러리 그리드, 새 갤러리 생성 모달을 조립한다.
 *
 * 주요 책임:
 * - 갤러리 목록 조회와 상태 필터링
 * - 새 갤러리 생성 모달 열림 상태 관리
 * - 작가 사이드바와 목록 화면 렌더링
 *
 * 참고:
 * - 생성은 localStorage 목업 저장소에 반영되며, 세션·API·사진 업로드는 아직 미연결이다.
 */

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
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
import { GalleryStatusFilter } from "./_components/GalleryStatusFilter";
import { NewGalleryModal } from "./_components/NewGalleryModal";

const SIDEBAR_ITEMS = [
  {
    key: "galleries",
    label: "스튜디오",
    href: "/galleries",
    icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    active: true,
  },
  {
    key: "requests",
    label: "보정 요청",
    href: "/requests",
    icon: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  },
  {
    key: "settlement",
    label: "정산",
    href: "/settlement",
    icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  },
  {
    key: "settings",
    label: "설정",
    href: "/settings",
    icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  },
];

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
    <div className="min-h-dvh bg-white flex">
      <AppSidebar
        menu={SIDEBAR_ITEMS}
        user={{
          initial: studio.name.trim().slice(0, 1) || "스",
          name: studio.name,
          role: "studio@email.com",
        }}
        homeHref="/galleries"
      />

      <main className="flex-1 min-w-0">
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div>
            <h1 className="font-display-ko font-medium text-[20px] text-ink leading-none">
              {studio.name}
            </h1>
          </div>
          <button
            onClick={() => setNewGalleryOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-pill bg-ink text-on-ink text-[13px] font-medium hover:-translate-y-px hover:bg-[#333] transition-all active:translate-y-0"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            새 갤러리 만들기
          </button>
        </header>

        <div className="px-6 md:px-8 py-4 border-b border-line">
          <GalleryStatusFilter
            galleries={galleries}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        <div className="px-6 md:px-8 py-8">
          <GalleryGrid
            galleries={galleries}
            filteredGalleries={filteredGalleries}
            onCreateClick={() => setNewGalleryOpen(true)}
            onEditGallery={setEditingGallery}
            onDeleteGallery={setDeletingGallery}
            onShowAll={() => setStatusFilter("전체")}
          />
        </div>
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
