/**
 * 랜딩 구역 띠 — 바탕색은 띠 전체, 내용은 내비와 같은 안쪽 폭
 * 위치: src/app/_components/Band.tsx
 *
 * 바깥 section은 바탕만, 가운데 상자가 폭을 잡고, 안쪽 상자가 위아래 여백 · 내용 배치를 맡는다(className은 안쪽 상자에 들어간다).
 * 2026-11-23(이슈 182) 구역 경계를 선 대신 바탕색으로 나눈다 — 흰 · 연보라(tint) · 진한 연보라(lavender, 체험 띠) ·
 * 어두운(dark, 셀렉 구역 = 크게 보기 화면의 결).
 * dark는 data-tone을 달아 뷰파인더 모서리 · 프레임 색이 밝아진다(globals.css .vf · .ff).
 * 화면에 붙여 두는 고정(pin)은 이슈 184에서 뺐다 — 흐름 투어는 고정 없이 저절로 넘어간다(FlowSection).
 */

import type { ReactNode } from "react";

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
  children,
}: {
  id?: string;
  /** 제목 요소의 id — section의 aria-labelledby */
  labelledBy?: string;
  tone?: keyof typeof TONE_BG;
  /** 안쪽 상자 — 위아래 여백과 배치 */
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} data-tone={tone === "dark" ? "dark" : undefined} className={TONE_BG[tone]}>
      <div className="max-w-wrap mx-auto px-6">
        <div className={className}>{children}</div>
      </div>
    </section>
  );
}
