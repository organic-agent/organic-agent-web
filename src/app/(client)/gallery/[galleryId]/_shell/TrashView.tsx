"use client";

/**
 * 셀렉 휴지통 화면(이슈 160) — 헤더 "휴지통 n장" · 제외 사진 타일 · 하단 바
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/TrashView.tsx
 *
 * 사이드바 트리 맨 아래 "휴지통 n" 행이 유일한 입구. 셀렉 화면(SelectStage)은 체크로 되살릴 사진을 골라 복원하고,
 * 보정 확인 화면(ReviewStage)은 같은 화면을 조회만으로 그린다(요청서를 내보낸 뒤라 서버가 409로 막는다 — "선택 다시 하기"로 돌아온 뒤).
 * 헤더에는 AI 추천 · 필터를 두지 않고(치운 사진에는 뜻이 없다) 게스트 반응 토글만 받는다(leading).
 * 빈 상태 · 못 읽음(다시 시도) · 조회만(자물쇠 한 줄)은 각각 한 줄이다.
 */

import type { ReactNode } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { PhotoGrid, type RaterMark } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { LockIcon, RefreshIcon, SelectAllIcon, TrashIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";
import type { ExcludedPhotosState } from "./useExcludedPhotos";

export function TrashView({
  state,
  photos,
  zoom,
  onZoomChange,
  leading,
  editable,
  selected,
  onToggle,
  currentId = null,
  onOpen,
  markOf,
  captionOf,
  overlayOf,
}: {
  /** 목록 상태(useExcludedPhotos) — photos null이면 읽는 중 · 실패 */
  state: ExcludedPhotosState;
  /** 그릴 사진(state.photos ?? []) */
  photos: PhotoResponse[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  /** 헤더 왼쪽 버튼(게스트 반응 토글). 없으면 비움 */
  leading?: ReactNode;
  /** 체크(되살릴 사진 고르기)를 보일까 — 조회만이면 false */
  editable: boolean;
  selected: ReadonlySet<number>;
  onToggle: (photoId: number) => void;
  currentId?: number | null;
  /** 타일을 눌러 크게 보기 — 없으면 눌리지 않는다 */
  onOpen?: (photoId: number) => void;
  /** 오른쪽 위 치운 사람 이니셜 칩(함께 고르기 색) */
  markOf?: (photo: PhotoResponse) => RaterMark | null;
  captionOf?: (photo: PhotoResponse) => string | null;
  overlayOf?: (photo: PhotoResponse, detailed: boolean) => ReactNode;
}) {
  return (
    <>
      <ShellMainHeader
        title={
          <>
            <span className="flex text-contents-light-bgd-weakness">
              <TrashIcon size={18} />
            </span>
            휴지통
            {state.total !== null && <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{state.total}장</small>}
          </>
        }
        leading={leading}
        zoom={zoom}
        onZoomChange={onZoomChange}
        sort="uploaded"
        onSortChange={() => {}}
        filter="none"
        onFilterChange={() => {}}
        sortable={false}
      />
      <div className="scrollbar-slim scrollbar-stable min-h-0 flex-1 overflow-y-auto">
        {state.photos === null ? (
          state.failed ? (
            <p role="alert" className="flex items-center justify-center gap-3 px-5 py-10 type-content-s text-function-error-default">
              휴지통을 불러오지 못했어요
              <button type="button" onClick={state.reload} className="cursor-pointer type-content-s font-semibold text-contents-light-bgd-default underline underline-offset-2">
                다시 시도
              </button>
            </p>
          ) : (
            <div className="h-40" aria-busy="true" />
          )
        ) : photos.length === 0 ? (
          <p className="px-5 py-10 text-center type-content-s text-contents-light-bgd-sub">휴지통이 비어 있어요</p>
        ) : (
          <PhotoGrid
            photos={photos}
            zoom={zoom}
            selectedIds={selected}
            onToggle={onToggle}
            toggleOn="check"
            selectable={editable}
            markStyle="check"
            currentId={currentId}
            showScore={false}
            onOpen={onOpen}
            markOf={markOf}
            captionOf={captionOf}
            overlayOf={overlayOf}
          />
        )}
      </div>
    </>
  );
}

/** 묶음째 보낼 때 장수가 많으면(20장 넘게) 한 번 묻는다 — 한 장 · 적은 장수는 스낵바 되돌리기로 충분 */
export const TRASH_CONFIRM_FROM = 21;

export function TrashConfirmModal({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: () => void }) {
  return (
    <GalleryModalShell title={`${count}장을 휴지통으로 옮길까요?`} desc="선택에서도 빠져요 · 휴지통에서 언제든 되살릴 수 있어요" maxWidthClassName="max-w-105" onClose={onClose}>
      <GalleryModalButtons onClose={onClose} onConfirm={onConfirm} confirmLabel="휴지통으로" />
    </GalleryModalShell>
  );
}

/**
 * 휴지통 하단 바 — 정리 모드 선택 바와 같은 문법(n장 선택 · 선택 해제 · 모두 선택 · 복원).
 * 고를 수 없으면(조회만) 자물쇠 한 줄과, 있으면 돌아가는 버튼(lockAction — 보정 확인 화면의 "선택 다시 하기").
 */
export function TrashBottomBar({
  editable,
  lockNote,
  lockAction,
  selectedCount,
  total,
  busy = false,
  onClear,
  onSelectAll,
  onRestore,
}: {
  editable: boolean;
  lockNote: string;
  lockAction?: { label: string; onClick: () => void };
  selectedCount: number;
  total: number;
  busy?: boolean;
  onClear: () => void;
  onSelectAll: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="flex h-15 shrink-0 items-center justify-between gap-3 border-t border-divider-default bg-background-default-main px-5 max-[480px]:px-3">
      {!editable ? (
        <>
          <span className="inline-flex min-w-0 items-center gap-1.5 type-content-m text-contents-light-bgd-weakness">
            <LockIcon size={16} />
            <span className="truncate">{lockNote}</span>
          </span>
          {lockAction && (
            <ShellCta kind="outline" onClick={lockAction.onClick}>
              {lockAction.label}
            </ShellCta>
          )}
        </>
      ) : selectedCount > 0 ? (
        <>
          <span className="type-content-m whitespace-nowrap text-contents-light-bgd-sub">
            <b className="type-label-semibold-l text-contents-light-bgd-default">{selectedCount}장</b> 선택
          </span>
          <div className="flex items-center gap-2">
            <ShellCta kind="outline" onClick={onClear}>
              선택 해제
            </ShellCta>
            {selectedCount < total && (
              <ShellCta kind="outline" onClick={onSelectAll}>
                <SelectAllIcon size={18} />
                모두 선택 ({total})
              </ShellCta>
            )}
            <ShellCta disabled={busy} onClick={onRestore}>
              <RefreshIcon size={18} />
              {busy ? "복원하는 중…" : "복원"}
            </ShellCta>
          </div>
        </>
      ) : (
        <>
          <span className="type-content-m text-contents-light-bgd-sub">{total > 0 ? "되살릴 사진을 고르세요" : null}</span>
          {total > 0 && (
            <ShellCta kind="outline" onClick={onSelectAll}>
              <SelectAllIcon size={18} />
              모두 선택 ({total})
            </ShellCta>
          )}
        </>
      )}
    </div>
  );
}
