"use client";

/**
 * 랜딩 히어로 사진 — 사진을 넘기며 커서가 별점 · 선택을 누른다(이슈 182, 시안 D 2-4)
 * 위치: src/app/_components/HeroPhoto.tsx
 *
 * 첫 화면에서 "여러 장 중에서 고르는 도구"라는 게 보이도록 사진 네 장을 차례로 넘긴다. 장마다 얼굴에 초점 프레임(로고의 뷰파인더)이
 * 맞고, 커서가 별을 눌러 별점을 매긴다 — 누른 칸까지 한 번에 찬다(실제 크게 보기와 같음). 4점 이상이면 "선택"을 눌러 썸네일이
 * 선택 카드로 날아가고 장수가 는다. 3점 사진은 고르지 않고 넘어간다. 왼쪽 위 칩은 넘겨 본 장수(128 / 500).
 * 표시는 그림이라 aria-hidden — 사진 설명은 첫 사진의 alt가 맡는다. 움직임 줄이기면 첫 사진의 끝 상태(4점 · 선택됨 · 34장).
 * 상자는 4:5를 지킨다 — 비율이 바뀌면 사진이 다르게 잘려 프레임이 얼굴에서 벗어난다. 좁은 화면(900 미만)은 가운데에 놓고
 * 카드를 사진 안으로 들이며, 선택 수 카드는 한 줄 칩으로 줄인다(썸네일 줄이 숨으니 날아가는 사진은 칩으로 간다).
 */

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RatingBar } from "./PhotoMarks";
import { FocusFrame, type FrameRect } from "./Viewfinder";
import { ShotCursor } from "./shots/ShotChrome";
import { samplePhotoUrl, sampleThumbUrl } from "./shots/samplePhotos";

/** 넘기는 사진 — frame은 얼굴 자리(4:5 · 가운데 맞춤 기준 %), score는 커서가 누르는 별, thumb은 고르면 카드에 붙는 썸네일 */
const PHOTOS: { src: string; frame: FrameRect; score: number; thumb: number }[] = [
  { src: "/images/hero-wedding.jpg", frame: { x: 30, y: 5, w: 46, h: 30 }, score: 4, thumb: 238 },
  { src: samplePhotoUrl(240), frame: { x: 24, y: 3, w: 56, h: 32 }, score: 5, thumb: 240 },
  { src: samplePhotoUrl(187), frame: { x: 28, y: 3, w: 52, h: 32 }, score: 3, thumb: 187 },
  { src: samplePhotoUrl(231), frame: { x: 26, y: 3, w: 54, h: 32 }, score: 5, thumb: 231 },
];
/** 선택 카드의 처음 썸네일 · 장수와 넘겨 본 장수 — 한 바퀴 돌면 처음으로 */
const START_THUMBS = [178, 182, 190];
const START_COUNT = 33;
const START_SEEN = 128;
const TOTAL = 500;
const MAX_PICK = 50;
/** 한 장에 머무는 시간 — 커서 이동(0.9초)이 두 번 들어간다 */
const PHOTO_MS = 4100;

type Fly = { id: number; style: CSSProperties };

export function HeroPhoto() {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [frameOn, setFrameOn] = useState(false);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(false);
  const [count, setCount] = useState(START_COUNT);
  const [seen, setSeen] = useState(START_SEEN);
  const [thumbs, setThumbs] = useState(START_THUMBS);
  /** ready — 첫 자리를 잡은 뒤에 그린다(0,0에서 미끄러져 오지 않게) */
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, click: 0, ready: false });
  const [fly, setFly] = useState<Fly | null>(null);

  useEffect(() => {
    // 도는 동안 계속 예약하니 끝난 타이머는 바로 지운다(남은 것만 정리 대상)
    const timers = new Set<number>();
    const at = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const stop = () => timers.forEach(clearTimeout);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      at(0, () => {
        setFrameOn(true);
        setScore(PHOTOS[0].score);
        setPicked(true);
        setCount(START_COUNT + 1);
        setThumbs([...START_THUMBS, PHOTOS[0].thumb]);
      });
      return stop;
    }

    /** 요소 가운데를 상자 기준 px로 — 커서 화살 끝(왼쪽 위에서 3 · 2px)이 가운데에 오게 */
    const centerOf = (el: Element | null | undefined) => {
      const root = rootRef.current;
      if (!el || !root) return null;
      const r = root.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      return { x: b.left - r.left + b.width / 2 - 3, y: b.top - r.top + b.height / 2 - 2 };
    };
    const moveTo = (p: { x: number; y: number } | null) => {
      if (p) setCursor((c) => ({ ...c, x: p.x, y: p.y, visible: true }));
    };
    const click = () => setCursor((c) => ({ ...c, click: c.click + 1 }));
    // 별점 줄 = RatingBar(별 svg 다섯 개 + 선택 칩)
    const star = (n: number) => barRef.current?.querySelectorAll("svg")[n - 1];
    const pickChip = () => barRef.current?.firstElementChild?.lastElementChild;
    const size = () => rootRef.current?.getBoundingClientRect() ?? { width: 440, height: 550 };

    /** 고른 사진이 사진 가운데에서 선택 카드의 썸네일 줄(좁은 화면은 카드)로 날아간다 */
    const flyThumb = (id: number) => {
      const root = rootRef.current;
      const row = thumbsRef.current;
      const target = (row && row.offsetParent ? row : cardRef.current)?.getBoundingClientRect();
      if (!root || !target) return;
      const r = root.getBoundingClientRect();
      setFly({ id, style: { left: r.width * 0.32, top: r.height * 0.18, width: r.width * 0.36, height: r.width * 0.54, opacity: 1 } });
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setFly({ id, style: { left: target.right - r.left - 30, top: target.top - r.top, width: 30, height: 42, opacity: 0.35 } }),
        ),
      );
      at(760, () => {
        setFly(null);
        setThumbs((t) => [...t, id].slice(-4));
      });
    };

    let i = 0;
    let picks = START_COUNT;
    let views = START_SEEN;
    const show = () => {
      const p = PHOTOS[i];
      setIndex(i);
      setFrameOn(false);
      setScore(0);
      setPicked(false);
      setSeen(views);
      at(350, () => setFrameOn(true));
      at(200, () => moveTo(centerOf(star(p.score))));
      at(1150, () => {
        click();
        setScore(p.score);
      });
      if (p.score >= 4) {
        at(1450, () => moveTo(centerOf(pickChip())));
        at(2400, () => {
          click();
          setPicked(true);
        });
        at(2600, () => flyThumb(p.thumb));
        at(3350, () => setCount(++picks));
      } else {
        at(1550, () => {
          const s = size();
          moveTo({ x: s.width * 0.84, y: s.height * 0.64 });
        });
      }
      at(PHOTO_MS, () => {
        i = (i + 1) % PHOTOS.length;
        views += 1;
        if (i === 0) {
          picks = START_COUNT;
          views = START_SEEN;
          setCount(picks);
          setThumbs(START_THUMBS);
        }
        show();
      });
    };
    // 커서는 상자 오른쪽에서 나타나 첫 별로 간다
    at(0, () => {
      const s = size();
      setCursor((c) => ({ ...c, x: s.width * 0.9, y: s.height * 0.62, ready: true }));
      show();
    });
    return stop;
  }, []);

  return (
    <div ref={rootRef} className="relative aspect-4/5 w-110 shrink-0 max-[900px]:mx-auto max-[900px]:w-full max-[900px]:max-w-110">
      <div className="absolute inset-0 overflow-hidden rounded-(--radius-24) bg-brand-accent-surface">
        {/* 첫 사진은 첫 화면에 바로 보이니 미루지 않고 먼저 받는다(loading eager · fetchPriority high), 나머지는 차례가 오면 */}
        {PHOTOS.map((p, k) => (
          <Image
            key={p.src}
            src={p.src}
            alt={k === 0 ? "웨딩드레스와 정장을 입고 손을 잡은 채 웃고 있는 신랑 신부" : ""}
            fill
            sizes="(max-width: 900px) 100vw, 440px"
            {...(k === 0 ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
            className={`object-cover motion-safe:transition-opacity motion-safe:duration-700 ${k === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>

      <div aria-hidden>
        <FocusFrame rect={PHOTOS[index].frame} on={frameOn} />
        <span className="absolute top-4 left-4 z-4 inline-flex h-7.5 items-center gap-1 rounded-(--pill) bg-surface-default-darkness px-3 type-label-semibold-s text-contents-dark-bgd-default tabular-nums">
          {seen}
          <span className="font-normal text-contents-dark-bgd-sub">/ {TOTAL}</span>
        </span>

        <div
          ref={cardRef}
          className="absolute bottom-25 -left-12 z-4 w-59 rounded-(--radius-16) bg-background-default-main px-4 py-3.5 shadow-(--shadow-modal) max-[900px]:bottom-17 max-[900px]:left-3 max-[900px]:w-auto max-[900px]:rounded-(--pill) max-[900px]:py-2"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="type-label-medium-s text-contents-light-bgd-weakness">선택한 사진</span>
            <b className="type-title-xl text-contents-light-bgd-default tabular-nums max-[900px]:text-lg!">
              {count} <span className="type-label-medium-m text-contents-light-bgd-weakness">/ {MAX_PICK}</span>
            </b>
          </span>
          <span className="mt-2.5 block h-1.5 overflow-hidden rounded-(--pill) bg-brand-accent-surface max-[900px]:hidden">
            <i
              className="block h-full rounded-(--pill) bg-brand-accent-default motion-safe:transition-[width] motion-safe:duration-500"
              style={{ width: `${(count / MAX_PICK) * 100}%` }}
            />
          </span>
          <span ref={thumbsRef} className="mt-2.5 flex gap-1.25 max-[900px]:hidden">
            {thumbs.map((id) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={id} src={sampleThumbUrl(id)} alt="" className="h-10.5 w-7.5 rounded-(--radius-4) object-cover" />
            ))}
          </span>
        </div>

        <span ref={barRef} className="absolute bottom-6 left-1/2 z-4 -translate-x-1/2 max-[900px]:bottom-3.5">
          <RatingBar score={score} picked={picked} label={picked ? "선택됨" : "선택"} />
        </span>

        {fly && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={fly.id}
            src={sampleThumbUrl(fly.id)}
            alt=""
            className="absolute z-6 rounded-(--radius-8) object-cover shadow-(--shadow-modal) transition-all duration-700 ease-[cubic-bezier(.5,0,.2,1)]"
            style={fly.style}
          />
        )}
        {cursor.ready && <ShotCursor x={cursor.x} y={cursor.y} visible={cursor.visible} click={cursor.click} />}
      </div>
    </div>
  );
}
