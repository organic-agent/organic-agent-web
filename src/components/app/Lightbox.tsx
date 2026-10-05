"use client";

/**
 * 싱글뷰(라이트박스) — 사진 한 장 + 하단 컨트롤 한 줄 + 오른쪽 패널 (작가 · 클라이언트 공용)
 * 위치: src/components/app/Lightbox.tsx
 *
 * 하단 컨트롤: 이전 | [middle] | 축소 · 확대 | 탭 아이콘들 | 다음 — 이전 · 다음은 줄의 양 끝에 둔다. 가운데 칸(middle)은 화면이 채운다 —
 * 클라이언트는 별점 + 선택 토글, 작가는 결과 상태. 패널이 열리면 사진과 패널이 사이를 띄우고 나란히 서고(둘 다 네 모서리 둥글게),
 * 닫으면 사진이 가운데 가득. 패널은 패널 머리의 X · 같은 탭 아이콘 · Esc로 닫는다(컨트롤 줄에는 닫기 버튼을 두지 않는다).
 * 확대(zoom을 준 화면만, 이슈 88): 사진 더블클릭은 2배 ↔ 원래 크기, 휠은 1~4배, 컨트롤 줄의 축소 · 확대와 + · − 키는
 * 한 단계씩. 확대한 채 끌어서 옮기고, 사진을 넘기면 풀린다. 확대하는 순간 원본 주소로 큰 사진을 받아 미리보기 위에 얹는다
 * (받는 동안 스낵바로 알린다). 사진을 누르는 것이 점 찍기인 동안(onPhotoClick)은 더블클릭 확대를 끈다.
 * 키보드: ← → 넘기기, Esc는 확대 중이면 확대를, 패널이 열려 있으면 패널을, 아니면 싱글뷰를 닫는다. 그 밖의 키는 onKeyDown으로 넘긴다.
 * 처음 · 끝에서는 돌아가지 않고 멈추며 스낵바로 알린다("마지막 사진이에요"). 화면이 띄울 알림(별점 저장 실패 등)은 notice로 받는다.
 * 마우스로 누른 버튼에는 초점을 남기지 않는다 — 남으면 다음 Space · Enter가 그 버튼을 다시 눌러 방금 매긴 별점이 지워졌다(2차 QA).
 * Tab으로 버튼에 초점을 둔 경우의 Space · Enter는 그 버튼만 누른다(단축키와 겹치지 않게).
 * 열려 있는 동안 키보드 초점은 싱글뷰가 갖고(Tab도 안에서 돈다) 닫히면 연 곳으로 돌려준다 — 초점이 뒤의 그리드 타일에 남으면
 * Space · Enter가 그 타일을 다시 눌러 처음 연 사진으로 되돌아갔다(2차 QA). 위에 다른 모달이 떠 있으면 키를 받지 않는다.
 * 사진 · 컨트롤 · 패널 밖의 빈 곳을 누르면 닫힌다. 사진 위 오버레이(점)와 사진 클릭 좌표는 부모가 다룬다.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Snackbar, type SnackbarKind } from "@/components/app/Snackbar";
import { useLightboxZoom } from "@/components/app/useLightboxZoom";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ZoomInIcon, ZoomOutIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";

export type LightboxTabDef = { key: string; label: string; icon: ReactNode };

export type LightboxZoom = {
  /** 확대할 때 바꿔 끼울 큰 사진의 주소를 받아 온다. 쓸 수 없으면 null — 미리보기를 그대로 확대한다 */
  loadOriginal?: (photo: PhotoResponse) => Promise<string | null>;
};

/** 큰 사진 — 지금 보는 사진의 것만 든다. slow는 받는 데 시간이 걸려 알림을 띄울 때 */
type Original = { photoId: number; status: "loading" | "slow" | "none" } | { photoId: number; status: "ready"; url: string };

/** 큰 사진을 이보다 오래 받으면 알린다 — 금방 오면 알림이 깜빡이지 않게 */
const ORIGINAL_NOTICE_AFTER_MS = 400;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 싱글뷰 위에 다른 모달(빼기 확인 등)이 떠 있는가 — 그동안은 키가 그 모달의 것이다 */
function isCovered(root: HTMLElement) {
  return [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some((el) => el !== root);
}

/** Tab이 싱글뷰 밖(뒤에 깔린 화면)으로 나가지 않게 처음과 끝을 잇는다 */
function keepTabInside(e: KeyboardEvent, root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (items.length === 0) {
    e.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (active === root || !root.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
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
  panelTitle,
  onPhotoClick,
  onClose,
  onPrev,
  onNext,
  onTabChange,
  onKeyDown,
  onImageError,
  notice = null,
  zoom,
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
  /** 패널 머리에 파일명 대신 쓸 것(게스트 — 파일명은 의미가 없다) */
  panelTitle?: string;
  /** 사진 위 클릭 — 0~1 비율 좌표 */
  onPhotoClick?: (x: number, y: number) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTabChange: (tab: string) => void;
  /** 화면별 키(별점 1~5 · 선택 Space 등). true를 돌려주면 처리된 것으로 본다 */
  onKeyDown?: (e: KeyboardEvent) => boolean | void;
  /** 사진이 그려지지 않았을 때(주소 만료 등) — 부모가 목록을 다시 읽어 새 주소를 준다 */
  onImageError?: () => void;
  /** 컨트롤 위에 띄울 알림 — 띄우고 지우는 때는 부모가 정한다 */
  notice?: { kind: SnackbarKind; text: string } | null;
  /** 사진 확대를 켠다. photoNode를 그리는 동안(전/후 비교)과 미리보기가 없을 때는 꺼진다 */
  zoom?: LightboxZoom;
}) {
  const open = tab !== "none";
  const rootRef = useRef<HTMLDivElement>(null);

  const zoomOn = zoom !== undefined && !photoNode && photo.viewUrl !== null;
  const [original, setOriginal] = useState<Original | null>(null);
  const shownOriginal = original?.photoId === photo.photoId ? original : null;

  /** 확대하는 순간 큰 사진을 받는다 — 다 받아야 바꿔 끼운다(받는 중에 반쯤 그려진 사진이 보이지 않게) */
  function startOriginal() {
    const load = zoom?.loadOriginal;
    if (!load || shownOriginal) return;
    const photoId = photo.photoId;
    const mine = (cur: Original | null) => cur?.photoId === photoId;
    setOriginal({ photoId, status: "loading" });
    const slow = window.setTimeout(
      () => setOriginal((cur) => (mine(cur) && cur?.status === "loading" ? { photoId, status: "slow" } : cur)),
      ORIGINAL_NOTICE_AFTER_MS,
    );
    load(photo)
      .then(
        (url) =>
          new Promise<string>((resolve, reject) => {
            if (!url) {
              reject(new Error("원본 없음"));
              return;
            }
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => reject(new Error("원본을 그리지 못함"));
            img.src = url;
          }),
      )
      .then((url) => setOriginal((cur) => (mine(cur) ? { photoId, status: "ready", url } : cur)))
      // 받지 못하면 미리보기를 그대로 확대한다 — 이 사진은 다시 받으려 하지 않는다
      .catch(() => setOriginal((cur) => (mine(cur) ? { photoId, status: "none" } : cur)))
      .finally(() => window.clearTimeout(slow));
  }

  const { stageRef, boxRef, ...z } = useLightboxZoom({
    enabled: zoomOn,
    photoKey: photo.photoId,
    doubleClick: zoomOn && !onPhotoClick,
    onZoomIn: startOriginal,
  });
  // 키 리스너는 아래 effect에 한 번 걸린다 — 확대의 최신 상태는 여기서 읽는다
  const zoomRef = useRef(z);
  useEffect(() => {
    zoomRef.current = z;
  });

  // 열릴 때 초점을 가져오고 닫힐 때 연 곳으로 돌려준다
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, []);

  /** 처음 · 끝에서 더 넘기려 할 때의 알림 — 누를 때마다 새 값이라 시간이 다시 잡힌다 */
  const [edge, setEdge] = useState<{ text: string } | null>(null);
  useEffect(() => {
    if (!edge) return;
    const timer = window.setTimeout(() => setEdge(null), 1800);
    return () => window.clearTimeout(timer);
  }, [edge]);
  const go = useCallback(
    (delta: -1 | 1) => {
      if (delta < 0 ? index <= 0 : index >= total - 1) {
        setEdge({ text: delta < 0 ? "첫 번째 사진이에요" : "마지막 사진이에요" });
        return;
      }
      setEdge(null);
      if (delta < 0) onPrev();
      else onNext();
    },
    [index, total, onPrev, onNext],
  );

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const root = rootRef.current;
      if (root && isCovered(root)) return;
      if (e.key === "Tab") {
        if (root) keepTabInside(e, root);
        return;
      }
      if (isTyping(e.target)) return;
      // 초점이 버튼에 있으면 Space · Enter는 그 버튼을 누르는 키다
      if ((e.key === " " || e.key === "Enter") && e.target !== root && e.target instanceof HTMLElement && e.target.closest("button, a, summary")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (zoomRef.current.zoomed) zoomRef.current.reset();
        else if (open) onTabChange("none");
        else onClose();
      } else if (zoomOn && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomRef.current.stepIn();
      } else if (zoomOn && e.key === "-") {
        e.preventDefault();
        zoomRef.current.stepOut();
      } else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else onKeyDown?.(e);
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, zoomOn, onClose, go, onTabChange, onKeyDown]);

  const title = tabs.find((t) => t.key === tab)?.label ?? "";
  const closeOnSelf = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.originalFileName} 한 장 보기`}
      className="fixed inset-0 z-40 flex bg-black/75 p-7 outline-none backdrop-blur-[2px]"
      onClick={(e) => {
        // 마우스로 누른 뒤에는 초점을 싱글뷰로 되돌린다(키보드로 누른 클릭은 detail이 0)
        const active = document.activeElement;
        if (e.detail > 0 && !isTyping(active) && !(active instanceof HTMLSelectElement)) rootRef.current?.focus({ preventScroll: true });
      }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className={`relative z-10 mx-auto flex min-h-0 w-full max-w-360 ${open ? "" : "justify-center"}`} onClick={closeOnSelf}>
        {/* 사진 무대 — 사진 밖 빈 곳을 누르면 닫힌다 */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col" onClick={closeOnSelf}>
          {/* 확대하면 사진이 이 영역 전체로 넓어지고 밖은 잘린다 */}
          <div
            ref={stageRef}
            className={`relative flex min-h-0 flex-1 items-center justify-center ${z.zoomed ? "overflow-hidden rounded-(--radius-12)" : ""}`}
            onClick={closeOnSelf}
          >
            <div
              ref={boxRef}
              {...(zoomOn ? z.boxProps : {})}
              style={z.style}
              className={`relative max-h-full max-w-full ${zoomOn ? "select-none" : ""} ${z.zoomed ? "touch-none" : ""} ${
                zoomOn && z.smooth ? "motion-safe:transition-transform motion-safe:duration-fast" : ""
              } ${onPhotoClick ? "cursor-crosshair" : z.zoomed ? (z.dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
              onClick={
                onPhotoClick
                  ? (e) => {
                      // 끌어서 옮긴 뒤의 클릭은 점 찍기가 아니다
                      if (z.consumeDrag()) return;
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
                    onError={onImageError}
                    className="block max-h-[calc(100dvh-56px)] max-w-full rounded-(--radius-12) object-contain"
                  />
                ) : (
                  <div className="grid h-105 w-160 place-items-center rounded-(--radius-12) bg-surface-default-light text-contents-light-bgd-weakness">미리보기 준비 중</div>
                ))}
              {/* 큰 사진은 미리보기 위에 같은 크기로 얹는다 — 자리는 미리보기가 잡아 사진 크기가 바뀌지 않는다 */}
              {zoomOn && shownOriginal?.status === "ready" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownOriginal.url}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="pointer-events-none absolute inset-0 size-full rounded-(--radius-12) object-contain"
                />
              )}
              {overlay}
            </div>
          </div>

          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
            <span className="rounded-(--pill) bg-black/40 px-2.5 py-1 type-label-medium-xs text-white/90 tabular-nums">
              {index + 1} / {total}
              {caption && <span className="text-white/60"> · {caption}</span>}
            </span>
            {z.zoomed && (
              <span className="rounded-(--pill) bg-black/40 px-2.5 py-1 type-label-medium-xs text-white/90 tabular-nums">
                {z.scale.toFixed(1)}×
              </span>
            )}
          </div>
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

          {(notice ?? edge ?? (z.zoomed && shownOriginal?.status === "slow" ? shownOriginal : null)) && (
            <Snackbar kind={notice?.kind ?? "info"} className="absolute bottom-18 left-1/2 z-10 -translate-x-1/2">
              {notice?.text ?? edge?.text ?? "큰 사진 불러오는 중"}
            </Snackbar>
          )}

          {/* 하단 컨트롤 한 줄 */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-(--pill) bg-black/80 px-2 py-1.5 text-white shadow-(--shadow-modal)">
            <CtlButton label="이전" onClick={() => go(-1)}>
              <ChevronLeftIcon size={20} />
            </CtlButton>
            {middle && (
              <>
                <Sep />
                {middle}
              </>
            )}
            {zoomOn && (
              <>
                <Sep />
                <CtlButton label="축소" disabled={!z.canOut} onClick={z.stepOut}>
                  <ZoomOutIcon size={20} />
                </CtlButton>
                <CtlButton label="확대" disabled={!z.canIn} onClick={z.stepIn}>
                  <ZoomInIcon size={20} />
                </CtlButton>
              </>
            )}
            {tabs.length > 0 && (
              <>
                <Sep />
                <div className="flex items-center gap-0.5" role="tablist" aria-label="패널">
                  {tabs.map((t) => (
                    <CtlButton key={t.key} label={t.label} pressed={tab === t.key} onClick={() => onTabChange(tab === t.key ? "none" : t.key)}>
                      {t.icon}
                    </CtlButton>
                  ))}
                </div>
              </>
            )}
            <Sep />
            <CtlButton label="다음" onClick={() => go(1)}>
              <ChevronRightIcon size={20} />
            </CtlButton>
          </div>
        </div>

        {/* 오른쪽 패널 */}
        {open && (
          <aside className="ml-3 flex w-82.5 shrink-0 flex-col self-stretch overflow-hidden rounded-(--radius-12) bg-background-default-main">
            <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-divider-default px-4 type-label-semibold-m text-contents-light-bgd-default">
              <span className="truncate">{panelTitle ?? photo.originalFileName}</span>
              {panelTitle === undefined && <span className="shrink-0 type-content-xs font-normal text-contents-light-bgd-weakness">· {title}</span>}
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
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed || undefined}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 cursor-pointer place-items-center rounded-(--radius-8) text-white transition-colors duration-fast hover:bg-white/15 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent ${
        pressed ? "bg-white/22" : ""
      }`}
    >
      {children}
    </button>
  );
}
