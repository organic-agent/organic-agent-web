/**
 * 게스트 사이드바 — 피그마 Guest/Sidebar 대응 (280px, 그림자 있는 서랍)
 * 위치: src/components/guest/GuestSidebar.tsx
 *
 * 홈(전체) / 앨범 목록. 앨범 라벨은 시안대로 utility.panel 타이포.
 */

import { MenuItem } from "@/components/ui/MenuItem";
import { HomeIcon, PhotoIcon } from "@/components/icons";

export type GuestAlbum = { key: string; label: string; count: number };

export function GuestSidebar({
  albums,
  activeAlbumKey,
  onSelectHome,
  onSelectAlbum,
}: {
  albums: GuestAlbum[];
  /** null = 홈(전체) */
  activeAlbumKey: string | null;
  onSelectHome: () => void;
  onSelectAlbum: (key: string) => void;
}) {
  return (
    <aside className="flex w-70 shrink-0 flex-col gap-2 overflow-y-auto border-r border-stroke-neutral-muted bg-bg-layer-default p-4 shadow-(--shadow-modal)">
      <MenuItem
        icon={<HomeIcon size={20} />}
        label="홈"
        selected={activeAlbumKey === null}
        onClick={onSelectHome}
      />

      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-center gap-2 px-3 py-2 text-fg-neutral">
          <PhotoIcon size={20} />
          <span className="type-body-medium">앨범</span>
        </div>
        {albums.length === 0 && (
          <p className="px-3 py-1 type-body-small text-fg-neutral-muted">
            아직 공유된 앨범이 없어요
          </p>
        )}
        {albums.map((album) => (
          <button
            key={album.key}
            type="button"
            onClick={() => onSelectAlbum(album.key)}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-3 py-2 text-left transition-colors duration-fast hover:bg-bg-layer-default-hover ${
              activeAlbumKey === album.key ? "bg-bg-layer-default-hover" : ""
            }`}
          >
            <span className="min-w-0 flex-1 truncate type-utility-panel text-fg-neutral">
              {album.label}
            </span>
            <span className="shrink-0 type-body-small text-fg-neutral-muted">
              {album.count}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
