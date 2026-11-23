"use client";

/**
 * 랜딩 흐름 04 보정 요청 작성 — 크게 보기의 "보정 요청" 탭이 열린 채 시작해, 둘째 점을 찍고 한 줄 적고 AI로 다듬어 적용한다
 * 위치: src/app/_components/shots/RetouchShot.tsx
 *
 * 틀은 공용 ShotLightbox(실제 Lightbox 클래스), 사진 위 점은 실제 RetouchPins, 패널은 실제 RetouchPanel의 마크업을 옮긴 것.
 * 핀 1은 처음부터 있고 사용자가 적은 문장 그대로(AI 안 거침, 2026-10-26 수민). 핀 2가 타임라인의 주인공:
 * 0.8초 커서가 사진으로 → 1.5초 클릭 · 점 2 → 1.9초부터 한 글자씩 "볼 그림자 조금 밝게" → 3.0초 커서가 "AI 내용 다듬기"로 →
 * 3.6초 클릭 · 다듬는 중 → 4.8초 AI 제안(패널을 아래로 내림) → 5.3초 커서가 "적용"으로 → 5.9초 클릭 · 적용.
 * 커서 목표는 그려진 요소의 자리를 재서 잡는다(틀 zoom을 나눠 1000×560 좌표로). 움직임 줄이기면 끝 상태.
 * tour(흐름 확대 투어, 이슈 182 시안 4-5): 주면 타임라인 대신 스크롤 단계가 상태를 정한다 — 0 핀 1만, 1 커서가 둘째 점을 찍고
 * 한 줄 적음, 2 "AI 내용 다듬기" → 다듬는 중 → 제안 → 적용. 위로 되돌아가도, 구역에 다시 들어와도(replay가 바뀜) 그 단계의
 * 움직임을 다시 한다(2026-11-23 수민). 투어가 아니면 화면에서 빠질 때 되감았다가 다시 들어오면 처음부터.
 * 카메라가 확대해도 커서 자리는 맞다 — 틀과 요소가 같이 커지니 비율이 그대로.
 */

import { useEffect, useRef, useState } from "react";
import { RetouchPins } from "@/app/(client)/gallery/[galleryId]/_shell/RetouchPanel";
import { CheckCircleIcon, SparkleIcon, TrashIcon } from "@/components/icons";
import { ShotCursor, ShotTopbar } from "./ShotChrome";
import { SHOT_W, ShotFrame, type ShotCamera, type ShotCrop } from "./ShotFrame";
import { ShotLightbox, ShotSelectionControls } from "./ShotLightbox";
import { useShotTimeline } from "./useShotTimeline";

const PHOTO_ID = 54;
/** 핀 1 — 처음부터 있는 것, 사용자가 적은 그대로 */
const PIN1 = { x: 0.56, y: 0.13, text: "잔머리 정리해 주세요" };
/** 핀 2 — 타임라인이 찍는 것 */
const PIN2 = { x: 0.47, y: 0.32 };
const TYPED = "볼 그림자 조금 밝게";
const REFINED = "왼쪽 볼의 그림자를 자연스럽게 밝혀 주세요.";
const TYPE_MS = 55;

type Refine = "none" | "loading" | "suggested" | "applied";

export function RetouchShot({ crop, tour, replay, camera }: { crop?: ShotCrop; tour?: number; replay?: number; camera?: ShotCamera }) {
  const [pinned, setPinned] = useState(false);
  const [typed, setTyped] = useState("");
  const [refine, setRefine] = useState<Refine>("none");
  const [cursor, setCursor] = useState({ x: 300, y: 430, visible: false, click: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const refineRef = useRef<HTMLSpanElement>(null);
  const applyRef = useRef<HTMLSpanElement>(null);
  const { run, stop } = useShotTimeline();

  // 핀 2의 카드가 길어질 때마다 패널을 끝까지 내린다 — "적용"이 보이게(실제 패널도 스크롤)
  useEffect(() => {
    const el = panelRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pinned, refine]);

  /** 요소의 가운데(또는 사진 안 비율 좌표)를 1000×560 좌표로 */
  const place = (el: HTMLElement | null, rel?: { x: number; y: number }) => {
    const root = rootRef.current;
    if (!el || !root) return null;
    const r = root.getBoundingClientRect();
    const zoom = r.width / SHOT_W || 1;
    const b = el.getBoundingClientRect();
    const px = rel ? b.left + b.width * rel.x : b.left + b.width / 2;
    const py = rel ? b.top + b.height * rel.y : b.top + b.height / 2;
    return { x: (px - r.left) / zoom, y: (py - r.top) / zoom };
  };
  const moveTo = (el: HTMLElement | null, rel?: { x: number; y: number }) => {
    const p = place(el, rel);
    if (p) setCursor((c) => ({ ...c, x: p.x, y: p.y, visible: true }));
  };
  const click = () => setCursor((c) => ({ ...c, click: c.click + 1 }));

  // 확대 투어 — 단계가 상태를 정한다. 타이머 안에서만 상태를 바꾼다
  useEffect(() => {
    if (tour === undefined) return;
    const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const hide = () => setCursor((c) => ({ ...c, visible: false }));
    if (tour === 0) {
      at(0, () => {
        setPinned(false);
        setTyped("");
        setRefine("none");
        hide();
      });
    } else if (tour === 1) {
      if (still) {
        at(0, () => {
          setPinned(true);
          setTyped(TYPED);
          setRefine("none");
          hide();
        });
      } else {
        at(0, () => {
          setPinned(false);
          setTyped("");
          setRefine("none");
        });
        at(250, () => setCursor((c) => ({ ...c, visible: true })));
        at(400, () => moveTo(photoRef.current, PIN2));
        at(1200, () => {
          click();
          setPinned(true);
        });
        for (let i = 1; i <= TYPED.length; i++) at(1500 + i * TYPE_MS, () => setTyped(TYPED.slice(0, i)));
      }
    } else if (still) {
      at(0, () => {
        setPinned(true);
        setTyped(TYPED);
        setRefine("applied");
        hide();
      });
    } else {
      at(0, () => {
        setPinned(true);
        setTyped(TYPED);
        setRefine("none");
      });
      at(300, () => moveTo(refineRef.current));
      at(1000, () => {
        click();
        setRefine("loading");
      });
      at(2200, () => setRefine("suggested"));
      at(2700, () => moveTo(applyRef.current));
      at(3300, () => {
        click();
        setRefine("applied");
      });
      at(3900, hide);
    }
    return () => timers.forEach(clearTimeout);
    // moveTo · click은 매번 새로 만들어지지만 ref만 읽는다 — 단계가 바뀌거나 다시 들어올 때(replay)만 다시 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, replay]);

  const start = () => {
    const steps: [number, () => void][] = [
      [600, () => setCursor((c) => ({ ...c, visible: true }))],
      [800, () => moveTo(photoRef.current, PIN2)],
      [1500, () => { click(); setPinned(true); }],
    ];
    for (let i = 1; i <= TYPED.length; i++) steps.push([1900 + i * TYPE_MS, () => setTyped(TYPED.slice(0, i))]);
    steps.push(
      [3000, () => moveTo(refineRef.current)],
      [3600, () => { click(); setRefine("loading"); }],
      [4800, () => setRefine("suggested")],
      [5300, () => moveTo(applyRef.current)],
      [5900, () => { click(); setRefine("applied"); }],
      [6500, () => setCursor((c) => ({ ...c, visible: false }))],
    );
    run(steps, () => { setPinned(true); setTyped(TYPED); setRefine("applied"); });
  };
  /** 화면에서 빠지면 핀 1만 있는 처음으로 되감는다 — 다시 들어오면 처음부터 */
  const rewind = () => {
    stop();
    setPinned(false);
    setTyped("");
    setRefine("none");
    setCursor((c) => ({ ...c, visible: false }));
  };

  const points = [
    { id: "p1", x: PIN1.x, y: PIN1.y, text: PIN1.text, refinedText: null, useRefinedText: false },
    ...(pinned ? [{ id: "p2", x: PIN2.x, y: PIN2.y, text: typed, refinedText: refine === "none" || refine === "loading" ? null : REFINED, useRefinedText: refine === "applied" }] : []),
  ];

  const pinHead = (n: number) => (
    <div className="flex items-center gap-2 type-label-semibold-s text-contents-light-bgd-default">
      <span className="grid size-4.5 place-items-center rounded-full bg-brand-secondary-default type-label-semibold-xs text-contents-dark-bgd-default">{n}</span>
      핀 {n}
      <span className="ml-auto grid size-6.5 place-items-center rounded-(--radius-4) text-contents-light-bgd-weakness">
        <TrashIcon size={16} />
      </span>
    </div>
  );
  // "AI 내용 다듬기" 줄 — 핀 2의 것만 ref가 있어 JSX를 따로 둔다(함수에 ref를 넘기면 react-hooks/refs에 걸린다)
  const REFINE_BTN = "inline-flex h-7 items-center gap-1 rounded-(--radius-4) bg-surface-default-medium px-2.5 type-label-medium-xs text-contents-light-bgd-default";
  const textareaClass = "w-full resize-none bg-transparent type-content-s text-contents-light-bgd-default placeholder:text-contents-light-bgd-weakness focus:outline-none";

  const panel = (
    <>
      <section className="flex flex-col gap-1.5">
        <h4 className="type-label-semibold-xs text-contents-light-bgd-weakness">사진 전체 보정 작성</h4>
        <textarea
          readOnly
          value=""
          placeholder="예) 전체적으로 밝고 따뜻하게"
          rows={2}
          className="w-full resize-none rounded-(--radius-8) border border-border-default bg-transparent px-2.5 py-2 type-content-s text-contents-light-bgd-default placeholder:text-contents-light-bgd-weakness"
        />
      </section>
      <ol className="flex flex-col gap-4">
        {/* 핀 1 — 사용자가 적은 그대로, AI 안 거침 */}
        <li className="flex flex-col gap-1.5">
          {pinHead(1)}
          <div className="flex flex-col gap-2 rounded-(--radius-8) border border-border-default p-2.5">
            <textarea readOnly value={PIN1.text} rows={2} className={textareaClass} />
            <div className="flex items-center justify-between gap-2">
              <span className="type-content-xs" />
              <span className={REFINE_BTN}>
                <span className="text-brand-accent-default">
                  <SparkleIcon size={14} />
                </span>
                AI 내용 다듬기
              </span>
            </div>
          </div>
        </li>
        {pinned && (
          <li className="flex flex-col gap-1.5">
            {pinHead(2)}
            <div className="flex flex-col gap-2 rounded-(--radius-8) border border-border-default p-2.5">
              {refine === "applied" ? (
                <>
                  <p className="type-content-s leading-relaxed text-contents-light-bgd-default">{REFINED}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-content-xs text-contents-light-bgd-weakness underline underline-offset-2">원래 문장으로</span>
                    <span className="inline-flex items-center gap-1 type-content-xs text-brand-accent-text">
                      <CheckCircleIcon size={14} />
                      AI가 다듬은 문장
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <textarea readOnly value={typed} placeholder="예) 볼 라인 정리" rows={2} className={textareaClass} />
                  {refine === "loading" ? (
                    <div className="h-12 animate-pulse rounded-(--radius-8) bg-brand-chip-background" aria-label="AI가 문장을 다듬는 중" />
                  ) : refine === "suggested" ? (
                    <div className="flex flex-col gap-1.5 rounded-(--radius-8) bg-brand-chip-background px-2.5 py-2">
                      <span className="inline-flex w-fit items-center gap-1 rounded-(--radius-4) bg-background-default-main px-1.5 py-0.5 type-label-semibold-xs text-brand-accent-text">
                        <SparkleIcon size={12} />
                        AI 제안
                      </span>
                      <p className="type-content-s leading-relaxed text-contents-light-bgd-default">{REFINED}</p>
                      <span ref={applyRef} className="inline-flex h-6.5 items-center gap-1 self-end rounded-(--pill) bg-brand-secondary-default px-2.5 type-label-semibold-xs text-contents-dark-bgd-default">
                        적용
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="type-content-xs" />
                      <span ref={refineRef} className={REFINE_BTN}>
                        <span className="text-brand-accent-default">
                          <SparkleIcon size={14} />
                        </span>
                        AI 내용 다듬기
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </li>
        )}
      </ol>
    </>
  );

  return (
    <ShotFrame
      label="보정 작성 화면 — 크게 보기에서 사진 위에 점을 찍고 한 줄 적으면 AI가 문장을 다듬어 준다"
      onVisible={tour === undefined ? start : undefined}
      onHidden={tour === undefined ? rewind : undefined}
      crop={crop}
      camera={camera}
    >
      <ShotTopbar stageIndex={2} />
      <div className="flex min-h-0 flex-1 bg-background-default-sub" />
      <ShotLightbox
        photoId={PHOTO_ID}
        index={3}
        total={5}
        caption="선택한 사진 · 화이트 스튜디오 › 클로즈업"
        middle={<ShotSelectionControls score={5} picked />}
        tab="memo"
        panel={panel}
        overlay={<RetouchPins points={points} />}
        rootRef={rootRef}
        photoBoxRef={photoRef}
        panelRef={panelRef}
      />
      <ShotCursor x={cursor.x} y={cursor.y} visible={cursor.visible} click={cursor.click} />
    </ShotFrame>
  );
}
