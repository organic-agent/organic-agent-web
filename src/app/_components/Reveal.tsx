"use client";

/**
 * 스크롤 진입 시 페이드인시키는 래퍼 (IntersectionObserver 기반)
 * 위치: src/app/_components/Reveal.tsx
 *
 * children을 감싸면 화면에 들어올 때 reveal-visible 클래스가 붙어 애니메이션된다.
 */

import { useEffect, useRef, useState } from "react";

export type RevealDelay = 1 | 2 | 3 | 4 | 5 | 6;

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: RevealDelay;
};

const delayClass: Record<number, string> = {
  1: "reveal-delay-1",
  2: "reveal-delay-2",
  3: "reveal-delay-3",
  4: "reveal-delay-4",
  5: "reveal-delay-5",
  6: "reveal-delay-6",
};

function getInitialVisibility() {
  if (typeof window === "undefined") return false;
  const reduce = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduce) return true;
  if (!("IntersectionObserver" in window)) return true;
  return false;
}

export function Reveal({ children, className = "", delay }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
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

  const classes = [
    "reveal-base",
    visible && "reveal-visible",
    delay && delayClass[delay],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes}>
      {children}
    </div>
  );
}
