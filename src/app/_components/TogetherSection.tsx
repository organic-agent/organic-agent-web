"use client";

/**
 * 랜딩 함께 고르기 — 가족 의견은 사진마다(이슈 182, 시안 D 5)
 * 위치: src/app/_components/TogetherSection.tsx
 *
 * 왼쪽 글, 오른쪽 공유폴더 카드(사진마다 좋아요 · 댓글)와 그 아래 파트너 알림.
 * 파트너는 같은 갤러리에서 함께 고른다 — 실시간 커서는 없고, 상대가 담거나 뺀 사진이 강조 · 스낵바로 온다(SelectStage
 * partnerSnack, "준호가 n장을 담았어요"). 그래서 알림은 제품의 Snackbar(info)를 그대로 쓴다. 가족 · 지인은 공유 링크로 들어와
 * 가입 없이 좋아요 · 댓글을 남긴다. 그림은 aria-hidden — 내용은 제목 · 설명이 말한다.
 */

import { Snackbar } from "@/components/app/Snackbar";
import { LinkIcon } from "@/components/icons";
import { Band } from "./Band";
import { CommentChip, Initial, LikeChip, type MarkTone } from "./PhotoMarks";
import { Reveal } from "./Reveal";
import { sampleThumbUrl } from "./shots/samplePhotos";

const PEOPLE: [string, MarkTone][] = [
  ["지", "a"],
  ["준", "b"],
  ["엄", "c"],
  ["언", "d"],
];

/** 댓글은 사진 칸 밖으로도 나온다(좁은 화면에서 잘리지 않게) — 오른쪽 칸은 오른쪽 끝에 맞춰 왼쪽으로, 나머지는 오른쪽으로 */
const TILES: { id: number; likes: number; comment?: { who: string; tone: MarkTone; text: string; edge: "start" | "end" } }[] = [
  { id: 178, likes: 3 },
  { id: 182, likes: 1 },
  { id: 187, likes: 4, comment: { who: "엄", tone: "c", text: "이게 제일 예쁘다", edge: "end" } },
  { id: 190, likes: 0 },
  { id: 231, likes: 2, comment: { who: "언", tone: "d", text: "드레스 최고야", edge: "start" } },
  { id: 238, likes: 5 },
];

export function TogetherSection() {
  return (
    <Band
      tone="tint"
      labelledBy="together-h"
      className="grid grid-cols-[5fr_6.4fr] items-center gap-18 py-28 max-[900px]:grid-cols-1 max-[900px]:gap-8 max-[640px]:py-18"
    >
      <div className="flex flex-col items-start gap-5">
        <Reveal as="p" variant="blur" className="type-label-eyebrow text-brand-accent-default">
          Together
        </Reveal>
        <Reveal as="h2" variant="blur" delay={1} className="type-maintext-l text-contents-light-bgd-default max-[640px]:text-[28px]! max-[640px]:leading-[1.3]!">
          <span id="together-h">
            가족 의견은
            <br />
            <span className="text-brand-accent-default">사진마다</span> 모입니다
          </span>
        </Reveal>
        <Reveal as="p" variant="blur" delay={2} className="type-content-xl text-contents-light-bgd-sub max-[640px]:text-base!">
          파트너는 같은 갤러리에 초대해 함께 고르고, 가족 · 지인은 공유 링크로 들어와 사진마다 좋아요와 댓글을 남깁니다.
          공유 링크는 가입 없이 열립니다.
        </Reveal>
      </div>

      <Reveal variant="rise" delay={2} className="relative pb-7">
        <div aria-hidden className="rounded-(--radius-24) bg-background-default-main p-4.5 shadow-(--shadow-modal)">
          <div className="flex items-center gap-2.5 px-1 pb-3.5">
            <span className="min-w-0 flex-1 truncate type-label-semibold-m text-contents-light-bgd-default">
              공유폴더 · 가족이랑 볼 사진
              <span className="ml-1.5 type-label-medium-s text-contents-light-bgd-weakness">6장</span>
            </span>
            <span className="flex -space-x-1.5 max-[640px]:hidden">
              {PEOPLE.map(([who, tone]) => (
                <span key={who} className="rounded-full ring-2 ring-background-default-main">
                  <Initial tone={tone}>{who}</Initial>
                </span>
              ))}
            </span>
            <span className="inline-flex h-7.5 shrink-0 items-center gap-1 rounded-(--pill) border border-border-default px-2.5 type-label-medium-xs text-contents-light-bgd-default">
              <LinkIcon size={16} />
              <span className="max-[640px]:hidden">링크 복사</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TILES.map((t) => (
              <div key={t.id} className="relative aspect-2/3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sampleThumbUrl(t.id)} alt="" loading="lazy" className="size-full rounded-(--radius-8) bg-surface-default-light object-cover" />
                {t.comment && (
                  <CommentChip
                    who={t.comment.who}
                    tone={t.comment.tone}
                    className={`absolute bottom-9.5 z-1 max-w-none! ${t.comment.edge === "end" ? "right-2" : "left-2"}`}
                  >
                    {t.comment.text}
                  </CommentChip>
                )}
                {t.likes > 0 && <LikeChip count={t.likes} className="absolute bottom-2 left-2" />}
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <Snackbar kind="info">준호가 2장을 담았어요</Snackbar>
        </div>
      </Reveal>
    </Band>
  );
}
