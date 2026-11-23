"use client";

/**
 * 랜딩 — 사용 흐름 4단계(이슈 144 → 이슈 182 시안 D 4)
 * 위치: src/app/_components/FlowSection.tsx
 *
 * 단계마다 한 구역 — 글(단계 표시 · 제목 · 설명)과 화면을 좌우로 번갈아 둔다(같은 모양 반복을 줄임). 바탕은 흰 → 연보라 →
 * 어두운(셀렉 = 크게 보기 화면의 결) → 흰. 머리는 제품 상단의 단계 표시(StageSteps), 제목은 강조 단어만 보라.
 * 화면은 지금의 움직이는 화면 4장(shots/)을 부분 확대(crop)로 크게 보이고, 움직임이 끝날 즈음 초점 프레임(로고의 뷰파인더)이
 * 그 단계의 핵심 자리를 잡는다. 프레임 좌표는 부분 확대한 상자 기준 %(화면마다 끝 상태에서 잼), 시각은 타임라인이 끝나는 때 +
 * 여유(Reveal seq — ShotFrame과 같은 35% 보일 때부터 센다). 셀렉 화면은 끝 상태가 그리드라 프레임이 별점 묶음 · 선택 수를 잡는다.
 */

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Band } from "./Band";
import { Reveal } from "./Reveal";
import { StageSteps } from "./StageSteps";
import { FocusFrame } from "./Viewfinder";
import { FoldersShot } from "./shots/FoldersShot";
import { RetouchShot } from "./shots/RetouchShot";
import { SelectShot } from "./shots/SelectShot";
import type { ShotCrop } from "./shots/ShotFrame";
import { UploadShot } from "./shots/UploadShot";

type Step = {
  /** 단계 표시 자리(SHOT_STAGES) — 셀렉과 보정 작성은 같은 단계 */
  stage: number;
  tone: "white" | "tint" | "dark";
  title: ReactNode;
  desc: string;
  Shot: ComponentType<{ crop?: ShotCrop }>;
  crop: ShotCrop;
  frames: ComponentProps<typeof FocusFrame>[];
};

/** 제목의 강조 단어 — 브랜드 보라(어두운 띠에서는 연보라). 모서리 강조는 히어로 · 문제 제기 · 마무리만 */
function Kw({ children }: { children: ReactNode }) {
  return <span className="text-brand-accent-default in-data-[tone=dark]:text-brand-secondary-lightness">{children}</span>;
}

// 문구는 시안 D(2026-11-23 수민 OK)
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
    desc: "전신 · 상반신 · 클로즈업 · 풍경처럼 컨셉별 폴더가 생깁니다. 폴더는 끌어서 옮기거나 합칠 수 있습니다.",
    Shot: FoldersShot,
    crop: { x: 0, y: 0.08, w: 0.42, h: 0.6 },
    frames: [
      { rect: { x: 2, y: 35, w: 52, h: 35 }, label: "세부 폴더까지 자동으로", labelAt: "end", mobileLabel: false, seq: 5200 },
      { rect: { x: 59, y: 57, w: 22, h: 41 }, label: "끌어서 다른 폴더로", labelAt: "end", mobileLabel: false, seq: 5500 },
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
    desc: "크게 보면서 별점을 매기고, 마음에 드는 사진을 선택합니다. 별점 순으로 모아 보면 후보가 금방 추려집니다.",
    Shot: SelectShot,
    crop: { x: 0, y: 0, w: 0.66, h: 1 },
    frames: [
      { rect: { x: 2, y: 19, w: 74.5, h: 30.5 }, label: "별점별로 모아 고르기", align: "end", seq: 8800 },
      { rect: { x: 70, y: 90, w: 29.5, h: 9 }, label: "선택한 장수 · 상한", align: "end", seq: 9100 },
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
    desc: "사진 위를 누르고 한 줄 적으면 보정 요청서로 정리됩니다. 적은 문장은 AI가 작가에게 전하기 좋게 다듬어 줍니다.",
    Shot: RetouchShot,
    crop: { x: 0.24, y: 0.04, w: 0.74, h: 0.74 },
    frames: [
      { rect: { x: 6, y: 14, w: 14, h: 35 }, label: "점 하나에 요청 하나", labelAt: "bottom", seq: 6800 },
      { rect: { x: 55, y: 78, w: 43, h: 20.5 }, label: "AI가 문장 다듬기", labelAt: "bottom", align: "end", seq: 7100 },
    ],
  },
];

export function FlowSection() {
  return (
    <div id="flow" role="region" aria-label="사용 흐름">
      {STEPS.map((step, i) => {
        const dark = step.tone === "dark";
        // 홀수 단계는 화면이 왼쪽 — 좁은 화면에서는 늘 글 먼저
        const flip = i % 2 === 1;
        return (
          <Band
            key={step.desc}
            tone={step.tone}
            className={`grid items-center gap-18 py-28 max-[900px]:grid-cols-1 max-[900px]:gap-4 max-[640px]:py-18 ${flip ? "grid-cols-[6.4fr_5fr]" : "grid-cols-[5fr_6.4fr]"}`}
          >
            <div className={`flex flex-col items-start gap-5 ${flip ? "order-2 max-[900px]:order-none" : ""}`}>
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
              <Reveal
                as="p"
                variant="blur"
                delay={2}
                className={`type-content-xl max-[640px]:text-base! ${dark ? "text-contents-dark-bgd-sub" : "text-contents-light-bgd-sub"}`}
              >
                {step.desc}
              </Reveal>
            </div>
            <Reveal variant="rise" seq threshold={0.35} className={`py-9 max-[900px]:py-8 ${flip ? "order-1 max-[900px]:order-none" : ""}`}>
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
