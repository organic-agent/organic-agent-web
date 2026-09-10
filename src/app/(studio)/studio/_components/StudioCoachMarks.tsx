"use client";

/**
 * 스튜디오 홈 첫 진입 코치마크 (와이어프레임 02 첫 진입)
 * 위치: src/app/(studio)/studio/_components/StudioCoachMarks.tsx
 *
 * 스포트라이트(대상만 밝게, 나머지 어둡게) + 말풍선 4단계: 새 갤러리 → 필터 → 알림 → 초대.
 * 한 번만 자동 재생하고 다시 보기는 없다 — 끝내거나 건너뛰면 localStorage `sel.coach.studioHome`에
 * 기록한다. 대상은 data-coach 속성으로 찾고, 화면에 없는 대상은 건너뛴다.
 * 말풍선은 대상 아래가 좁으면 위로 올라가고, 좌우는 화면 안으로 고정한다.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { createLocalStore } from "@/lib/localStore";

const STEPS: ReadonlyArray<{
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  round?: boolean;
}> = [
  {
    key: "new-gallery",
    eyebrow: "새 갤러리",
    title: "촬영 건마다 갤러리 하나",
    body: "이름만 정하면 바로 만들 수 있어요. 사진을 올리면 AI가 폴더로 나눠 줘요.",
  },
  {
    key: "filter",
    eyebrow: "필터",
    title: "단계별로 모아 보기",
    body: "업로드부터 전달까지 단계별로 골라 보고, 보관한 갤러리도 여기서 찾아요.",
    round: true,
  },
  {
    key: "bell",
    eyebrow: "알림",
    title: "클라이언트 활동 알림",
    body: "사진을 고르거나 보정을 요청하면 여기로 알려 드려요.",
    round: true,
  },
  {
    key: "invite",
    eyebrow: "초대",
    title: "함께 일하는 작가 초대",
    body: "초대 링크로 함께 일하는 작가를 스튜디오에 불러요.",
    round: true,
  },
];

const doneStore = createLocalStore<boolean>("sel.coach.studioHome", false);

const BUBBLE_WIDTH = 300;
const GAP = 12;
const MARGIN = 12;
/** 말풍선 예상 높이 — 아래에 이만큼 없으면 위로 올린다 */
const BUBBLE_HEIGHT = 180;

type Box = { left: number; top: number; width: number; height: number };

export function StudioCoachMarks({ ready }: { ready: boolean }) {
  const done = useSyncExternalStore(
    doneStore.subscribe,
    doneStore.get,
    doneStore.getServerSnapshot,
  );
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const active = ready && !done && index < STEPS.length;
  const step = STEPS[index];

  // 대상 위치 측정 — 창 크기·스크롤이 바뀌면 다시 잰다. 없는 대상은 건너뛴다.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-coach="${step.key}"]`);
      frame = requestAnimationFrame(() => {
        if (!el) {
          setIndex((i) => i + 1);
          return;
        }
        el.scrollIntoView({ block: "nearest" });
        const r = el.getBoundingClientRect();
        setBox({ left: r.left, top: r.top, width: r.width, height: r.height });
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") doneStore.set(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (!active || !box) return null;

  const pad = step.round ? 4 : 6;
  const hole = {
    left: box.left - pad,
    top: box.top - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const bubbleLeft = Math.min(
    Math.max(hole.left, MARGIN),
    Math.max(MARGIN, vw - BUBBLE_WIDTH - MARGIN),
  );
  const below = hole.top + hole.height + GAP + BUBBLE_HEIGHT <= vh - MARGIN;
  const arrowX = Math.min(
    Math.max(hole.left + hole.width / 2 - bubbleLeft, 22),
    BUBBLE_WIDTH - 22,
  );
  const last = index === STEPS.length - 1;

  function next() {
    if (last) doneStore.set(true);
    else setIndex((i) => i + 1);
  }

  return (
    <>
      {/* 스포트라이트 — 구멍 밖을 큰 그림자로 어둡게 */}
      <div
        aria-hidden
        className={`pointer-events-none fixed z-90 shadow-[0_0_0_9999px_var(--surface-default-medium)] ${
          step.round ? "rounded-full" : "rounded-(--radius-16)"
        }`}
        style={hole}
      />
      <div
        role="dialog"
        aria-label={`안내 ${index + 1} / ${STEPS.length}: ${step.title}`}
        className="fixed z-91 rounded-(--radius-12) border border-divider-default bg-background-default-main p-4 shadow-(--shadow-modal)"
        style={{
          width: BUBBLE_WIDTH,
          left: bubbleLeft,
          ...(below
            ? { top: hole.top + hole.height + GAP }
            : { bottom: vh - hole.top + GAP }),
        }}
      >
        <span
          aria-hidden
          className={`absolute size-3 rotate-45 border-divider-default bg-background-default-main ${
            below ? "-top-1.5 border-t border-l" : "-bottom-1.5 border-r border-b"
          }`}
          style={{ left: arrowX - 6 }}
        />
        <p className="type-label-eyebrow text-brand-secondary-default">
          {index + 1} / {STEPS.length} · {step.eyebrow}
        </p>
        <h3 className="mt-1.5 type-label-semibold-m text-contents-light-bgd-default">
          {step.title}
        </h3>
        <p className="mt-1 type-content-s text-contents-light-bgd-sub">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={`size-1.5 rounded-full ${
                  i === index ? "bg-brand-secondary-default" : "bg-divider-default"
                }`}
              />
            ))}
          </span>
          <span className="flex gap-1.5">
            <Button kind="ghost" size="sm" onClick={() => doneStore.set(true)}>
              건너뛰기
            </Button>
            <Button size="sm" onClick={next}>
              {last ? "완료" : "다음"}
            </Button>
          </span>
        </div>
      </div>
    </>
  );
}
