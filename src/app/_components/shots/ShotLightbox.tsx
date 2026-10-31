/**
 * 랜딩 흐름 화면의 크게 보기 — 실제 Lightbox(components/app/Lightbox.tsx)의 틀 · 컨트롤 줄 · 패널을 같은 클래스로 그린 것
 * 위치: src/app/_components/shots/ShotLightbox.tsx
 *
 * 실제 부품은 fixed 레이어 + 초점 · 키보드 관리라 화면 틀 안에 못 띄운다. 컨트롤 버튼(CtlButton · Sep)과 스낵바는 실제 부품.
 * 사진은 원본(samplePhotoUrl). 패널이 열리면(tab) 사진과 패널이 나란히 선다(실제와 같은 폭 330 · 사이 12).
 */

import type { ReactNode, Ref } from "react";
import { CtlButton, Sep } from "@/components/app/Lightbox";
import { Snackbar } from "@/components/app/Snackbar";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, EditNoteIcon, InfoIcon, StarFillIcon, StarIcon, ZoomInIcon, ZoomOutIcon } from "@/components/icons";
import { sampleFile, samplePhotoUrl } from "./samplePhotos";

export type ShotLightboxTab = "none" | "info" | "memo";
const TAB_LABEL: Record<ShotLightboxTab, string> = { none: "", info: "정보", memo: "보정 작성" };
const noop = () => {};

export function ShotLightbox({
  photoId,
  index,
  total,
  caption,
  middle,
  tab = "none",
  panel,
  overlay,
  snack = null,
  rootRef,
  photoBoxRef,
  panelRef,
}: {
  photoId: number;
  /** 0부터 — 카운터는 index + 1 / total */
  index: number;
  total: number;
  /** 카운터 옆 폴더 경로 */
  caption: string;
  /** 이전 · 다음 사이 칸(별점 · 선택) */
  middle?: ReactNode;
  /** 열린 탭 — none이면 사진만 */
  tab?: ShotLightboxTab;
  /** 열린 탭의 내용 */
  panel?: ReactNode;
  /** 사진 위에 얹는 것(점) */
  overlay?: ReactNode;
  /** 컨트롤 위 스낵바 문구 */
  snack?: string | null;
  /** 커서 좌표 계산용 — 틀 전체(absolute inset-0) */
  rootRef?: Ref<HTMLDivElement>;
  /** 커서 좌표 계산용 — 사진 상자 */
  photoBoxRef?: Ref<HTMLDivElement>;
  /** 패널 본문(스크롤) — 내용이 길어지면 아래로 내리는 데 쓴다 */
  panelRef?: Ref<HTMLDivElement>;
}) {
  const open = tab !== "none";
  return (
    <div ref={rootRef} className="absolute inset-0 z-20 flex bg-surface-default-darkness p-7 backdrop-blur-[2px] [--lb-photo-max:470px]">
      <div className={`relative z-10 mx-auto flex min-h-0 w-full ${open ? "" : "justify-center"}`}>
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div ref={photoBoxRef} className="relative max-h-full max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={photoId} src={samplePhotoUrl(photoId)} alt="" draggable={false} className="block max-h-(--lb-photo-max) max-w-full rounded-(--radius-12) object-contain" />
              {overlay}
            </div>
          </div>
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
            <span className="rounded-(--pill) bg-surface-default-medium px-2.5 py-1 type-label-medium-xs text-contents-dark-bgd-default tabular-nums">
              {index + 1} / {total}
              <span className="text-contents-dark-bgd-sub"> · {caption}</span>
            </span>
          </div>
          {!open && (
            <span className="absolute top-3.5 right-3.5 grid size-8 place-items-center rounded-(--radius-8) bg-surface-inverse-light text-contents-dark-bgd-default">
              <CloseIcon size={18} />
            </span>
          )}
          {snack && (
            <Snackbar kind="info" className="absolute bottom-18 left-1/2 z-10 -translate-x-1/2">
              {snack}
            </Snackbar>
          )}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-(--pill) bg-surface-default-darkness px-2 py-1.5 text-contents-dark-bgd-default shadow-(--shadow-modal)">
            <CtlButton label="이전" onClick={noop}>
              <ChevronLeftIcon size={20} />
            </CtlButton>
            {middle && (
              <>
                <Sep />
                {middle}
              </>
            )}
            <Sep />
            <CtlButton label="축소" disabled onClick={noop}>
              <ZoomOutIcon size={20} />
            </CtlButton>
            <CtlButton label="확대" onClick={noop}>
              <ZoomInIcon size={20} />
            </CtlButton>
            <Sep />
            <CtlButton label="정보" pressed={tab === "info"} onClick={noop}>
              <InfoIcon size={18} />
            </CtlButton>
            <CtlButton label="보정 작성" pressed={tab === "memo"} onClick={noop}>
              <EditNoteIcon size={18} />
            </CtlButton>
            <Sep />
            <CtlButton label="다음" onClick={noop}>
              <ChevronRightIcon size={20} />
            </CtlButton>
          </div>
        </div>

        {open && (
          <aside className="ml-3 flex w-82.5 shrink-0 flex-col self-stretch overflow-hidden rounded-(--radius-12) bg-background-default-main">
            <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-divider-default px-4 type-label-semibold-m text-contents-light-bgd-default">
              <span className="truncate">{`IMG_${sampleFile(photoId).slice(1)}.jpg`}</span>
              <span className="shrink-0 type-content-xs font-normal text-contents-light-bgd-weakness">· {TAB_LABEL[tab]}</span>
              <span className="ml-auto grid size-7 place-items-center rounded-(--radius-8) text-contents-light-bgd-sub">
                <CloseIcon size={16} />
              </span>
            </div>
            <div ref={panelRef} className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">{panel}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** 별점 다섯 칸 + 선택 — 실제 SelectionControls 모양(채워진 별은 브랜드 색, 2026-10-26 수민) */
export function ShotSelectionControls({ score, picked }: { score: number; picked: boolean }) {
  return (
    <>
      <div className="flex items-center gap-0.5 px-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= score;
          return (
            <span key={n} className={`grid size-7 place-items-center rounded-full ${on ? "text-brand-secondary-default" : "text-contents-dark-bgd-weakness"}`}>
              {on ? <StarFillIcon size={20} /> : <StarIcon size={20} />}
            </span>
          );
        })}
      </div>
      <Sep />
      <span className={`inline-flex h-7 items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s ${picked ? "bg-brand-secondary-default text-contents-dark-bgd-default" : "bg-surface-inverse-light text-contents-dark-bgd-default"}`}>
        {picked && (
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
        )}
        {picked ? "선택됨" : "선택"}
      </span>
    </>
  );
}
