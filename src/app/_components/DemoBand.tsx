"use client";

/**
 * 랜딩 체험 띠 — 가입 전에 샘플 갤러리로 먼저(이슈 182, 시안 D 7)
 * 위치: src/app/_components/DemoBand.tsx
 *
 * 진한 연보라 띠에 글 · 버튼(체험 페이지 /demo)과, 체험 페이지의 위 띠를 얹은 실제 화면을 살짝 기울여 둔다.
 * 화면은 컨셉 분류(FoldersShot) — 체험이 시작하는 단계라 들어가면 같은 화면이 나온다. 좁은 화면은 기울이지 않는다.
 */

import { track } from "@/lib/analytics";
import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Band } from "./Band";
import { Reveal } from "./Reveal";
import { FoldersShot } from "./shots/FoldersShot";

export function DemoBand() {
  return (
    <Band
      tone="lavender"
      labelledBy="demo-h"
      className="grid grid-cols-[1fr_1.25fr] items-center gap-14 py-24 max-[900px]:grid-cols-1 max-[900px]:gap-10 max-[640px]:py-16"
    >
      <Reveal className="flex flex-col items-start gap-5">
        <p className="type-label-eyebrow text-brand-accent-default">Try it</p>
        <h2 id="demo-h" className="type-maintext-l text-contents-light-bgd-default max-[640px]:text-[28px]! max-[640px]:leading-[1.3]!">
          가입 전에,
          <br />
          샘플 갤러리로 먼저
        </h2>
        <p className="type-content-xl text-contents-light-bgd-sub max-[640px]:text-base!">
          샘플 사진 250장이 담긴 갤러리에서 컨셉 분류부터 보정 작성까지 직접 해 볼 수 있습니다.
        </p>
        <div className="pt-2">
          <Button href="/demo" size="lg" icon={<ArrowRightIcon />} onClick={() => track("demo_cta_clicked", { from: "band" })}>
            로그인 없이 체험하기
          </Button>
        </div>
      </Reveal>

      <Reveal variant="rise" delay={2} className="perspective-[1400px]">
        <div className="overflow-hidden rounded-(--radius-12) bg-background-default-main shadow-[0_40px_80px_rgba(36,22,80,0.28)] rotate-x-3 -rotate-y-8 max-[900px]:transform-none">
          {/* 체험 페이지 위 띠(DemoShell)와 같은 모양 */}
          <div aria-hidden className="flex h-8.5 items-center justify-between gap-2 bg-brand-accent-default pr-1.5 pl-3.5 type-label-medium-xs text-brand-on-fill">
            <span className="truncate">체험 중 · 샘플 사진 250장</span>
            <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-(--pill) bg-brand-primary-default px-2.5">
              내 사진으로 시작하기
              <ArrowRightIcon size={14} />
            </span>
          </div>
          <FoldersShot />
        </div>
      </Reveal>
    </Band>
  );
}
