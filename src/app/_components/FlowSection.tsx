"use client";

/**
 * 랜딩 — 사용 흐름 4단계(이슈 144 → 이슈 182 시안 D 4 · 4-5)
 * 위치: src/app/_components/FlowSection.tsx
 *
 * 단계마다 한 구역 — 글과 화면을 좌우로 번갈아 둔다(같은 모양 반복을 줄임). 바탕은 흰 → 연보라 → 어두운(셀렉 = 크게 보기 화면의
 * 결) → 흰. 머리는 제품 상단의 단계 표시(StageSteps — 랜딩은 셀렉 & 보정 작성까지 세 단계), 제목은 강조 단어만 보라.
 * 01 업로드: 움직이는 화면을 부분 확대(crop)로 크게 보이고, 움직임이 끝날 즈음 초점 프레임(로고의 뷰파인더)이 핵심 자리를 잡는다.
 *   프레임 좌표는 부분 확대한 상자 기준 %, 시각은 타임라인이 끝나는 때 + 여유(Reveal seq — ShotFrame과 같은 35% 보일 때부터).
 * 02 ~ 04: 확대 투어(시안 4-5, 2026-11-23 수민) — 발표 덱 제품 소개처럼 화면 전체로 시작해 글머리표 차례로 그 자리로 확대 · 이동하고
 *   뷰파인더가 잡는다. 이슈 184에서 화면 고정(스크롤로 단계 넘기기)을 뺐다 — 붙은 뒤 첫 구간이 멈춘 것처럼 보여 끝으로 읽혔다.
 *   지금은 다른 구역처럼 그냥 스크롤되고, 화면이 35% 보이면 화면 전체로 잠깐 있다가 단계가 저절로 넘어간다(마지막 단계에서 멈춤).
 *   글머리표를 누르면 그 단계부터 다시, 막대는 그 단계에 머무는 시간만큼 찬다. 움직임 줄이기면 저절로 넘기지 않는다(첫 단계 + 글머리표).
 *   화면 상태(폴더가 생김 · 별점 · AI 다듬기)는 단계가 정한다.
 *   카메라 셈은 덱과 같다: 보일 곳이 창의 약 70%가 되게 1.6~2.6배(k로 정할 수 있음), 그림이 창을 늘 덮게 이동을 묶는다.
 *   보일 곳(view) · 뷰파인더 자리(ring)는 화면 1000×560 기준 비율 [x, y, w, h] — 그려진 화면 요소의 자리를 재서 정했다.
 *   뷰파인더는 카메라가 도착한 뒤(ringAt, 화면 안 움직임이 있으면 그 뒤) 나온다. 설명 문단 대신 글머리표가 그 단계를 말한다.
 * 다시 보기(2026-11-23 수민): 화면 움직임은 그 자리로 다시 스크롤되면 다시 움직인다 — 01은 화면이 빠지면 되감았다가 다시 들어오면
 *   처음부터(초점 프레임도 Reveal replay로 함께), 투어도 화면이 완전히 빠지면 되감았다가 다시 보이면 처음부터 다시 돈다.
 */

import { useEffect, useRef, useState, type ComponentProps, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { Band } from "./Band";
import { Reveal } from "./Reveal";
import { StageSteps } from "./StageSteps";
import { FocusFrame, type FrameRect } from "./Viewfinder";
import { FoldersShot } from "./shots/FoldersShot";
import { RetouchShot } from "./shots/RetouchShot";
import { SelectShot } from "./shots/SelectShot";
import type { ShotCamera, ShotCrop } from "./shots/ShotFrame";
import { UploadShot } from "./shots/UploadShot";

type Rect4 = [number, number, number, number];
/** 투어의 한 멈춤 — 글머리표 글, 확대해 보일 곳, 뷰파인더 자리, 배율(없으면 셈), 뷰파인더가 나오는 때(ms, 기본 850) */
type Stop = { text: string; view: Rect4; ring: Rect4; k?: number; ringAt?: number };

type Step = {
  /** 단계 표시 자리(SHOT_STAGES) — 셀렉과 보정 작성은 같은 단계 */
  stage: number;
  tone: "white" | "tint" | "dark";
  title: ReactNode;
  Shot: ComponentType<{ crop?: ShotCrop; tour?: number; replay?: number; camera?: ShotCamera }>;
} & (
  | { desc: string; crop: ShotCrop; frames: ComponentProps<typeof FocusFrame>[]; tour?: undefined }
  | { tour: Stop[]; desc?: undefined; crop?: undefined; frames?: undefined }
);

/** 제목의 강조 단어 — 브랜드 보라(어두운 띠에서는 연보라). 모서리 강조는 히어로 · 문제 제기 · 마무리만 */
function Kw({ children }: { children: ReactNode }) {
  return <span className="text-brand-accent-default in-data-[tone=dark]:text-brand-secondary-lightness">{children}</span>;
}

// 문구는 시안 D(2026-11-23 수민 OK), 글머리표는 시안 4-5
const STEPS: Step[] = [
  {
    stage: 0,
    tone: "white",
    title: (
      <>
        원본은 <Kw>그대로</Kw>
        <br />
        올리세요
      </>
    ),
    desc: "여러 장을 한 번에 끌어다 놓으면 됩니다. 올라가는 동안 AI가 비슷한 컨셉끼리 나누기 시작합니다.",
    Shot: UploadShot,
    crop: { x: 0.25, y: 0.04, w: 0.5, h: 0.92 },
    frames: [
      { rect: { x: 12, y: 26, w: 76, h: 42 }, label: "500장도 한 번에", labelAt: "start", mobileLabel: false, seq: 7600 },
      { rect: { x: 49, y: 79.5, w: 39, h: 13 }, label: "올린 장수 한눈에", labelAt: "bottom", align: "end", seq: 7900 },
    ],
  },
  {
    stage: 1,
    tone: "tint",
    title: (
      <>
        비슷한 사진은
        <br />
        <Kw>폴더</Kw>로 묶어 둡니다
      </>
    ),
    Shot: FoldersShot,
    tour: [
      { text: "AI가 비슷한 컨셉끼리 나눕니다", view: [0, 0.08, 0.47, 0.2], ring: [0.008, 0.115, 0.222, 0.135] },
      { text: "세부 폴더까지 자동으로", view: [0, 0.2, 0.3, 0.32], ring: [0.008, 0.245, 0.214, 0.252], ringAt: 1300 },
      { text: "폴더를 열면 그 사진만", view: [0.24, 0.09, 0.42, 0.38], ring: [0.245, 0.105, 0.365, 0.32] },
    ],
  },
  {
    stage: 2,
    tone: "dark",
    title: (
      <>
        번호 대신
        <br />
        <Kw>별점</Kw>으로 고릅니다
      </>
    ),
    Shot: SelectShot,
    tour: [
      { text: "크게 보며 별점을 매깁니다", view: [0.27, 0.7, 0.3, 0.16], ring: [0.283, 0.849, 0.265, 0.064], ringAt: 1450 },
      { text: "누가 몇 점을 줬는지 기록이 남습니다", view: [0.64, 0.16, 0.34, 0.38], ring: [0.65, 0.232, 0.314, 0.245], k: 2 },
      { text: "조건을 겹쳐 걸러 봅니다", view: [0, 0.08, 0.5, 0.3], ring: [0.012, 0.185, 0.258, 0.066], k: 2 },
    ],
  },
  {
    stage: 2,
    tone: "white",
    title: (
      <>
        고칠 곳에
        <br />
        <Kw>점</Kw>을 찍어 요청합니다
      </>
    ),
    Shot: RetouchShot,
    tour: [
      { text: "고칠 곳에 점을 찍고 한 줄 적습니다", view: [0.29, 0.14, 0.1, 0.27], ring: [0.292, 0.148, 0.085, 0.245], ringAt: 1400 },
      { text: "AI가 작가에게 전할 문장으로 다듬습니다", view: [0.64, 0.55, 0.34, 0.29], ring: [0.65, 0.572, 0.313, 0.19], k: 2, ringAt: 3400 },
    ],
  },
];

/** 덱과 같은 카메라 — 보일 곳이 창의 약 70%가 되게(1.6~2.6배), 그림이 창을 늘 덮게 이동을 묶는다. 멈춤이 없으면 전체 */
function cameraOf(stop: Stop | null): ShotCamera {
  if (!stop) return { k: 1, tx: 0, ty: 0 };
  const [x, y, w, h] = stop.view;
  const k = stop.k ?? Math.min(2.6, Math.max(1.6, 0.7 / Math.max(w, h)));
  const fit = (v: number) => Math.min(0, Math.max(1 - k, v));
  return { k, tx: fit(0.5 - (x + w / 2) * k), ty: fit(0.5 - (y + h / 2) * k) };
}

/** 뷰파인더 자리 — 화면 비율을 카메라로 옮긴 창 기준 %(창 가장자리에 붙지 않게 조금 안쪽으로) */
function ringOf(stop: Stop, c: ShotCamera): FrameRect {
  const [x, y, w, h] = stop.ring;
  const l = Math.max(0.012, x * c.k + c.tx);
  const t = Math.max(0.02, y * c.k + c.ty);
  const r = Math.min(0.988, (x + w) * c.k + c.tx);
  const b = Math.min(0.98, (y + h) * c.k + c.ty);
  return { x: l * 100, y: t * 100, w: (r - l) * 100, h: (b - t) * 100 };
}

function StepText({ step, dark, children }: { step: Step; dark: boolean; children: ReactNode }) {
  return (
    <>
      <Reveal variant="blur">
        <StageSteps index={step.stage} tone={dark ? "dark" : "light"} />
      </Reveal>
      <Reveal
        as="h2"
        variant="blur"
        delay={1}
        className={`type-maintext-l max-[640px]:text-[28px]! max-[640px]:leading-[1.3]! ${dark ? "text-contents-dark-bgd-default" : "text-contents-light-bgd-default"}`}
      >
        {step.title}
      </Reveal>
      {children}
    </>
  );
}

/** 한 단계에 머무는 시간(ms) — 카메라 0.8초 + 뷰파인더가 나온 뒤(ringAt) 1.6초는 보이게, 최소 2.6초 */
const stepMs = (s: Stop) => Math.max(2600, (s.ringAt ?? 850) + 1600);
/** 화면이 보인 뒤 화면 전체로 머무는 시간 — 떠오르는 움직임(Reveal rise)이 끝난 뒤 첫 확대 */
const INTRO_MS = 1200;

/** 확대 투어 구역 — 화면이 보이면 단계가 저절로 넘어간다(0 = 화면 전체, n에서 멈춤) */
function TourBand({ step, stops, flip }: { step: Step; stops: Stop[]; flip: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  /** 단계에 들어갈 때마다 올린다 — 같은 단계를 다시 눌러도 화면 움직임 · 막대가 다시 돈다 */
  const [replay, setReplay] = useState(0);
  const [ringOn, setRingOn] = useState(false);
  /** 글머리표 → 그 단계부터(효과 안의 go를 부른다) */
  const goRef = useRef<(j: number) => void>(() => {});
  const n = stops.length;
  const dark = step.tone === "dark";

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers = new Set<number>();
    const clear = () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
    const at = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    /** j 단계로 — 뷰파인더는 카메라가 도착한 뒤, 머문 뒤 다음 단계로(움직임 줄이기면 저절로 넘기지 않음) */
    const go = (j: number) => {
      clear();
      setCur(j);
      setReplay((v) => v + 1);
      setRingOn(false);
      if (j === 0) return;
      at(reduce ? 0 : (stops[j - 1].ringAt ?? 850), () => setRingOn(true));
      if (!reduce && j < n) at(stepMs(stops[j - 1]), () => go(j + 1));
    };
    goRef.current = go;
    let shown = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!shown && e.intersectionRatio >= 0.35) {
          shown = true;
          if (reduce) go(1);
          else {
            clear();
            at(INTRO_MS, () => go(1));
          }
        } else if (shown && !e.isIntersecting) {
          // 완전히 빠지면 되감기 — 다시 보이면 화면 전체부터 다시
          shown = false;
          clear();
          setCur(0);
          setRingOn(false);
        }
      },
      { threshold: [0, 0.35] },
    );
    io.observe(box);
    return () => {
      io.disconnect();
      clear();
    };
  }, [n, stops]);

  const stop = cur ? stops[cur - 1] : null;
  const camera = cameraOf(stop);

  return (
    <Band
      tone={step.tone}
      className={`grid items-center gap-18 py-28 max-[900px]:grid-cols-1 max-[900px]:gap-5 max-[640px]:py-18 ${flip ? "grid-cols-[6.4fr_5fr]" : "grid-cols-[5fr_6.4fr]"}`}
    >
      <div className={`flex flex-col items-start gap-5 max-[640px]:gap-3.5 ${flip ? "order-2 max-[900px]:order-none" : ""}`}>
        <StepText step={step} dark={dark}>
          <Reveal variant="blur" delay={2} className="w-full">
            <ol className="flex w-full flex-col">
              {stops.map((s, j) => {
                const on = cur === j + 1;
                return (
                  <li key={s.text}>
                    <button
                      type="button"
                      onClick={() => goRef.current(j + 1)}
                      aria-current={on ? "step" : undefined}
                      className={`relative flex w-full cursor-pointer py-2.75 pl-5 text-left type-label-semibold-xl motion-safe:transition-colors motion-safe:duration-300 max-[640px]:py-2 max-[640px]:pl-4 max-[640px]:text-base! ${
                        dark
                          ? on
                            ? "text-contents-dark-bgd-default"
                            : "text-contents-dark-bgd-weakness hover:text-contents-dark-bgd-sub"
                          : on
                            ? "text-contents-light-bgd-default"
                            : "text-contents-light-bgd-weakness hover:text-contents-light-bgd-sub"
                      }`}
                    >
                      <span aria-hidden className={`absolute top-2.25 bottom-2.25 left-0 w-0.75 overflow-hidden rounded-(--pill) ${dark ? "bg-surface-inverse-light" : "bg-border-default"}`}>
                        {/* 지난 단계는 꽉, 지금 단계는 머무는 시간만큼 차오름(마지막은 차고 멈춤 · 움직임 줄이기면 꽉), 다음은 빈 */}
                        <i
                          key={on ? replay : "idle"}
                          className={`block w-full rounded-(--pill) ${dark ? "bg-brand-secondary-lightness" : "bg-brand-accent-default"} ${on ? "tour-fill" : cur > j + 1 ? "h-full" : "h-0"}`}
                          style={on ? ({ "--step": `${stepMs(s)}ms` } as CSSProperties) : undefined}
                        />
                      </span>
                      {s.text}
                    </button>
                  </li>
                );
              })}
            </ol>
          </Reveal>
        </StepText>
      </div>
      <Reveal variant="rise" className={`py-9 max-[900px]:py-1 ${flip ? "order-1 max-[900px]:order-none" : ""}`}>
        <div ref={boxRef} className="relative">
          <step.Shot tour={cur} replay={replay} camera={camera} />
          {stop && <FocusFrame rect={ringOf(stop, camera)} on={ringOn} />}
        </div>
      </Reveal>
    </Band>
  );
}

export function FlowSection() {
  return (
    <div id="flow" role="region" aria-label="사용 흐름">
      {STEPS.map((step, i) => {
        const dark = step.tone === "dark";
        // 홀수 단계는 화면이 왼쪽 — 좁은 화면에서는 늘 글 먼저
        const flip = i % 2 === 1;
        if (step.tour) return <TourBand key={step.stage + "-" + i} step={step} stops={step.tour} flip={flip} />;
        return (
          <Band
            key={step.stage + "-" + i}
            tone={step.tone}
            className={`grid items-center gap-18 py-28 max-[900px]:grid-cols-1 max-[900px]:gap-4 max-[640px]:py-18 ${flip ? "grid-cols-[6.4fr_5fr]" : "grid-cols-[5fr_6.4fr]"}`}
          >
            <div className={`flex flex-col items-start gap-5 ${flip ? "order-2 max-[900px]:order-none" : ""}`}>
              <StepText step={step} dark={dark}>
                <Reveal
                  as="p"
                  variant="blur"
                  delay={2}
                  className={`type-content-xl max-[640px]:text-base! ${dark ? "text-contents-dark-bgd-sub" : "text-contents-light-bgd-sub"}`}
                >
                  {step.desc}
                </Reveal>
              </StepText>
            </div>
            <Reveal variant="rise" seq replay threshold={0.35} className={`py-9 max-[900px]:py-8 ${flip ? "order-1 max-[900px]:order-none" : ""}`}>
              <div className="relative">
                <step.Shot crop={step.crop} />
                {step.frames.map((f) => (
                  <FocusFrame key={f.label} {...f} />
                ))}
              </div>
            </Reveal>
          </Band>
        );
      })}
    </div>
  );
}
