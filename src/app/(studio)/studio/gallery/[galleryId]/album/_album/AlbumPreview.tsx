"use client";

/**
 * 앨범 미리보기(이슈 168 PR ③) — 클라이언트가 받아볼 앨범처럼 책장을 넘겨 본다. 편집 표시(번호 · 테두리 · 안내선)는 없다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumPreview.tsx
 *
 * 프로토타입(photobook-react AlbumPreview)을 옮겼다. 표지 → 펼침면 1~N → 뒷표지. 페이지를 누르거나 ← → · Space로 넘기고
 * ✕ · Esc로 닫는다. 넓은 화면은 펼친 책(한 장씩 3D로 넘김), 640 미만은 한 쪽씩 크게(위치 옆 점 두 개가 왼쪽 · 오른쪽 쪽).
 * 표지는 고정 디자인(첫 사진 + 고정 문구, 보라 계열) — 표지 꾸미기는 나중. 두 쪽에 걸친 프레임은 각 쪽에 잘려 그려진다.
 * 미리보기는 테마와 상관없이 어둡다(책이 돋보이게) — 그래서 색은 토큰이 아닌 고정값.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { getCrop, spreadRatio, type Album, type Page } from "@/lib/album/model";
import { cropStyle } from "./photoCrop";
import type { AlbumPhoto } from "./useAlbumSource";

const FLIP_MS = 780;
const ACCENT = "#bca9e8";
const SERIF = "Georgia, 'Times New Roman', serif";

type Turn = { dir: 1 | -1; to: number; go: boolean };

/** 한 쪽 — 펼침면 전체 층을 두고 그 쪽만 보이게 잘라 두 쪽에 걸친 프레임도 이어진다 */
function PageFace({ album, spread, side, photoOf, pageW }: { album: Album; spread: number; side: Page; photoOf: (id: number) => AlbumPhoto | null; pageW: number }) {
  const sp = album.spreads[spread];
  if (!sp) return null;
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: side === 0 ? "linear-gradient(90deg,#fff 78%,#e9e9e6)" : "linear-gradient(90deg,#e6e6e3,#fff 10%)",
        boxShadow: side === 0 ? "-6px 10px 30px rgba(0,0,0,.35)" : "6px 10px 30px rgba(0,0,0,.35)",
      }}
    >
      <div className="absolute top-0 h-full" style={{ width: "200%", left: side === 0 ? 0 : "-100%" }}>
        {sp.frames.map((f) => {
          const pid = album.assign[f.id];
          const photo = pid === undefined ? null : photoOf(pid);
          return (
            <div
              key={f.id}
              className="absolute overflow-hidden bg-[#efefec]"
              style={{ left: `${((f.p + f.x) / 2) * 100}%`, top: `${f.y * 100}%`, width: `${(f.w / 2) * 100}%`, height: `${f.h * 100}%` }}
            >
              {photo?.src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.src} alt="" draggable={false} className="size-full object-cover" style={cropStyle(getCrop(album, f.id))} />
              )}
            </div>
          );
        })}
        {sp.deco && (
          <div
            className="absolute text-[#222] italic"
            style={{ left: `${((sp.deco.p + sp.deco.x) / 2) * 100}%`, top: `${sp.deco.y * 100}%`, fontSize: (pageW * 2) / 34, lineHeight: 1.1, fontFamily: SERIF }}
          >
            {sp.deco.lines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        )}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 z-[2] w-[7%]"
        style={side === 0 ? { right: 0, background: "linear-gradient(90deg,transparent,rgba(0,0,0,.12))" } : { left: 0, background: "linear-gradient(90deg,rgba(0,0,0,.14),transparent)" }}
      />
    </div>
  );
}

function Cover({ back, photo, pageW }: { back: boolean; photo: AlbumPhoto | null; pageW: number }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-[4%] text-[#f4f1fa]"
      style={{ background: "linear-gradient(135deg,#55468a,#352b5e)", boxShadow: back ? "-8px 12px 34px rgba(0,0,0,.45)" : "8px 12px 34px rgba(0,0,0,.45)" }}
    >
      <span aria-hidden className="absolute inset-[5%] border border-[rgba(244,241,250,.35)]" />
      {back ? (
        <div style={{ fontSize: pageW * 0.028, letterSpacing: ".3em", opacity: 0.8 }}>EASY SELECT</div>
      ) : (
        <>
          {photo?.src && (
            <div className="relative aspect-square w-[52%] overflow-hidden border-4 border-[#f4f1fa] shadow-[0_4px_14px_rgba(0,0,0,.3)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt="" className="absolute inset-0 size-full object-cover" />
            </div>
          )}
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: pageW * 0.085, lineHeight: 1 }}>Two hearts, one love</div>
          <div style={{ fontSize: pageW * 0.03, letterSpacing: ".3em", opacity: 0.8 }}>OUR WEDDING ALBUM</div>
        </>
      )}
    </div>
  );
}

function Arrow({ dir, disabled, size, onClick }: { dir: "prev" | "next"; disabled: boolean; size: number; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "이전 페이지" : "다음 페이지"}
      disabled={disabled}
      onClick={onClick}
      className="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:cursor-default disabled:opacity-20 disabled:hover:bg-white/10"
      style={{ width: size, height: size }}
    >
      {dir === "prev" ? <ChevronLeftIcon size={26} /> : <ChevronRightIcon size={26} />}
    </button>
  );
}

/** 상자 크기 — 콜백 ref + ResizeObserver */
function useBox() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size] as const;
}

export function AlbumPreview({ album, photoOf, title, onClose }: { album: Album; photoOf: (id: number) => AlbumPhoto | null; title?: string; onClose: () => void }) {
  const N = album.spreads.length;
  const [boxRef, box] = useBox();
  const phone = box.w > 0 && box.w < 600;
  // 넓은 화면: 0 표지 · 1..N 펼침면 · N+1 뒷표지 / 폰: 0 표지 · 1..2N 쪽 · 2N+1 뒷표지
  const LAST = phone ? 2 * N + 1 : N + 1;
  const [view, setView] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // 화면 폭이 바뀌어 넓은 화면 ↔ 폰이 바뀌면 같은 자리를 이어서 보인다
  const [wasPhone, setWasPhone] = useState(phone);
  if (wasPhone !== phone) {
    setWasPhone(phone);
    setTurn(null);
    setView((v) => (v === 0 ? 0 : phone ? (v > N ? 2 * N + 1 : 2 * v - 1) : v > 2 * N ? N + 1 : Math.ceil(v / 2)));
  }
  const view_ = Math.min(view, LAST);

  const first = album.spreads.flatMap((s) => s.frames).find((f) => album.assign[f.id] !== undefined);
  const coverPhoto = first ? photoOf(album.assign[first.id]) : null;

  const flip = useCallback(
    (dir: 1 | -1) => {
      const to = view_ + dir;
      if (to < 0 || to > LAST) return;
      if (phone) {
        setView(to);
        return;
      }
      setTurn((t) => t ?? { dir, to, go: false });
    },
    [view_, LAST, phone],
  );

  // 한 장 넘김 — 붙인 다음 프레임에 돌리기 시작, 끝나면 다음 자리로
  useEffect(() => {
    if (!turn) return;
    if (!turn.go) {
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setTurn((t) => (t ? { ...t, go: true } : t))));
      return () => cancelAnimationFrame(raf);
    }
    const id = window.setTimeout(() => {
      setView(turn.to);
      setTurn(null);
    }, FLIP_MS);
    return () => window.clearTimeout(id);
  }, [turn]);

  // 키 — 편집 화면 단축키보다 먼저 받는다
  const keys = useRef({ flip, onClose, LAST });
  useEffect(() => {
    keys.current = { flip, onClose, LAST };
  });
  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      const k = keys.current;
      if (e.key === "Escape") k.onClose();
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") k.flip(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") k.flip(-1);
      else if (e.key === "Home") setView(0);
      else if (e.key === "End") setView(k.LAST);
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const ratio = spreadRatio(album.page);
  const pageRatio = album.page.w / album.page.h;
  // 펼친 책 폭 · 폰은 한 쪽 폭
  const W = phone ? Math.max(0, Math.min(box.w * 0.92, box.h * pageRatio * 0.9)) : Math.max(0, Math.min(box.w * 0.94, box.h * ratio * 0.84));
  const pageW = phone ? W : W / 2;

  const side = (v: number, s: Page): ReactNode => {
    if (v === 0) return s === 1 ? <Cover back={false} photo={coverPhoto} pageW={pageW} /> : null;
    if (v === N + 1) return s === 0 ? <Cover back photo={null} pageW={pageW} /> : null;
    return <PageFace album={album} spread={v - 1} side={s} photoOf={photoOf} pageW={pageW} />;
  };

  const shown = turn ? turn.to : view_;
  let pos: ReactNode;
  let dots: Page | null = null;
  if (phone) {
    if (view_ === 0) pos = "표지";
    else if (view_ === LAST) pos = "뒷표지";
    else {
      pos = (
        <>
          펼침면 {Math.ceil(view_ / 2)} <em className="font-normal text-[#a9a7b3] not-italic">/ {N}</em>
        </>
      );
      dots = view_ % 2 === 1 ? 0 : 1;
    }
  } else {
    pos =
      shown === 0 ? (
        "표지"
      ) : shown === LAST ? (
        "뒷표지"
      ) : (
        <>
          펼침면 {shown} <em className="font-normal text-[#a9a7b3] not-italic">/ {N}</em>
        </>
      );
  }

  // 넘기는 동안: 넘어가는 쪽 아래에는 다음 자리의 같은 쪽이 깔린다
  const turnSide: Page | null = turn ? (turn.dir > 0 ? 1 : 0) : null;
  const left = turn && turnSide === 0 ? side(turn.to, 0) : side(view_, 0);
  const right = turn && turnSide === 1 ? side(turn.to, 1) : side(view_, 1);

  const phonePage = (() => {
    if (view_ === 0) return <Cover back={false} photo={coverPhoto} pageW={pageW} />;
    if (view_ === LAST) return <Cover back photo={null} pageW={pageW} />;
    return <PageFace album={album} spread={Math.ceil(view_ / 2) - 1} side={view_ % 2 === 1 ? 0 : 1} photoOf={photoOf} pageW={pageW} />;
  })();

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="앨범 미리보기"
      className="fixed inset-0 z-[60] flex flex-col text-white outline-none"
      style={{ background: "radial-gradient(ellipse at 50% 45%,#36323f 0%,#18171c 70%)" }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between pr-3 pl-6 max-sm:h-14 max-sm:pl-4">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <b className="type-title-s whitespace-nowrap">앨범 미리보기</b>
          {title && <span className="truncate type-content-s text-[#a9a7b3] max-sm:hidden">{title}</span>}
        </div>
        <button type="button" aria-label="닫기" onClick={onClose} className="flex size-10 cursor-pointer items-center justify-center rounded-(--radius-12) text-white outline-none hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-white/60">
          <CloseIcon size={24} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center gap-6 px-6 max-sm:px-4">
        {!phone && <Arrow dir="prev" disabled={view_ === 0} size={52} onClick={() => flip(-1)} />}
        <div ref={boxRef} className="flex h-full min-w-0 flex-1 items-center justify-center">
          {W > 0 &&
            (phone ? (
              <div className="relative" style={{ width: W, height: W / pageRatio }}>
                {phonePage}
                <button type="button" aria-label="이전 페이지" className="absolute inset-y-0 left-0 w-1/2 cursor-pointer" onClick={() => flip(-1)} />
                <button type="button" aria-label="다음 페이지" className="absolute inset-y-0 right-0 w-1/2 cursor-pointer" onClick={() => flip(1)} />
              </div>
            ) : (
              <div
                className="relative transition-transform duration-[600ms] ease-[cubic-bezier(.4,.1,.2,1)]"
                style={{ width: W, height: W / ratio, perspective: 2600, transform: shown === 0 ? "translateX(-25%)" : shown === LAST ? "translateX(25%)" : "none" }}
              >
                <div className={`absolute top-0 left-0 h-full w-1/2 ${left && view_ > 0 ? "cursor-pointer" : ""}`} onClick={() => left && view_ > 0 && flip(-1)}>
                  {left}
                </div>
                <div className={`absolute top-0 right-0 h-full w-1/2 ${right && view_ < LAST ? "cursor-pointer" : ""}`} onClick={() => right && view_ < LAST && flip(1)}>
                  {right}
                </div>
                {turn && turnSide !== null && (
                  <div
                    className="absolute top-0 z-[5] h-full w-1/2"
                    style={{
                      left: turn.dir > 0 ? "50%" : 0,
                      transformOrigin: turn.dir > 0 ? "left center" : "right center",
                      transformStyle: "preserve-3d",
                      transition: turn.go ? "transform .75s cubic-bezier(.45,.05,.25,1)" : "none",
                      transform: turn.go ? `rotateY(${turn.dir > 0 ? -180 : 180}deg)` : "none",
                    }}
                  >
                    <div className="absolute inset-0 [backface-visibility:hidden]">
                      {side(view_, turnSide)}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-[3] transition-opacity duration-[400ms]"
                        style={{ opacity: turn.go ? 1 : 0, background: `linear-gradient(${turn.dir > 0 ? 90 : 270}deg,rgba(0,0,0,.18),transparent 60%)` }}
                      />
                    </div>
                    <div className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                      {side(turn.to, turnSide === 1 ? 0 : 1)}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
        {!phone && <Arrow dir="next" disabled={view_ === LAST} size={52} onClick={() => flip(1)} />}
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-2.5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-4.5">
          {phone && <Arrow dir="prev" disabled={view_ === 0} size={40} onClick={() => flip(-1)} />}
          <span className="inline-flex items-center type-label-semibold-m whitespace-nowrap tabular-nums">
            <span>{pos}</span>
            {dots !== null && (
              <span aria-hidden className="ml-2 inline-flex gap-1.5">
                <i className={`size-1.5 rounded-full ${dots === 0 ? "bg-white" : "bg-white/30"}`} />
                <i className={`size-1.5 rounded-full ${dots === 1 ? "bg-white" : "bg-white/30"}`} />
              </span>
            )}
          </span>
          {phone && <Arrow dir="next" disabled={view_ === LAST} size={40} onClick={() => flip(1)} />}
        </div>
        <div className="h-[3px] w-60 overflow-hidden rounded-full bg-white/15 max-sm:w-40" aria-hidden>
          <i className="block h-full transition-[width] duration-[400ms]" style={{ width: `${Math.max(2, (shown / LAST) * 100)}%`, background: ACCENT }} />
        </div>
      </div>
    </div>
  );
}
