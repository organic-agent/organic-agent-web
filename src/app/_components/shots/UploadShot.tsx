"use client";

/**
 * 랜딩 흐름 01 사진 업로드 — 빈 업로드 모달 → 사진 묶음이 화면 밖에서 끌려 들어와 상자에 떨어짐 → 목록으로 바뀌며 500장이 올라간다
 * 위치: src/app/_components/shots/UploadShot.tsx
 *
 * 뒤 화면: 상단바(업로드 단계 · 사이드바 접힘) · 빈 갤러리 안내(PersonalEmptyGuide 그대로) · 하단 바(ShellBottomBar 그대로).
 * 모달은 UploadModal의 두 상태를 그대로 옮겼다 — 비었을 때(끌어다 놓기 상자)와 담긴 뒤(파일 목록). 실제 제품은 "n장 업로드하기"를
 * 누르면 모달이 닫히고 하단 바에 막대 하나가 남지만, 랜딩에서는 목록의 줄마다 막대가 차는 것으로 보여 준다(2026-10-26 수민).
 * 타임라인(ShotFrame.onVisible이 켬): empty → grab(묶음이 왼쪽 아래 화면 밖에 나타남) → drag(상자로 이동) → over(상자 강조) → drop → list(숫자가
 * 0 → 500으로 오르며 줄마다 막대가 참). 움직임 줄이기면 처음부터 list · 500.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { PersonalEmptyGuide } from "@/app/(client)/gallery/[galleryId]/_shell/PersonalEmptyGuide";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { AddPhotoIcon, CloseIcon, PhotoIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { samplePhotoUrl } from "./samplePhotos";
import { ShotFrame } from "./ShotFrame";
import { ShotTopbar } from "./ShotChrome";
import { useShotTimeline } from "./useShotTimeline";

type Phase = "empty" | "grab" | "drag" | "over" | "drop" | "list";

const TOTAL = 500;
const TOTAL_BYTES = "1.1GB";
/** 목록에 보이는 줄 — 나머지는 "외 n장" */
const ROWS = [
  ["IMG_0001.jpg", "2.1MB"],
  ["IMG_0002.jpg", "1.9MB"],
  ["IMG_0003.jpg", "2.3MB"],
  ["IMG_0004.jpg", "1.8MB"],
  ["IMG_0005.jpg", "2.0MB"],
  ["IMG_0006.jpg", "2.2MB"],
  ["IMG_0007.jpg", "2.1MB"],
] as const;
const PER_ROW = TOTAL / ROWS.length;
/** 끌리는 묶음 세 장(샘플 번호) */
const STACK_IDS = [2, 27, 52];
/** 묶음의 시작(왼쪽 아래 화면 밖 — 폴더 창 없이, 2026-10-26 수민)과 도착(끌어다 놓기 상자 가운데) — 1000×560 기준 */
const STACK_FROM = { x: 120, y: 600 };
const STACK_TO = { x: 468, y: 252 };
const CURSOR_FROM = { x: 164, y: 648 };
const CURSOR_TO = { x: 524, y: 312 };
/** 단계별 시각(ms) — onVisible 뒤 */
const TIMELINE: [Phase, number][] = [
  ["grab", 900],
  ["drag", 1200],
  ["over", 1900],
  ["drop", 2300],
  ["list", 2650],
];
const COUNT_MS = 4200;

const noop = () => {};

export function UploadShot() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [uploaded, setUploaded] = useState(0);
  const run = useShotTimeline();
  const start = () =>
    run(
      TIMELINE.map(([next, at]) => [at, () => setPhase(next)]),
      () => { setPhase("list"); setUploaded(TOTAL); },
    );

  // 목록 단계 — 숫자가 0 → 500으로 오른다(끝에서 천천히). 줄의 막대는 이 숫자에서 나온다
  useEffect(() => {
    if (phase !== "list" || uploaded >= TOTAL) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / COUNT_MS);
      setUploaded(Math.round(TOTAL * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // uploaded는 시작 조건으로만 본다 — 매 프레임 다시 걸지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const dragging = phase === "drag" || phase === "over";
  const dropped = phase === "drop" || phase === "list";
  const stackVisible = phase === "grab" || dragging;
  const cursorVisible = phase !== "empty" && phase !== "list";
  const done = uploaded >= TOTAL;

  return (
    <ShotFrame label="사진 업로드 화면 — 폴더에서 사진 500장을 끌어다 놓으면 한 장씩 올라간다" onVisible={start}>
      <ShotTopbar stageIndex={0} />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <PersonalEmptyGuide />
        </div>
      </div>
      <ShellBottomBar
        selectionCount={0}
        onClearSelection={noop}
        onMoveSelection={noop}
        hint="올리면 AI가 컨셉 · 세부 폴더로 나눠요"
        actions={
          <ShellCta>
            <UploadIcon size={18} />
            사진 업로드
          </ShellCta>
        }
      />

      {/* 업로드 모달 — GalleryModalShell + UploadModal 모양. fixed 대신 absolute(화면 틀 안) */}
      <div className="absolute inset-0 z-10 grid place-items-center px-4">
        <div className="absolute inset-0 bg-surface-default-medium backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-105 rounded-(--radius-16) bg-background-default-main p-8 shadow-(--shadow-modal)">
          <span className="absolute top-5 right-5 inline-flex p-1 text-contents-light-bgd-default">
            <CloseIcon />
          </span>
          <h3 className="mb-1 pr-8 type-title-xl text-contents-light-bgd-default">사진 업로드</h3>
          <p className="mb-6 type-content-m text-contents-light-bgd-sub">업로드가 끝나면 AI가 컨셉 · 세부 폴더로 나눠요</p>

          {phase !== "list" ? (
            <div
              className={`grid w-full place-items-center gap-1 rounded-(--radius-16) border-2 border-dashed py-14 text-center transition-colors duration-fast ${
                phase === "over" || phase === "drop" ? "border-brand-secondary-default bg-brand-secondary-background" : "border-border-default"
              }`}
            >
              <span className="mb-1 flex text-contents-light-bgd-weakness">
                <AddPhotoIcon size={36} />
              </span>
              <p className="type-content-m text-contents-light-bgd-default">여기에 사진이나 ZIP을 끌어다 놓아 주세요</p>
              <p className="type-content-xs text-contents-light-bgd-sub">JPG · PNG · WebP · HEIC · ZIP · 여러 장 한 번에</p>
              <span className="mt-3 inline-flex h-9 items-center rounded-(--radius-8) border border-border-default px-4 type-label-medium-s text-contents-light-bgd-default">
                기기에서 사진 가져오기
              </span>
            </div>
          ) : (
            <>
              <ul className="mb-2 flex flex-col">
                {ROWS.map(([name, size], i) => {
                  const ratio = Math.max(0, Math.min(1, (uploaded - i * PER_ROW) / PER_ROW));
                  return (
                    <li key={name} className="flex items-center gap-2.5 rounded-(--radius-4) px-1.5 py-1.5 type-content-s">
                      <span className="flex shrink-0 text-contents-light-bgd-weakness">
                        <PhotoIcon size={18} />
                      </span>
                      <span className="w-30 shrink-0 truncate text-contents-light-bgd-default">{name}</span>
                      <span className="block h-1 min-w-0 flex-1 overflow-hidden rounded-(--pill) bg-surface-default-light">
                        <span className="block h-full rounded-(--pill) bg-brand-secondary-default" style={{ width: `${ratio * 100}%` }} />
                      </span>
                      <span className="w-11 shrink-0 text-right type-content-xs tabular-nums">
                        {ratio >= 1 ? <span className="text-brand-secondary-dark">완료</span> : <span className="text-contents-light-bgd-weakness">{size}</span>}
                      </span>
                    </li>
                  );
                })}
                <li className="px-1.5 py-2 type-content-xs text-contents-light-bgd-weakness">외 {TOTAL - ROWS.length}장</li>
              </ul>
              <div className="mb-5 flex items-center justify-between gap-3 px-1 type-content-xs text-contents-light-bgd-sub">
                <span className="tabular-nums">
                  {TOTAL}장 · {TOTAL_BYTES}
                </span>
                <span>컨셉 수 건너뜀</span>
              </div>
              <div className="flex gap-2">
                <Button kind="ghost" className="flex-1">
                  사진 더 가져오기
                </Button>
                <Button className="flex-1 tabular-nums" disabled={!done}>
                  {done ? `${TOTAL}장 업로드 완료` : `업로드 중 ${uploaded} / ${TOTAL}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 끌리는 묶음 — 세 장이 겹쳐 있고 "500" 배지. 화면 밖에서 나타나 drag면 상자로 날아가고 drop이면 상자 속으로 사라진다 */}
      <div
        aria-hidden
        className="absolute z-30 h-22 w-16"
        style={{
          left: STACK_FROM.x,
          top: STACK_FROM.y,
          translate: dragging || dropped ? `${STACK_TO.x - STACK_FROM.x}px ${STACK_TO.y - STACK_FROM.y}px` : "0 0",
          scale: dropped ? 0.5 : phase === "grab" ? 1.06 : 1,
          opacity: stackVisible ? 1 : 0,
          transition: "translate 1s var(--ease-expo), scale .35s var(--ease-out), opacity .3s",
        }}
      >
        {STACK_IDS.map((id, i) => (
          <div
            key={id}
            className="absolute inset-0 overflow-hidden rounded-(--radius-8) border-2 border-background-default-main shadow-(--shadow-modal)"
            style={{ rotate: `${(i - 1) * 7}deg`, translate: `${(i - 1) * 4}px 0` }}
          >
            <Image src={samplePhotoUrl(id)} alt="" fill sizes="64px" className="object-cover" />
          </div>
        ))}
        <span className="absolute -top-2 -right-2 grid h-6 min-w-6 place-items-center rounded-(--pill) bg-brand-primary-default px-1.5 type-label-semibold-xs text-contents-dark-bgd-default">
          {TOTAL}
        </span>
      </div>

      {/* 커서 */}
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="absolute top-0 left-0 z-40 size-6 drop-shadow-[0_1px_2px_rgba(0,0,0,.35)]"
        style={{
          translate: dragging || dropped ? `${CURSOR_TO.x}px ${CURSOR_TO.y}px` : `${CURSOR_FROM.x}px ${CURSOR_FROM.y}px`,
          opacity: cursorVisible ? 1 : 0,
          transition: "translate 1s var(--ease-expo), opacity .3s",
        }}
      >
        <path d="M3 2l12 9-5.2 1.1L13 18l-2.4 1-3.2-5.8L3 16z" fill="#fff" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </ShotFrame>
  );
}
