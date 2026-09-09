"use client";

/**
 * 작가 — 갤러리 목록(홈) 페이지
 * 위치: src/app/(studio)/studio/[studio]/page.tsx
 * 시안: 피그마 Photographer/Home (탑바 + 스튜디오 헤더 + 카드 그리드)
 *
 * 주요 책임:
 * - 서버 갤러리 목록 조회(useGalleryList)와 상태 필터링 (필터는 헤더의 팝업이 담당)
 * - 새 갤러리 생성/수정/삭제 모달 열림 상태 관리와 결과의 목록 반영
 * - 스튜디오 이름 서버 동기화 (GET /studios/me → 로컬 캐시, 실패 시 캐시 유지)
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/app/(studio)/_lib/galleryStatus";
import { StudioHeader } from "@/components/photographer/StudioHeader";
import { StudioTopbar } from "@/components/photographer/StudioTopbar";
import { Button } from "@/components/ui/Button";
import {
  fetchStudio,
  listMyStudios,
  type StudioResponse,
} from "@/lib/api/studios";
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
  const [statusFilter, setStatusFilter] = useState("전체");
  const [newGalleryOpen, setNewGalleryOpen] = useState(false);
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState<GalleryListItem | null>(
    null,
  );
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
        studioSlug={current?.galleryUrl ?? params.studio}
        workspaceId={studioId}
      />
      <StudioHeader
        studioName={studioName}
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
