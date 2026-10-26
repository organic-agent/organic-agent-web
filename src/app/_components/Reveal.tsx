"use client";

/**
 * 스크롤 진입 시 떠오르는 래퍼 (IntersectionObserver 기반)
 * 위치: src/app/_components/Reveal.tsx
 *
 * children을 감싸면 화면에 들어올 때 reveal-visible 클래스가 붙어 움직인다. 규칙은 globals.css의 Scroll-reveal.
 *
 * variant(2026-10-26, 랜딩 흐름 구역 · 이슈 144):
 *  - fade(기본) 살짝 위로 떠오름 — 지금까지의 Reveal 그대로
 *  - blur      글이 흐림에서 선명해지며 떠오름(부제 · 아이브로우)
 *  - rise      화면 목업이 더 아래서 살짝 작았다가 올라옴(1.1초)
 *  - lines     제목 — lines로 준 줄이 차례로 떠오른다(0.09초 간격 · 흐림→선명). children 대신 lines를 쓴다
 * seq: 보이게 된 뒤 안쪽 [data-seq="ms"] 요소마다 그 시간 뒤 seq-go 클래스를 붙인다 — 화면 안 동작(체크 · 핀 · 막대)이
 *      한 번 일어난다. 시작 모양은 globals.css의 .seq-pop · .seq-slide · .seq-slide-left · .seq-slide-up.
 * 움직임 줄이기(prefers-reduced-motion)나 IntersectionObserver가 없으면 처음부터 끝 상태로 그린다.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type RevealDelay = 1 | 2 | 3 | 4 | 5 | 6;
export type RevealVariant = "fade" | "blur" | "rise" | "lines";
type RevealTag = "div" | "section" | "h1" | "h2" | "h3" | "p" | "span";

type RevealProps = {
  children?: React.ReactNode;
  className?: string;
  delay?: RevealDelay;
  variant?: RevealVariant;
  /** variant="lines"일 때 줄 목록 — 줄마다 block span으로 그려 차례로 떠오른다 */
  lines?: string[];
  /** 감싸는 요소 — 제목이면 h1 · h2 */
  as?: RevealTag;
  /** true면 보이게 된 뒤 안쪽 [data-seq] 요소를 시간순으로 켠다 */
  seq?: boolean;
};

const delayClass: Record<number, string> = {
  1: "reveal-delay-1",
  2: "reveal-delay-2",
  3: "reveal-delay-3",
  4: "reveal-delay-4",
  5: "reveal-delay-5",
  6: "reveal-delay-6",
};

const variantClass: Record<RevealVariant, string> = {
  fade: "",
  blur: "reveal-blur",
  rise: "reveal-rise",
  lines: "reveal-lines",
};

/** delay 단계 → 초. lines는 줄마다 더해지는 기본 지연으로 쓴다(delay 클래스는 감싸는 요소에 걸려 줄에 안 미침) */
const DELAY_SECONDS = 0.06;

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function getInitialVisibility() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return true;
  if (!("IntersectionObserver" in window)) return true;
  return false;
}

export function Reveal({
  children,
  className = "",
  delay,
  variant = "fade",
  lines,
  as: Tag = "div",
  seq = false,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(getInitialVisibility);

  useEffect(() => {
    if (visible) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // 보이게 된 뒤 화면 안 동작 — 각 [data-seq]를 제 시간에 켠다. 움직임 줄이기면 바로 끝 상태
  useEffect(() => {
    if (!visible || !seq) return;
    const el = ref.current;
    if (!el) return;
    const reduce = prefersReducedMotion();
    const timers: number[] = [];
    el.querySelectorAll<HTMLElement>("[data-seq]").forEach((node) => {
      const ms = Number(node.dataset.seq) || 0;
      const go = () => node.classList.add("seq-go");
      if (reduce) go();
      else timers.push(window.setTimeout(go, ms));
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, seq]);

  const classes = [
    "reveal-base",
    variantClass[variant],
    visible && "reveal-visible",
    delay && variant !== "lines" && delayClass[delay],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const style: CSSProperties | undefined =
    variant === "lines" && delay ? ({ "--rd": `${delay * DELAY_SECONDS}s` } as CSSProperties) : undefined;

  return (
    <Tag ref={ref as React.Ref<never>} className={classes} style={style}>
      {variant === "lines" && lines
        ? lines.map((line, i) => (
            <span key={i} className="reveal-line" style={{ "--i": i } as CSSProperties}>
              {line}
            </span>
          ))
        : children}
    </Tag>
  );
}
