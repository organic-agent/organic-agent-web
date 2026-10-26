"use client";

/**
 * 랜딩 — 사용 흐름 4단계(이슈 144, 2026-10-26)
 * 위치: src/app/_components/FlowSection.tsx
 *
 * 아이콘 카드 6장 대신 사진 업로드 → 컨셉 분류 → 사진 셀렉 → 보정 요청 작성을 단계마다 한 화면씩 보여 준다(토스 홈 방식).
 * 스크롤해 들어오면 아이브로우 · 제목(줄 단위) · 부제가 차례로 떠오르고 화면이 아래서 올라온 뒤, 화면 안 동작 하나가
 * 한 번 일어난다(Reveal seq). 바탕은 랜딩 전체와 같은 흰색(2026-10-26 수민 — 번갈아 쓰던 연회색은 뺌). 화면 4장은 shots/ 부품이
 * 맡는다 — 지금은 자리만.
 */

import { Reveal } from "./Reveal";

type Step = {
  n: string;
  label: string;
  /** 제목 — 줄마다 차례로 떠오른다 */
  title: string[];
  desc: string;
};

const STEPS: Step[] = [
  { n: "01", label: "사진 업로드", title: ["원본을 끌어다 놓으면", "끝."], desc: "한 번에 500장. 올리는 동안 AI가 비슷한 컷을 묶습니다." },
  { n: "02", label: "컨셉 분류", title: ["AI가 컨셉별 폴더로", "나눕니다."], desc: "전신 · 상반신 · 클로즈업 · 풍경. 폴더는 고치고 합칠 수 있습니다." },
  { n: "03", label: "사진 셀렉", title: ["둘이서, 가족과,", "함께 고릅니다."], desc: "체크로 고르고, 별점으로 추리고, 공유 링크로 가족의 좋아요를 모읍니다." },
  { n: "04", label: "보정 요청 작성", title: ["사진 위에", "바로 보정 요청."], desc: "점을 찍고 한 줄. 요청만 요청서에 실립니다." },
];

export function FlowSection() {
  return (
    <section id="flow" aria-label="사용 흐름">
      {STEPS.map((step) => (
        <div
          key={step.n}
          className="bg-background-default-main border-b border-divider-default overflow-hidden"
        >
          <div className="max-w-wrap mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center gap-5 max-[820px]:pt-16 max-[820px]:pb-12">
            <Reveal as="p" variant="blur" className="type-label-eyebrow text-brand-secondary-default">
              {step.n} · {step.label}
            </Reveal>
            <Reveal as="h2" variant="lines" lines={step.title} delay={1} className="type-maintext-s text-contents-light-bgd-default" />
            <Reveal as="p" variant="blur" delay={3} className="type-content-l text-contents-light-bgd-sub max-w-140">
              {step.desc}
            </Reveal>
            <Reveal variant="rise" delay={4} seq className="mt-8 w-full flex justify-center">
              <div className="w-full max-w-250 aspect-[1000/560] rounded-(--radius-12) border border-border-light bg-background-default-main shadow-(--shadow-modal) overflow-hidden" />
            </Reveal>
          </div>
        </div>
      ))}
    </section>
  );
}
