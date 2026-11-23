/**
 * 랜딩 구역 띠 — 바탕색은 띠 전체, 내용은 내비와 같은 안쪽 폭
 * 위치: src/app/_components/Band.tsx
 *
 * 바깥 section은 바탕만, 가운데 상자가 폭을 잡고, 안쪽 상자가 위아래 여백 · 내용 배치를 맡는다(className은 안쪽 상자에 들어간다).
 * 2026-11-23(이슈 182) 구역 경계를 선 대신 바탕색으로 나눈다 — 흰 · 연보라(tint) · 진한 연보라(lavender, 체험 띠) ·
 * 어두운(dark, 셀렉 구역 = 크게 보기 화면의 결).
 * dark는 data-tone을 달아 뷰파인더 모서리 · 프레임 색이 밝아진다(globals.css .vf · .ff).
 * pin(흐름 확대 투어, 시안 4-5): 구역을 화면 높이의 pin배로 늘이고 안쪽을 화면 맨 위에 붙여 둔다 — 내리는 동안 화면이 멈춰 있고
 * 부른 쪽이 스크롤 진행으로 단계를 넘긴다. 화면이 낮으면(560 미만) 붙이지 않는다(내용이 넘치니).
 */

import type { CSSProperties, ReactNode, Ref } from "react";

const TONE_BG = {
  white: "bg-background-default-main",
  tint: "bg-brand-secondary-background/55",
  lavender: "bg-brand-secondary-background",
  dark: "bg-background-inverse-main",
} as const;

export function Band({
  id,
  labelledBy,
  tone = "white",
  className = "",
  pin,
  sectionRef,
  children,
}: {
  id?: string;
  /** 제목 요소의 id — section의 aria-labelledby */
  labelledBy?: string;
  tone?: keyof typeof TONE_BG;
  /** 안쪽 상자 — 위아래 여백과 배치 */
  className?: string;
  /** 화면에 붙여 둘 길이 — 화면 높이의 배수(2.5면 구역이 2.5화면) */
  pin?: number;
  sectionRef?: Ref<HTMLElement>;
  children: ReactNode;
}) {
  const inner = (
    <div className="max-w-wrap mx-auto px-6">
      <div className={className}>{children}</div>
    </div>
  );
  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={labelledBy}
      data-tone={tone === "dark" ? "dark" : undefined}
      className={`${TONE_BG[tone]} ${pin ? "h-[calc(var(--pin)*100svh)] [@media(max-height:559px)]:h-auto" : ""}`}
      style={pin ? ({ "--pin": pin } as CSSProperties) : undefined}
    >
      {pin ? <div className="sticky top-0 flex h-svh items-center *:w-full [@media(max-height:559px)]:static [@media(max-height:559px)]:h-auto">{inner}</div> : inner}
    </section>
  );
}
