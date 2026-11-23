"use client";

/**
 * 랜딩 마무리 — 보라 상자 2단: 문구 · 버튼 | 선택 완료 카드(이슈 182, 시안 D 9)
 * 위치: src/app/_components/ClosingCta.tsx
 *
 * 문구 "이번 셀렉은 사진 위에서 함께 끝내요" — 문제 제기의 "사진 위에서"를 닫고 히어로의 "함께"와 잇는다(시안 9-1).
 * 카드는 제품 하단 바처럼 선택 수 50 / 50 · 고른 사진 · 요청서 내보내기. 내보내기는 버튼 모양 없이 한 줄 — 상자의 주 버튼과
 * 헷갈리지 않게(시안 검수). 상자 위 뷰파인더 모서리는 data-tone="brand"로 밝게(globals.css .vf).
 */

import { track } from "@/lib/analytics";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Band } from "./Band";
import { Reveal } from "./Reveal";
import { ViewfinderText } from "./Viewfinder";
import { sampleThumbUrl } from "./shots/samplePhotos";

const PICKED = [178, 182, 187, 190, 231, 238];

export function ClosingCta({ onStart }: { onStart: () => void }) {
  return (
    <Band labelledBy="cta-h" className="py-28 max-[640px]:py-18">
      <Reveal>
        <div
          data-tone="brand"
          className="grid grid-cols-[1.5fr_1fr] items-center gap-12 rounded-[40px] bg-brand-secondary-default px-18 py-18 max-[820px]:grid-cols-1 max-[820px]:gap-8 max-[820px]:rounded-(--radius-24) max-[820px]:px-5.5 max-[820px]:py-12"
        >
          <div className="flex flex-col items-start">
            <h2 id="cta-h" className="type-maintext-m text-brand-on-fill max-[640px]:text-[30px]! max-[640px]:leading-tight!">
              이번 셀렉은
              <br />
              <ViewfinderText size="md">사진 위</ViewfinderText>에서 함께 끝내요
            </h2>
            <p className="mt-4 type-content-xl text-brand-on-fill/80 max-[640px]:text-base!">원본 업로드부터 보정 요청서까지, 갤러리 하나로.</p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Button size="lg" icon={<ArrowRightIcon />} onClick={onStart}>
                무료로 시작하기
              </Button>
              <Button
                href="/demo"
                kind="ghost"
                size="lg"
                onClick={() => track("demo_cta_clicked", { from: "cta" })}
                className="text-brand-on-fill! ring-1 ring-brand-on-fill/50 hover:bg-brand-on-fill/10!"
              >
                로그인 없이 체험하기
              </Button>
            </div>
          </div>

          <div
            aria-hidden
            className="w-full max-w-80 justify-self-end rounded-(--radius-16) bg-background-default-main p-4 shadow-[0_22px_44px_rgba(20,8,50,0.3)] max-[820px]:max-w-none max-[820px]:justify-self-stretch"
          >
            <div className="flex items-baseline justify-between">
              <span className="type-label-medium-s text-contents-light-bgd-weakness">선택한 사진</span>
              <b className="type-title-l text-contents-light-bgd-default tabular-nums">
                50 <span className="type-label-medium-s text-contents-light-bgd-weakness">/ 50</span>
              </b>
            </div>
            <span className="mt-2.5 block h-1.5 rounded-(--pill) bg-brand-accent-default" />
            <div className="mt-3 grid grid-cols-6 gap-1">
              {PICKED.map((id) => (
                <div key={id} className="relative aspect-2/3 overflow-hidden rounded-(--radius-4) bg-surface-default-light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sampleThumbUrl(id)} alt="" loading="lazy" className="size-full object-cover" />
                  <span className="absolute top-0.75 left-0.75 grid size-3.5 place-items-center rounded-[3px] bg-brand-accent-default text-brand-on-fill">
                    <svg viewBox="0 0 16 16" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 border-t border-divider-default pt-3 type-label-medium-s text-contents-light-bgd-sub">
              <DownloadIcon size={16} className="text-brand-accent-default" />
              보정 요청서 내보내기
            </p>
          </div>
        </div>
      </Reveal>
    </Band>
  );
}
