/**
 * 랜딩 대상 카드 위 그림(이슈 182, 시안 D 6)
 * 위치: src/app/_components/AudienceArt.tsx
 *
 * 스튜디오 카드: 갤러리 여러 개가 단계 · 디데이와 함께 한 목록에 — "여러 갤러리를 하나의 작업 공간에서"를 그림으로.
 * (화면 캡처는 카드 크기에서 글자가 읽히지 않아 목록으로 그린다.) 개인 카드: 웨딩 사진 + 파트너와 함께 고르는 칩.
 * 둘 다 그림이라 aria-hidden. 높이는 카드가 정한다(h-full).
 */

import Image from "next/image";
import { Initial } from "./PhotoMarks";
import { samplePhotoUrl, sampleThumbUrl } from "./shots/samplePhotos";

const GALLERIES = [
  { id: 231, name: "민지 · 준호", stage: "셀렉 34/50", dday: "D-12" },
  { id: 109, name: "서연 · 도윤", stage: "보정 확인", dday: "D-5" },
  { id: 26, name: "하은 가족", stage: "컨셉 분류", dday: "D-21" },
];

export function StudioArt() {
  return (
    <div aria-hidden className="flex h-full flex-col justify-center gap-2.5 bg-brand-secondary-background/55 px-5.5 py-4.5">
      {GALLERIES.map((g) => (
        <div key={g.id} className="flex items-center gap-3 rounded-(--radius-12) bg-background-default-main px-3 py-2.5 shadow-(--shadow-hover)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sampleThumbUrl(g.id)} alt="" loading="lazy" className="size-9.5 shrink-0 rounded-(--radius-8) object-cover" />
          <b className="min-w-0 flex-1 truncate type-label-semibold-s text-contents-light-bgd-default">{g.name}</b>
          <span className="shrink-0 rounded-(--pill) bg-brand-chip-background px-2.5 py-1 type-label-semibold-xs whitespace-nowrap text-brand-chip-text">{g.stage}</span>
          <span className="w-9 shrink-0 text-right type-label-medium-xs text-contents-light-bgd-weakness tabular-nums">{g.dday}</span>
        </div>
      ))}
    </div>
  );
}

export function PersonalArt() {
  return (
    <div aria-hidden className="relative h-full">
      <Image src={samplePhotoUrl(231)} alt="" fill sizes="(max-width: 720px) 100vw, 520px" className="object-cover object-[50%_16%]" />
      <span className="absolute bottom-4 left-4 inline-flex h-9 items-center gap-2 rounded-(--pill) bg-background-default-main pr-3.5 pl-1.5 type-label-semibold-s text-contents-light-bgd-default shadow-(--shadow-hover)">
        <span className="flex -space-x-1.5">
          <Initial tone="a" small>
            지
          </Initial>
          <Initial tone="b" small>
            준
          </Initial>
        </span>
        파트너와 함께
      </span>
    </div>
  );
}
