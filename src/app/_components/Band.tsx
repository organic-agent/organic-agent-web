/**
 * 랜딩 구역 띠 — 아래 선을 화면 전체가 아니라 안쪽 폭(로고부터 회원가입 버튼까지)으로만 긋는다
 * 위치: src/app/_components/Band.tsx
 *
 * 2026-10-26 수민: "랜딩의 모든 선이 똑같이" — 내비와 같은 폭. 바깥 section은 바탕만, 가운데 상자가 폭을 잡고,
 * 안쪽 상자가 선 · 위아래 여백 · 내용 배치를 맡는다(className은 안쪽 상자에 들어간다).
 */

import type { ReactNode } from "react";

export function Band({
  id,
  labelledBy,
  className = "",
  children,
}: {
  id?: string;
  /** 제목 요소의 id — section의 aria-labelledby */
  labelledBy?: string;
  /** 안쪽 상자 — 위아래 여백과 배치 */
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="bg-background-default-main">
      <div className="max-w-wrap mx-auto px-6">
        <div className={`border-b border-divider-default ${className}`}>{children}</div>
      </div>
    </section>
  );
}
