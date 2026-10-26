"use client";

/**
 * 랜딩 — 사용 흐름 4단계(이슈 144, 2026-10-26)
 * 위치: src/app/_components/FlowSection.tsx
 *
 * 아이콘 카드 6장 대신 사진 업로드 → 컨셉 분류 → 사진 셀렉 → 보정 요청 작성을 단계마다 한 화면씩 보여 준다(토스 홈 방식).
 * 스크롤해 들어오면 아이브로우 · 제목(줄 단위) · 부제가 차례로 떠오르고 화면이 아래서 올라온 뒤, 화면 안 동작 하나가
 * 한 번 일어난다(Reveal seq). 바탕은 랜딩 전체와 같은 흰색(2026-10-26 수민 — 번갈아 쓰던 연회색은 뺌). 화면 4장은 shots/ 부품이
 * 맡는다 — 01 업로드부터 채우는 중.
 */

import type { ReactNode } from "react";
import { Band } from "./Band";
import { Reveal } from "./Reveal";
import { UploadShot } from "./shots/UploadShot";

type Step = {
  n: string;
  label: string;
  /** 제목 — 줄마다 차례로 떠오른다(지금은 한 줄) */
  title: string[];
  /** 설명 — 여러 줄이면 줄마다 <br>로 끊는다 */
  desc: string[];
  /** 화면(shots/) — 없으면 빈 상자 자리 */
  shot?: ReactNode;
};

// 문구는 2026-10-26 수민 — 제목은 한 줄 명사형, 설명은 두 문장
const STEPS: Step[] = [
  { n: "01", label: "사진 업로드", title: ["원본을 그대로 업로드"], desc: ["여러 장을 한 번에 끌어다 업로드합니다. 업로드되는 동안 AI가 비슷한 컨셉끼리 분류합니다."], shot: <UploadShot /> },
  { n: "02", label: "컨셉 분류", title: ["AI로 컨셉별 폴더 나누기"], desc: ["비슷한 사진끼리 폴더로 묶입니다. 폴더는 수정, 변형이 가능합니다."] },
  { n: "03", label: "사진 셀렉", title: ["별점으로 빠르게 셀렉"], desc: ["별점을 매겨 후보를 추리고 마음에 드는 사진을 선택합니다.", "파트너를 초대하고, 공유 링크로 가족의 좋아요와 댓글을 모읍니다."] },
  { n: "04", label: "보정 요청 작성", title: ["사진 위에 점을 찍어 보정 요청"], desc: ["고칠 곳을 누르고 한 줄 적으면 요청서로 정리됩니다. 선택한 사진의 요청만 담깁니다."] },
];

export function FlowSection() {
  return (
    <div id="flow" role="region" aria-label="사용 흐름">
      {STEPS.map((step) => (
        <Band
          key={step.n}
          className="pt-24 pb-16 flex flex-col items-center text-center gap-5 overflow-hidden max-[820px]:pt-16 max-[820px]:pb-12"
        >
            <Reveal as="p" variant="blur" className="type-label-eyebrow text-brand-secondary-default">
              {step.n} · {step.label}
            </Reveal>
            <Reveal as="h2" variant="lines" lines={step.title} delay={1} className="type-maintext-s text-contents-light-bgd-default" />
            <Reveal as="p" variant="blur" delay={3} className="type-content-l text-contents-light-bgd-sub max-w-140">
              {step.desc.map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </Reveal>
            <Reveal variant="rise" delay={4} seq className="mt-8 w-full flex justify-center">
              {step.shot ?? (
                <div className="w-full max-w-250 aspect-[1000/560] rounded-(--radius-12) border border-border-light bg-background-default-main shadow-(--shadow-modal) overflow-hidden" />
              )}
            </Reveal>
        </Band>
      ))}
    </div>
  );
}
