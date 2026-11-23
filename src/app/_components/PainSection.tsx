"use client";

/**
 * 랜딩 문제 제기 — 단톡방 한 창 ↔ 사진 한 장(이슈 182, 시안 D 3)
 * 위치: src/app/_components/PainSection.tsx
 *
 * 왼쪽은 지금의 셀렉(파일 번호로 묻고, 단톡방에 의견이 흩어지고, 보정할 곳을 글로 설명), 오른쪽은 같은 일을 사진 한 장 위에서 —
 * 체크 · 별점, 가족 댓글 · 좋아요, 핀 · 보정 요청이 모두 사진에 붙는다. 랜딩 전체 개념 "모든 셀렉은 사진 위에서"를 여기서 말한다.
 * 시안 검수: 3열 말풍선 카드는 레퍼런스(heymoa) 구도와 같아 한 창 ↔ 한 장으로 바꿈. 표시 위치는 사진 187 · 4:3 · 위 20% 맞춤 기준.
 */

import Image from "next/image";
import { BrushIcon, CommentIcon, HeartIcon, StarIcon } from "@/components/icons";
import { Band } from "./Band";
import { CommentChip, LikeChip, PinMark, RatingBar, RequestChip, TileCheck } from "./PhotoMarks";
import { Reveal } from "./Reveal";
import { ViewfinderText } from "./Viewfinder";
import { samplePhotoUrl } from "./shots/samplePhotos";

/** 단톡방 — who가 없으면 내가 보낸 말(오른쪽) */
const MESSAGES = [
  { who: "준호", text: "그래서 몇 번이 제일 좋았어?" },
  { who: "", text: "IMG_0342? 아니 0343이었나" },
  { who: "엄마", text: "엄마는 세 번째 사진이 제일 예쁘더라" },
  { who: "", text: "보정할 곳은 글로 길게 써서 보낼게" },
];

const KEYS = [
  { icon: <StarIcon size={18} />, label: "번호 대신 별점과 체크" },
  { icon: <HeartIcon size={18} />, label: "단톡방 대신 사진에 댓글" },
  { icon: <BrushIcon size={18} />, label: "설명 대신 점 하나" },
];

export function PainSection() {
  return (
    <Band tone="tint" labelledBy="pain-h" className="py-28 max-[640px]:py-18">
      <Reveal className="flex flex-col items-center gap-4 text-center">
        <h2 id="pain-h" className="type-maintext-l text-contents-light-bgd-default max-[640px]:text-[28px]! max-[640px]:leading-[1.3]!">
          번호로 묻고,
          {/* 좁은 화면은 세 줄 — 첫 줄이 길어 "모으고,"만 혼자 떨어지지 않게 */}
          <br className="hidden max-[640px]:inline" /> 단톡방에서 모으고,
          <br />
          글로 설명하던 셀렉
        </h2>
        <p className="type-content-xl text-contents-light-bgd-sub max-[640px]:text-base!">
          이지셀렉에서는 전부 <ViewfinderText>사진 위</ViewfinderText>에서 합니다.
        </p>
      </Reveal>

      <div className="mt-14 grid grid-cols-[1fr_1.15fr] items-center gap-12 max-[820px]:mt-8 max-[820px]:grid-cols-1 max-[820px]:gap-6">
        <Reveal delay={1}>
          <div className="overflow-hidden rounded-(--radius-24) border border-border-light bg-background-default-main">
            <p className="flex items-center gap-2 border-b border-divider-default px-4.5 py-3.5 type-label-semibold-s text-contents-light-bgd-default">
              <CommentIcon size={18} className="text-contents-light-bgd-weakness" />
              우리 가족 단톡방
              <span className="type-label-medium-xs text-contents-light-bgd-weakness">4</span>
            </p>
            <ul className="flex flex-col gap-3 bg-background-default-sub px-4.5 pt-5 pb-6">
              {MESSAGES.map((m) => (
                <li key={m.text} className={`flex max-w-[84%] flex-col gap-1.5 ${m.who ? "items-start" : "items-end self-end"}`}>
                  {m.who && <span className="pl-1 type-label-medium-xs text-contents-light-bgd-weakness">{m.who}</span>}
                  <span
                    className={`px-3.5 py-2.5 type-content-l ${
                      m.who
                        ? "rounded-[16px_16px_16px_5px] border border-border-light bg-background-default-main text-contents-light-bgd-default"
                        : "rounded-[16px_16px_5px_16px] bg-brand-accent-surface text-brand-accent-text"
                    }`}
                  >
                    {m.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="relative aspect-4/3 overflow-hidden rounded-(--radius-24) bg-brand-accent-surface shadow-(--shadow-modal)">
            <Image
              src={samplePhotoUrl(187)}
              alt="서로 기대어 웃는 신랑 신부 사진 위에 체크 · 별점 · 핀 · 댓글이 붙어 있다"
              fill
              sizes="(max-width: 820px) 100vw, 560px"
              className="object-cover object-[50%_20%]"
            />
            <div aria-hidden>
              <TileCheck className="absolute top-3.5 left-3.5" />
              <span className="absolute top-[29%] left-[35%] -mt-3.5 -ml-3.5">
                <PinMark n={1} />
              </span>
              <RequestChip n={1} className="absolute top-[40%] left-[3%]">
                잔머리 정리
              </RequestChip>
              <CommentChip who="엄" tone="c" className="absolute top-[48%] right-3.5">
                이거 액자로 하자!
              </CommentChip>
              <LikeChip count={3} className="absolute bottom-15.5 left-3.5" />
              <RatingBar score={5} label="선택" className="absolute bottom-3 left-1/2 -translate-x-1/2" />
            </div>
          </div>
          <ul className="mt-4.5 flex flex-wrap gap-2">
            {KEYS.map((k) => (
              <li
                key={k.label}
                className="inline-flex h-9.5 items-center gap-1.5 rounded-(--pill) border border-border-light bg-background-default-main px-3.5 type-label-medium-m whitespace-nowrap text-contents-light-bgd-default [&>svg]:text-brand-accent-default"
              >
                {k.icon}
                {k.label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Band>
  );
}
