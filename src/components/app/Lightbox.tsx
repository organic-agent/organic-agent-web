"use client";

/**
 * 싱글뷰(라이트박스) — 사진 한 장 + 하단 컨트롤 한 줄 + 오른쪽 패널 (작가 · 클라이언트 공용)
 * 위치: src/components/app/Lightbox.tsx
 *
 * 하단 컨트롤: 이전 · [middle] · 다음 | 탭 아이콘들 (· 패널 닫기). 가운데 칸(middle)은 화면이 채운다 —
 * 클라이언트는 별점 + 선택 토글, 작가는 결과 상태. 패널이 열리면 사진이 왼쪽으로 붙고(분할) 닫으면 가운데 가득.
 * 키보드: ← → 넘기기, Esc는 패널이 열려 있으면 패널을, 아니면 싱글뷰를 닫는다. 그 밖의 키는 onKeyDown으로 넘긴다.
 * 사진 · 컨트롤 · 패널 밖의 빈 곳을 누르면 닫힌다. 사진 위 오버레이(점)와 사진 클릭 좌표는 부모가 다룬다.
 */

import { useEffect, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";

export type LightboxTabDef = { key: string; label: string; icon: ReactNode };

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function Lightbox({
  photo,
  index,
  total,
  caption,
  tab,
  tabs,
  middle,
  panel,
  overlay,
  photoNode,
  onPhotoClick,
  onClose,
  onPrev,
  onNext,
  onTabChange,
  onKeyDown,
}: {
  photo: PhotoResponse;
  index: number;
  total: number;
  /** 카운터 옆 폴더 경로 등 */
  caption: string | null;
  /** 열린 탭 키 — "none"이면 사진만 */
  tab: string;
  tabs: LightboxTabDef[];
  /** 이전 · 다음 사이 칸 */
  middle?: ReactNode;
  /** 열린 탭의 내용 */
  panel: ReactNode;
  /** 사진 위에 얹는 것(보정 요청 점 등) */
  overlay?: ReactNode;
  /** 사진 대신 그릴 것(전/후 비교) — 있으면 photo.viewUrl 대신 이것을 그린다 */
  photoNode?: ReactNode;
  /** 사진 위 클릭 — 0~1 비율 좌표 */
  onPhotoClick?: (x: number, y: number) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTabChange: (tab: string) => void;
  /** 화면별 키(별점 1~5 · 선택 Space 등). true를 돌려주면 처리된 것으로 본다 */
  onKeyDown?: (e: KeyboardEvent) => boolean | void;
}) {
  const open = tab !== "none";

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (open) onTabChange("none");
        else onClose();
      } else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else onKeyDown?.(e);
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose, onPrev, onNext, onTabChange, onKeyDown]);

  const title = tabs.find((t) => t.key === tab)?.label ?? "";
  const closeOnSelf = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${photo.originalFileName} 한 장 보기`} className="fixed inset-0 z-40 flex bg-black/75 p-7 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className={`relative z-10 mx-auto flex min-h-0 w-full max-w-360 ${open ? "" : "justify-center"}`} onClick={closeOnSelf}>
        {/* 사진 무대 — 사진 밖 빈 곳을 누르면 닫힌다 */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col" onClick={closeOnSelf}>
          <div className="relative flex min-h-0 flex-1 items-center justify-center" onClick={closeOnSelf}>
            <div
              className={`relative max-h-full max-w-full ${onPhotoClick ? "cursor-crosshair" : ""}`}
              onClick={
                onPhotoClick
                  ? (e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      onPhotoClick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
                    }
                  : undefined
              }
            >
              {photoNode ??
                (photo.viewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.viewUrl}
                    alt={photo.originalFileName}
                    draggable={false}
                    className={`block max-h-[calc(100dvh-56px)] max-w-full object-contain ${open ? "rounded-l-(--radius-12)" : "rounded-(--radius-12)"}`}
                  />
                ) : (
                  <div className="grid h-105 w-160 place-items-center rounded-(--radius-12) bg-surface-default-light text-contents-light-bgd-weakness">미리보기 준비 중</div>
                ))}
              {overlay}
            </div>
          </div>

          <span className="absolute top-3.5 left-3.5 rounded-(--pill) bg-black/40 px-2.5 py-1 type-label-medium-xs text-white/90 tabular-nums">
            {index + 1} / {total}
            {caption && <span className="text-white/60"> · {caption}</span>}
          </span>
          {!open && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="absolute top-3.5 right-3.5 grid size-8 cursor-pointer place-items-center rounded-(--radius-8) bg-white/15 text-white transition-colors duration-fast hover:bg-white/25"
            >
              <CloseIcon size={18} />
            </button>
          )}

          {/* 하단 컨트롤 한 줄 */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-(--pill) bg-black/80 px-2 py-1.5 text-white shadow-(--shadow-modal)">
            <CtlButton label="이전" onClick={onPrev}>
              <ChevronLeftIcon size={20} />
            </CtlButton>
            {middle && (
              <>
                <Sep />
                {middle}
              </>
            )}
            <Sep />
            <CtlButton label="다음" onClick={onNext}>
              <ChevronRightIcon size={20} />
            </CtlButton>
            <Sep />
            <div className="flex items-center gap-0.5" role="tablist" aria-label="패널">
              {tabs.map((t) => (
                <CtlButton key={t.key} label={t.label} pressed={tab === t.key} onClick={() => onTabChange(tab === t.key ? "none" : t.key)}>
                  {t.icon}
                </CtlButton>
              ))}
              {open && (
                <CtlButton label="패널 닫기" onClick={() => onTabChange("none")} dim>
                  <CloseIcon size={18} />
                </CtlButton>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽 패널 */}
        {open && (
          <aside className="flex w-82.5 shrink-0 flex-col self-stretch overflow-hidden rounded-r-(--radius-12) bg-background-default-main">
            <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-divider-default px-4 type-label-semibold-m text-contents-light-bgd-default">
              <span className="truncate">{photo.originalFileName}</span>
              <span className="shrink-0 type-content-xs font-normal text-contents-light-bgd-weakness">· {title}</span>
              <button
                type="button"
                onClick={() => onTabChange("none")}
                aria-label="패널 닫기"
                className="ml-auto grid size-7 cursor-pointer place-items-center rounded-(--radius-8) text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">{panel}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

export function Sep() {
  return <span aria-hidden className="mx-1 h-4 w-px bg-white/25" />;
}

export function CtlButton({
  label,
  pressed = false,
  dim = false,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  dim?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed || undefined}
      onClick={onClick}
      className={`grid size-8 cursor-pointer place-items-center rounded-(--radius-8) transition-colors duration-fast hover:bg-white/15 ${
        pressed ? "bg-white/22 text-white" : dim ? "text-white/60" : "text-white"
      }`}
    >
      {children}
    </button>
  );
}
