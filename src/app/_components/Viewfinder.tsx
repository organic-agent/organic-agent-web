/**
 * 랜딩 뷰파인더 — 로고의 뷰파인더 네 모서리로 그리는 강조 글자와 초점 프레임(이슈 182)
 * 위치: src/app/_components/Viewfinder.tsx
 *
 * 레퍼런스(heymoa)의 형광펜 · 포스트잇 대신 우리 로고 모양을 강조 장치로 쓴다. 모양은 globals.css의 .vf · .ff.
 * - ViewfinderText: 강조 단어를 모서리로 감싼다. 랜딩 전체에서 세 곳(히어로 · 문제 제기 · 마무리)만 —
 *   여러 곳에 쓰면 인용 부호처럼 읽힌다(시안 검수). 크기는 글자 크기에 맞춰 sm(본문) · md(48) · lg(64).
 * - FocusFrame: 감싼 상자(position: relative) 기준 %로 한 곳을 잡는다. 이름표는 위(기본) · 아래 · 옆(start · end).
 *   seq를 주면 Reveal seq가 그 시간(ms) 뒤 .seq-go를 붙여 초점이 맞듯 나타난다 — 흐름 화면의 움직임이 끝난 뒤.
 *   그림일 뿐이라 aria-hidden(화면 설명은 감싼 그림의 라벨이 맡는다).
 */

import type { ReactNode } from "react";

export function ViewfinderText({ size = "sm", children }: { size?: "sm" | "md" | "lg"; children: ReactNode }) {
  return <span className={size === "sm" ? "vf" : `vf vf-${size}`}>{children}</span>;
}

/** 감싼 상자 기준 % — x · y는 왼쪽 위, w · h는 폭 · 높이 */
export type FrameRect = { x: number; y: number; w: number; h: number };

export function FocusFrame({
  rect,
  label,
  labelAt = "top",
  align = "start",
  seq,
  mobileLabel = true,
}: {
  rect: FrameRect;
  label?: string;
  /** 이름표 자리 — 옆(start · end)은 좁은 화면에서 위로 바뀐다 */
  labelAt?: "top" | "bottom" | "start" | "end";
  /** 위 · 아래 이름표를 프레임의 어느 끝에 맞출지 */
  align?: "start" | "end";
  /** 나타날 시각(ms) — Reveal seq 안에서만 */
  seq?: number;
  /** false면 좁은 화면에서 이름표를 숨긴다(화면 글자를 가릴 때) */
  mobileLabel?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={seq === undefined ? "ff" : "ff ff-wait"}
      data-seq={seq}
      data-label={labelAt}
      data-align={align}
      data-mobile-label={mobileLabel ? undefined : "off"}
      style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
    >
      {label && <b>{label}</b>}
    </span>
  );
}
