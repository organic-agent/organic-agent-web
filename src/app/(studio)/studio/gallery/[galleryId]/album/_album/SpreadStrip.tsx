"use client";

/**
 * 펼침면 띠(이슈 168) — 아래쪽 가로 목록. 프레임 모양과 넣은 사진을 작게 그리고, 누르면 그 펼침면으로
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/SpreadStrip.tsx
 *
 * 선택에서 빠진 프레임이 있는 펼침면은 오른쪽 위에 회색 점.
 * 펼침면 관리(PR ②) — 우클릭 메뉴는 "펼침면 n 삭제" 하나(마지막 한 장은 못 지움), 끌어서 순서 바꾸기(보라 세로선이 놓일 자리),
 * 끝의 "펼침면 추가". 사진이 든 펼침면을 지울지는 작업 화면이 묻는다.
 * 클라이언트(PR ③)는 관리 없이 보기 · 이동만(manage false). 고친 펼침면은 보라 점(accentDots).
 */

import { useEffect, useRef, useState, type DragEvent } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { eulReul, getCrop, spreadRatio, type Album, type FrameIndex } from "@/lib/album/model";
import { cropStyle } from "./photoCrop";
import type { AlbumPhoto } from "./useAlbumSource";

const MENU_W = 176;
const MENU_H = 48;

type Menu = { index: number; x: number; y: number };

function DropBar() {
  return <span aria-hidden className="block h-16 w-0.5 shrink-0 rounded-full bg-brand-accent-default" />;
}

export function SpreadStrip({
  album,
  F,
  photoOf,
  grayDots,
  onGo,
  onAdd,
  onDelete,
  onMove,
  manage = true,
  accentDots,
}: {
  album: Album;
  F: FrameIndex;
  photoOf: (photoId: number) => AlbumPhoto | null;
  grayDots: ReadonlySet<number>;
  onGo: (spread: number) => void;
  onAdd: () => void;
  onDelete: (spread: number) => void;
  /** before = 옮기기 전 순서에서 "이 펼침면 앞에"(끝이면 개수) */
  onMove: (from: number, before: number) => void;
  /** false — 우클릭 메뉴 · 끌기 · 추가 없음(클라이언트) */
  manage?: boolean;
  /** 보라 점 — 클라이언트가 고친 펼침면 */
  accentDots?: ReadonlySet<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropBefore, setDropBefore] = useState<number | null>(null);
  const count = album.spreads.length;

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [album.spread]);

  // 메뉴 닫기 — 바깥 누르기 · Esc · 띠 스크롤 · 창 크기
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    function onDown(e: PointerEvent) {
      if (!(e.target instanceof Element && e.target.closest("[data-spread-menu]"))) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    const strip = ref.current;
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    strip?.addEventListener("scroll", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
      strip?.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  function endDrag() {
    setDragFrom(null);
    setDropBefore(null);
  }
  function over(e: DragEvent, before: number) {
    if (dragFrom === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropBefore !== before) setDropBefore(before);
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    if (dragFrom !== null && dropBefore !== null) onMove(dragFrom, dropBefore);
    endDrag();
  }
  // 제자리(앞뒤 그대로)면 선을 보이지 않는다
  const showBar = (before: number) => dragFrom !== null && dropBefore === before && before !== dragFrom && before !== dragFrom + 1;

  const tileW = Math.round(56 * spreadRatio(album.page));
  return (
    <div ref={ref} className="scrollbar-slim flex h-28 shrink-0 items-center gap-1 overflow-x-auto border-t border-divider-default px-3.5" aria-label="펼침면" onDrop={drop}>
      {album.spreads.map((sp, s) => {
        const current = s === album.spread;
        return (
          <div key={sp.id} className="flex shrink-0 items-center gap-1">
            {showBar(s) && <DropBar />}
            <button
              type="button"
              aria-current={current}
              draggable={manage}
              onClick={() => onGo(s)}
              onContextMenu={(e) => {
                if (!manage) return;
                e.preventDefault();
                const x = e.clientX + MENU_W + 8 > window.innerWidth ? e.clientX - MENU_W : e.clientX + 4;
                const y = e.clientY + MENU_H + 8 > window.innerHeight ? e.clientY - MENU_H - 4 : e.clientY + 4;
                setMenu({ index: s, x, y });
              }}
              onDragStart={(e) => {
                setMenu(null);
                setDragFrom(s);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(s));
              }}
              onDragOver={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                over(e, e.clientX > r.left + r.width / 2 ? s + 1 : s);
              }}
              onDragEnd={endDrag}
              className={`flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-(--radius-8) px-3.5 py-2.5 transition-colors duration-fast ${
                current ? "bg-surface-default-lightness" : "hover:bg-surface-default-lightness"
              } ${dragFrom === s ? "opacity-35" : ""} ${menu?.index === s ? "outline-2 -outline-offset-2 outline-brand-accent-default" : ""}`}
            >
              <span className={`relative block h-14 bg-white ${current ? "ring-2 ring-brand-accent-default" : "ring-1 ring-divider-default"}`} style={{ width: tileW }}>
                {F.of(s).map((f) => {
                  const pid = album.assign[f.id];
                  const photo = pid === undefined ? null : photoOf(pid);
                  return (
                    <span
                      key={f.id}
                      className="absolute overflow-hidden bg-brand-accent-surface"
                      style={{ left: `${(f.p * 0.5 + f.x * 0.5) * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 50}%`, height: `${f.h * 100}%` }}
                    >
                      {photo?.src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.src} alt="" loading="lazy" draggable={false} className="size-full object-cover" style={cropStyle(getCrop(album, f.id))} />
                      )}
                    </span>
                  );
                })}
                {accentDots?.has(s) && <span aria-label="고친 곳 있음" className="absolute -top-1.5 -right-1.5 size-3 rounded-full border-2 border-background-default-main bg-brand-accent-default" />}
                {grayDots.has(s) && <span aria-label="선택에서 빠진 프레임 있음" className="absolute -top-1.5 -right-1.5 size-3 rounded-full border-2 border-background-default-main bg-surface-default-medium" />}
              </span>
              <span className={`type-content-xs whitespace-nowrap ${current ? "font-semibold text-brand-accent-text" : "text-contents-light-bgd-sub"}`}>펼침면 {s + 1}</span>
            </button>
          </div>
        );
      })}
      {showBar(count) && <DropBar />}
      {manage && (
      <button
        type="button"
        onClick={onAdd}
        onDragOver={(e) => over(e, count)}
        className="flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-(--radius-8) px-3.5 py-2.5 text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness"
      >
        <span className="grid h-14 place-items-center rounded-(--radius-4) border border-dashed border-border-default" style={{ width: tileW }}>
          <PlusIcon size={22} />
        </span>
        <span className="type-content-xs whitespace-nowrap">펼침면 추가</span>
      </button>
      )}
      {menu && (
        <div
          data-spread-menu
          role="menu"
          className="fixed z-50 flex flex-col rounded-(--radius-12) border border-divider-default bg-background-default-main p-1.5 shadow-[0_12px_32px_rgba(0,0,0,.16)]"
          style={{ left: menu.x, top: menu.y, width: MENU_W }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={count <= 1}
            onClick={() => {
              setMenu(null);
              onDelete(menu.index);
            }}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-(--radius-8) px-2.5 type-content-s text-function-error-default hover:bg-function-error-background disabled:cursor-default disabled:text-contents-light-bgd-disabled disabled:hover:bg-transparent"
          >
            <TrashIcon size={18} />
            펼침면 {menu.index + 1} 삭제
          </button>
        </div>
      )}
    </div>
  );
}

/** 사진이 든 펼침면을 지울 때 묻는 창 */
export function DeleteSpreadModal({ index, photos, onClose, onConfirm }: { index: number; photos: number; onClose: () => void; onConfirm: () => void }) {
  return (
    <GalleryModalShell title={`펼침면 ${index + 1}${eulReul(index + 1)} 지울까요?`} desc={`넣은 사진 ${photos}장은 사진 패널로 돌아가요`} maxWidthClassName="max-w-96" onClose={onClose}>
      <GalleryModalButtons onClose={onClose} onConfirm={onConfirm} confirmLabel="삭제" confirmVariant="danger" />
    </GalleryModalShell>
  );
}
