"use client";

/**
 * 랜딩 히어로 사진 — 웨딩 사진 위에 제품의 표시를 얹는다(이슈 182, 시안 D 2-1)
 * 위치: src/app/_components/HeroPhoto.tsx
 *
 * 첫 화면에서 "사진 고르는 도구"라는 게 보이도록 사진 위에 얼굴 초점 프레임 · 핀 · 핀 요청 카드 · 선택 수 카드 · 별점 줄을 둔다.
 * 사진은 먼저 받고(첫 화면), 표시는 Reveal seq로 차례로 나온다. 표시는 그림이라 aria-hidden.
 * 상자는 4:5를 지킨다 — 비율이 바뀌면 사진이 다르게 잘려 프레임 · 핀이 얼굴에서 벗어난다. 좁은 화면(900 미만)은 가운데에
 * 놓고 카드를 사진 안으로 들이며, 선택 수 카드는 한 줄 칩으로 줄인다.
 */

import Image from "next/image";
import { PinMark, RatingBar } from "./PhotoMarks";
import { Reveal } from "./Reveal";
import { FocusFrame } from "./Viewfinder";
import { sampleThumbUrl } from "./shots/samplePhotos";

/** 선택 수 카드의 썸네일 — 고른 사진 몇 장 */
const PICKED = [178, 187, 231, 238];

export function HeroPhoto() {
  return (
    <div className="relative aspect-4/5 w-110 shrink-0 max-[900px]:mx-auto max-[900px]:w-full max-[900px]:max-w-110">
      <div className="absolute inset-0 overflow-hidden rounded-(--radius-24) bg-brand-accent-surface">
        {/* 첫 화면에 바로 보이는 사진이라 미루지 않고 먼저 받는다(loading eager · fetchPriority high) */}
        <Image
          src="/images/hero-wedding.jpg"
          alt="웨딩드레스와 정장을 입고 손을 잡은 채 웃고 있는 신랑 신부"
          fill
          sizes="(max-width: 900px) 100vw, 440px"
          loading="eager"
          fetchPriority="high"
          className="object-cover"
        />
      </div>

      <Reveal seq className="absolute inset-0">
        <div aria-hidden>
          <FocusFrame rect={{ x: 30, y: 5, w: 46, h: 30 }} seq={250} />
          <span data-seq={450} className="seq-pop absolute top-[16%] left-[39%] -mt-3.5 -ml-3.5">
            <PinMark n={1} />
          </span>

          <div
            data-seq={650}
            className="seq-slide-up absolute top-[43%] -right-11 z-4 flex w-56 gap-2.5 rounded-(--radius-16) bg-background-default-main px-3.5 py-3 shadow-(--shadow-modal) max-[900px]:top-auto max-[900px]:right-3 max-[900px]:bottom-30 max-[900px]:w-auto max-[900px]:max-w-[76%]"
          >
            <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-brand-accent-default text-xs font-bold text-brand-on-fill">1</span>
            <span className="min-w-0">
              <b className="block type-label-semibold-s text-contents-light-bgd-default">핀 1</b>
              <span className="mt-0.5 block type-content-m text-contents-light-bgd-sub">잔머리 정리해 주세요</span>
            </span>
          </div>

          <div
            data-seq={800}
            className="seq-slide-up absolute bottom-25 -left-12 z-4 w-59 rounded-(--radius-16) bg-background-default-main px-4 py-3.5 shadow-(--shadow-modal) max-[900px]:bottom-17 max-[900px]:left-3 max-[900px]:w-auto max-[900px]:rounded-(--pill) max-[900px]:py-2"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="type-label-medium-s text-contents-light-bgd-weakness">선택한 사진</span>
              <b className="type-title-xl text-contents-light-bgd-default tabular-nums max-[900px]:text-lg!">
                34 <span className="type-label-medium-m text-contents-light-bgd-weakness">/ 50</span>
              </b>
            </span>
            <span className="mt-2.5 block h-1.5 overflow-hidden rounded-(--pill) bg-brand-accent-surface max-[900px]:hidden">
              <i className="block h-full w-[68%] rounded-(--pill) bg-brand-accent-default" />
            </span>
            <span className="mt-2.5 flex gap-1.25 max-[900px]:hidden">
              {PICKED.map((id) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={id} src={sampleThumbUrl(id)} alt="" className="h-10.5 w-7.5 rounded-(--radius-4) object-cover" />
              ))}
            </span>
          </div>

          <span data-seq={950} className="seq-slide-up absolute bottom-6 left-1/2 z-4 -translate-x-1/2 max-[900px]:bottom-3.5">
            <RatingBar score={4} />
          </span>
        </div>
      </Reveal>
    </div>
  );
}
