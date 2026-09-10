/**
 * 작가 — 갤러리 그리드
 * 위치: src/app/(studio)/studio/_components/GalleryGrid.tsx
 *
 * 카드 그리드 마지막에 새 갤러리 점선 타일을 둔다(전체 필터일 때만). 타일이 이용권 상태를
 * 그 자리에서 말한다 — 없음: "결제하면 바로", 다 씀: 잠금 표시. 갤러리가 하나도 없어도
 * 타일만 있는 그리드가 첫 화면이다(빈 상태 카드 없음, 배너는 페이지가 띄운다).
 * 필터 결과가 없을 때만 안내 카드를 보여준다.
 */

import {
  type StageFilter,
  stageFilterLabel,
} from "@/app/(studio)/_lib/galleryStatus";
import { LockIcon, PlusIcon } from "@/components/icons";
import type { StudioTickets } from "@/lib/studioTickets";
import { GalleryCard } from "./GalleryCard";
import { GalleryEmptyState } from "./GalleryEmptyState";
import type { GalleryListItem } from "../_lib/useGalleryList";

type Props = {
  filteredGalleries: GalleryListItem[];
  stageFilter: StageFilter;
  tickets: StudioTickets;
  onCreateClick: () => void;
  onEditGallery: (gallery: GalleryListItem) => void;
  onArchiveGallery: (gallery: GalleryListItem) => void;
  onDeleteGallery: (gallery: GalleryListItem) => void;
  onShowAll: () => void;
};

export function GalleryGrid({
  filteredGalleries,
  stageFilter,
  tickets,
  onCreateClick,
  onEditGallery,
  onArchiveGallery,
  onDeleteGallery,
  onShowAll,
}: Props) {
  if (stageFilter !== "ALL" && filteredGalleries.length === 0) {
    return (
      <GalleryEmptyState label={stageFilterLabel(stageFilter)} onShowAll={onShowAll} />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
      {filteredGalleries.map((gallery) => (
        <GalleryCard
          key={gallery.id}
          gallery={gallery}
          onEdit={onEditGallery}
          onArchive={onArchiveGallery}
          onDelete={onDeleteGallery}
        />
      ))}

      {stageFilter === "ALL" && (
        <NewGalleryTile tickets={tickets} onClick={onCreateClick} />
      )}
    </div>
  );
}

/** 새 갤러리 점선 타일 — 이용권 상태별로 문구·아이콘이 바뀐다 */
function NewGalleryTile({
  tickets,
  onClick,
}: {
  tickets: StudioTickets;
  onClick: () => void;
}) {
  const full = tickets.state === "full";
  return (
    <button
      type="button"
      data-coach="new-gallery"
      onClick={onClick}
      className={`flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-(--radius-16) border border-dashed px-4 text-center transition-colors duration-fast ${
        full
          ? "border-function-warning-default text-function-warning-default hover:bg-function-warning-background"
          : "border-divider-default text-contents-light-bgd-sub hover:bg-brand-secondary-background hover:text-brand-secondary-dark"
      }`}
    >
      <span className="grid size-14 place-items-center rounded-full border border-current">
        {full ? <LockIcon size={24} /> : <PlusIcon size={24} />}
      </span>
      <span className="flex flex-col gap-1">
        <span className="type-content-l">
          {full ? "이용권을 모두 썼어요" : "새 갤러리 만들기"}
        </span>
        {tickets.state !== "ok" && (
          <span className="type-content-xs text-contents-light-bgd-sub">
            {full ? "이용권을 추가하면 만들 수 있어요" : "이용권을 결제하면 바로 만들 수 있어요"}
          </span>
        )}
      </span>
    </button>
  );
}
