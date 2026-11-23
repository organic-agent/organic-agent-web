"use client";

/**
 * 랜딩 문제 제기 — 단톡방 한 창 → 사진 한 장, 짝마다 선으로 잇는다(이슈 182, 시안 D 3-6)
 * 위치: src/app/_components/PainSection.tsx
 *
 * 왼쪽 "지금까지"는 단톡방(파일 번호로 묻고, 의견이 흩어지고, 보정할 곳을 글로 설명 — 회색), 오른쪽 "이지셀렉에서는"은 같은 일을
 * 사진 한 장 위에서 — 체크 · 별점, 가족 댓글 · 좋아요, 핀 · 보정 요청. 랜딩 전체 개념 "모든 셀렉은 사진 위에서"를 여기서 말한다.
 * 짝 셋(번호 → 별점, 단톡방 → 댓글, 설명 → 점)을 차례로: 그 말풍선이 보라로 칠해지고 → 선이 그어져 끝에 화살촉 → 사진 쪽 표시를
 * 뷰파인더가 잡고 범례 글을 단다. 나머지는 흐리게. 가운데 화살표 · 아래 범례 목록은 선과 뷰파인더 글이 맡아 없다(2026-11-23 수민).
 * 선 · 프레임 자리는 그려진 요소를 재서 잡는다(크기가 바뀌면 다시). 좁은 화면(820 미만)은 위아래로 쌓이고, 선은 말풍선 바로 아래
 * 카드 가장자리에서 내려간다 — 다른 말풍선을 가로지르지 않게. 표시 위치는 사진 187 · 4:3 · 위 20% 맞춤 기준.
 * 그림은 aria-hidden — 짝의 뜻은 화면 낭독기용 목록(sr-only)이 말한다. 움직임 줄이기면 첫 짝을 멈춘 채로 둔다.
 */

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { BrushIcon, CommentIcon, HeartFillIcon, StarFillIcon } from "@/components/icons";
import { Band } from "./Band";
import { CommentChip, LikeChip, PinMark, RatingBar, RequestChip, TileCheck } from "./PhotoMarks";
import { Reveal } from "./Reveal";
import { FocusFrame, ViewfinderText, type FrameRect } from "./Viewfinder";
import { samplePhotoUrl } from "./shots/samplePhotos";

type Pair = 1 | 2 | 3;

/** 단톡방 — who가 없으면 내가 보낸 말(오른쪽). pair는 사진 쪽 짝 */
const MESSAGES: { who: string; text: string; pair?: Pair }[] = [
  { who: "준호", text: "그래서 몇 번이 제일 좋았어?" },
  { who: "", text: "IMG_0342? 아니 0343이었나", pair: 1 },
  { who: "엄마", text: "엄마는 세 번째 사진이 제일 예쁘더라", pair: 2 },
  { who: "", text: "보정할 곳은 글로 길게 써서 보낼게", pair: 3 },
];

/** 짝 — 말풍선 아이콘 · 뷰파인더 글 · 글 자리(별점 줄은 위, 왼쪽 댓글은 오른쪽, 핀 묶음은 아래) */
const PAIRS: Record<Pair, { icon: ReactNode; label: string; labelAt: "top" | "end" | "bottom" }> = {
  1: { icon: <StarFillIcon size={13} />, label: "번호 대신 별점과 체크", labelAt: "top" },
  2: { icon: <HeartFillIcon size={13} />, label: "단톡방 대신 사진에 댓글", labelAt: "end" },
  3: { icon: <BrushIcon size={13} />, label: "설명 대신 점 하나", labelAt: "bottom" },
};

/** 한 짝에 머무는 시간 · 선 긋는 시간 · 뷰파인더가 표시를 감싸는 여백(px) */
const PAIR_MS = 2800;
const DRAW_MS = 560;
const PAD = 9;

type Pt = [number, number];
type Line = { k: Pair; d: string; head: string; start: Pt; len: number };

/** 3차 베지어 길이 — 24토막 근사(선 긋는 움직임의 dash 길이) */
function bezierLength(p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
  const at = (t: number): Pt => {
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]) as Pt;
  };
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 24; i++) {
    const p = at(i / 24);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
}

export function PainSection() {
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  /** 지금 짝(0 = 아직 안 돎) · 선 · 선을 다 그었나 · 뷰파인더(자리 · 켜짐) */
  const [active, setActive] = useState<Pair | 0>(0);
  const [line, setLine] = useState<Line | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [frame, setFrame] = useState<{ k: Pair; rect: FrameRect } | null>(null);
  const [frameOn, setFrameOn] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const card = cardRef.current;
    const photo = photoRef.current;
    if (!box || !card || !photo) return;
    const timers = new Set<number>();
    const at = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    let cur: Pair = 1;
    let started = false;

    /** 짝 k의 선(말풍선 → 표시)과 뷰파인더 자리를 잰다 — 상자 기준 px, 프레임은 사진 기준 % */
    const measure = (k: Pair) => {
      const B = box.getBoundingClientRect();
      const P = photo.getBoundingClientRect();
      const C = card.getBoundingClientRect();
      const a = box.querySelector(`[data-bubble="${k}"]`)?.getBoundingClientRect();
      const marks = [...photo.querySelectorAll(`[data-frame="${k}"]`)].map((e) => e.getBoundingClientRect());
      if (!a || marks.length === 0) return null;
      const T = {
        l: Math.min(...marks.map((m) => m.left)),
        t: Math.min(...marks.map((m) => m.top)),
        r: Math.max(...marks.map((m) => m.right)),
        b: Math.max(...marks.map((m) => m.bottom)),
      };
      const stacked = P.top > a.bottom;
      let p0: Pt, p1: Pt, p2: Pt, p3: Pt;
      if (stacked) {
        p0 = [a.left + a.width / 2 - B.left, C.bottom - B.top + 6];
        p3 = [(T.l + T.r) / 2 - B.left, T.t - B.top - PAD - 5];
        const dy = Math.max(30, (p3[1] - p0[1]) * 0.5);
        p1 = [p0[0], p0[1] + dy];
        p2 = [p3[0], p3[1] - dy];
      } else {
        p0 = [a.right - B.left + 8, a.top + a.height / 2 - B.top];
        p3 = [T.l - B.left - PAD - 6, (T.t + T.b) / 2 - B.top];
        const dx = Math.max(40, (p3[0] - p0[0]) * 0.5);
        p1 = [p0[0] + dx, p0[1]];
        p2 = [p3[0] - dx, p3[1]];
      }
      // 화살촉 — 끝 방향(p2 → p3)으로 세운 삼각형
      const n = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]) || 1;
      const ux = (p3[0] - p2[0]) / n;
      const uy = (p3[1] - p2[1]) / n;
      const A = 11;
      const W = 6.5;
      const head = [
        [p3[0] + ux * 3, p3[1] + uy * 3],
        [p3[0] - ux * A - uy * W, p3[1] - uy * A + ux * W],
        [p3[0] - ux * A + uy * W, p3[1] - uy * A - ux * W],
      ]
        .map((p) => p.join(","))
        .join(" ");
      return {
        line: { k, d: `M${p0} C${p1} ${p2} ${p3}`, head, start: p0, len: bezierLength(p0, p1, p2, p3) } satisfies Line,
        rect: {
          x: ((T.l - P.left - PAD) / P.width) * 100,
          y: ((T.t - P.top - PAD) / P.height) * 100,
          w: ((T.r - T.l + PAD * 2) / P.width) * 100,
          h: ((T.b - T.t + PAD * 2) / P.height) * 100,
        },
      };
    };

    /** 짝 하나 — 말풍선 칠 → 선 긋기 → 화살촉 · 뷰파인더. still이면 움직임 없이 끝 모양 */
    const show = (k: Pair, still: boolean) => {
      const m = measure(k);
      if (!m) return;
      setActive(k);
      setFrameOn(false);
      setLine(m.line);
      setDrawn(still);
      if (still) {
        setFrame({ k, rect: m.rect });
        setFrameOn(true);
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
      // 뷰파인더는 앞 짝 것이 사라진 뒤 새 자리에 — 꺼진 동안 옮겨야 미끄러지지 않는다
      at(DRAW_MS, () => {
        setFrame({ k, rect: m.rect });
        setFrameOn(true);
      });
    };
    const loop = () => {
      show(cur, false);
      at(PAIR_MS, () => {
        cur = ((cur % 3) + 1) as Pair;
        loop();
      });
    };

    // 크기가 바뀌면 지금 짝의 선 · 프레임만 다시 잰다(움직임 없이)
    const ro = new ResizeObserver(() => {
      if (!started) return;
      const m = measure(cur);
      if (!m) return;
      setLine(m.line);
      setFrame({ k: cur, rect: m.rect });
    });
    ro.observe(box);

    let io: IntersectionObserver | null = null;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      at(0, () => {
        started = true;
        show(1, true);
      });
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
          // 두 칸이 떠오르는 움직임(Reveal)이 끝난 뒤에 재야 자리가 맞는다
          at(900, () => {
            started = true;
            loop();
          });
        },
        { threshold: 0.35 },
      );
      io.observe(box);
    }
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      io?.disconnect();
    };
  }, []);

  /** 짝이 돌기 시작하면 지금 짝이 아닌 것은 흐리게 */
  const dim = (k?: Pair) => (active !== 0 && k !== active ? "opacity-25" : "");
  const fade = "motion-safe:transition-opacity motion-safe:duration-300";

  return (
    <Band tone="tint" labelledBy="pain-h" className="py-28 max-[640px]:py-18">
      <Reveal className="flex flex-col items-center gap-4 text-center">
        <h2 id="pain-h" className="type-maintext-l text-contents-light-bgd-default max-[640px]:text-[28px]! max-[640px]:leading-[1.3]!">
          번호로 묻고,
          {/* 좁은 화면은 세 줄 — 첫 줄이 길어 "모으고,"만 혼자 떨어지지 않게 */}
          <br className="hidden max-[640px]:inline" /> 단톡방에서 모으고,
          <br />
          글로 설명하던 셀렉
        </h2>
        <p className="type-content-xl text-contents-light-bgd-sub max-[640px]:text-base!">
          이지셀렉에서는 전부 <ViewfinderText>사진 위</ViewfinderText>에서 합니다.
        </p>
      </Reveal>

      <ul className="sr-only">
        {Object.values(PAIRS).map((p) => (
          <li key={p.label}>{p.label}</li>
        ))}
      </ul>

      <div ref={boxRef} className="relative mt-14 grid grid-cols-[1fr_1.15fr] items-center gap-24 max-[820px]:mt-8 max-[820px]:grid-cols-1 max-[820px]:gap-16">
        <Reveal delay={1} className="flex flex-col items-start">
          <span className="mb-3.5 inline-flex h-8 items-center gap-1.5 rounded-(--pill) bg-surface-default-light px-3.25 type-label-semibold-s text-contents-light-bgd-sub">
            <CommentIcon size={17} />
            지금까지
          </span>
          <div ref={cardRef} className="w-full overflow-hidden rounded-(--radius-24) border border-border-light bg-background-default-sub">
            <p className="flex items-center gap-2 border-b border-divider-default px-4.5 py-3.5 type-label-semibold-s text-contents-light-bgd-sub">
              <CommentIcon size={18} className="text-contents-light-bgd-weakness" />
              우리 가족 단톡방
              <span className="type-label-medium-xs text-contents-light-bgd-weakness">4</span>
            </p>
            <ul aria-hidden className="flex flex-col gap-3 px-4.5 pt-5 pb-6">
              {MESSAGES.map((m) => {
                const on = m.pair !== undefined && m.pair === active;
                return (
                  <li key={m.text} className={`flex max-w-[84%] flex-col gap-1.5 ${m.who ? "items-start" : "items-end self-end"}`}>
                    {m.who && <span className="pl-1 type-label-medium-xs text-contents-light-bgd-weakness">{m.who}</span>}
                    <span
                      data-bubble={m.pair}
                      className={`px-3.5 py-2.5 type-content-l motion-safe:transition-[opacity,background-color,color,box-shadow] motion-safe:duration-300 ${
                        m.who ? "rounded-[16px_16px_16px_5px]" : "rounded-[16px_16px_5px_16px]"
                      } ${
                        on
                          ? "bg-brand-accent-default text-brand-on-fill shadow-[0_10px_24px_rgba(104,79,163,0.35)]"
                          : `bg-surface-default-light text-contents-light-bgd-sub ${active !== 0 ? "opacity-40" : ""}`
                      }`}
                    >
                      {m.pair && (
                        <span
                          className={`mr-1.5 inline-grid size-5 place-items-center rounded-full align-[-4px] ${
                            on ? "bg-background-default-main text-brand-accent-default" : "bg-brand-accent-default text-brand-on-fill"
                          }`}
                        >
                          {PAIRS[m.pair].icon}
                        </span>
                      )}
                      {m.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={2} className="flex flex-col items-start">
          <span className="mb-3.5 inline-flex h-8 items-center gap-1.5 rounded-(--pill) bg-brand-accent-default px-3.25 type-label-semibold-s text-brand-on-fill">
            <BrandLogo size={18} />
            이지셀렉에서는
          </span>
          <div ref={photoRef} className="relative aspect-4/3 w-full overflow-hidden rounded-(--radius-24) bg-brand-accent-surface shadow-(--shadow-modal)">
            <Image
              src={samplePhotoUrl(187)}
              alt="서로 기대어 웃는 신랑 신부 사진 위에 체크 · 별점 · 핀 · 댓글이 붙어 있다"
              fill
              sizes="(max-width: 820px) 100vw, 560px"
              className="object-cover object-[50%_20%]"
            />
            <div aria-hidden>
              <span data-pair={1} className={`absolute top-3.5 left-3.5 ${fade} ${dim(1)}`}>
                <TileCheck />
              </span>
              <span data-pair={3} data-frame={3} className={`absolute top-[29%] left-[35%] -mt-3.5 -ml-3.5 ${fade} ${dim(3)}`}>
                <PinMark n={1} />
              </span>
              <span data-pair={3} data-frame={3} className={`absolute top-[40%] left-[3%] ${fade} ${dim(3)}`}>
                <RequestChip n={1}>잔머리 정리</RequestChip>
              </span>
              <span data-pair={2} data-frame={2} className={`absolute top-[64%] left-[3%] ${fade} ${dim(2)}`}>
                <CommentChip who="엄" tone="c">
                  이거 액자로 하자!
                </CommentChip>
              </span>
              {/* 좋아요는 오른쪽 아래 — 댓글이 왼쪽으로 와서(선이 사진을 덜 가로지르게) 좁은 화면에서 겹치지 않게 */}
              <span data-pair={2} className={`absolute right-3.5 bottom-15.5 ${fade} ${dim(2)}`}>
                <LikeChip count={3} />
              </span>
              <span data-pair={1} data-frame={1} className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${fade} ${dim(1)}`}>
                <RatingBar score={5} label="선택" />
              </span>
              {frame && <FocusFrame rect={frame.rect} label={PAIRS[frame.k].label} labelAt={PAIRS[frame.k].labelAt} on={frameOn} />}
            </div>
          </div>
        </Reveal>

        {line && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-6 size-full overflow-visible text-brand-accent-default">
            <path
              key={line.k}
              d={line.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{
                strokeDasharray: line.len,
                strokeDashoffset: drawn ? 0 : line.len,
                transition: drawn ? `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(.4,0,.2,1)` : "none",
              }}
            />
            <polygon points={line.head} fill="currentColor" className={`motion-safe:transition-opacity motion-safe:duration-200 ${frameOn ? "opacity-100" : "opacity-0"}`} />
            <circle cx={line.start[0]} cy={line.start[1]} r={4.5} fill="currentColor" strokeWidth={2} className="stroke-background-default-main" />
          </svg>
        )}
      </div>
    </Band>
  );
}
