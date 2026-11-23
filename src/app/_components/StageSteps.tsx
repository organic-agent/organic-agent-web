/**
 * 랜딩 흐름 머리 — 제품 상단의 단계 표시를 그대로(이슈 182)
 * 위치: src/app/_components/StageSteps.tsx
 *
 * 구역마다 "01 · 사진 업로드" 대신 앱 상단 바의 단계 pill(ShotTopbar와 같은 단계 · 같은 모양)을 두어 지금 어느 단계인지 보인다.
 * 지난 단계는 sub 글자, 지금 단계는 칩, 남은 단계는 흐리게. 좁은 화면은 지금 단계와 "n / 5"만.
 * tone="dark"는 셀렉 구역(어두운 띠)용.
 */

import { SHOT_STAGES } from "./shots/ShotChrome";

export function StageSteps({ index, tone = "light" }: { index: number; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <ol
      aria-label={`${SHOT_STAGES[index]} 단계`}
      className={`inline-flex items-center gap-0.5 rounded-(--pill) p-0.75 ${dark ? "bg-surface-inverse-light" : "bg-surface-default-light"}`}
    >
      {SHOT_STAGES.map((name, i) => (
        <li
          key={name}
          className={`rounded-(--pill) px-3 py-1 whitespace-nowrap type-label-medium-s ${
            i === index
              ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-(--shadow-hover)"
              : `max-[640px]:hidden ${
                  i < index
                    ? dark
                      ? "text-contents-dark-bgd-sub"
                      : "text-contents-light-bgd-sub"
                    : dark
                      ? "text-contents-dark-bgd-weakness"
                      : "text-contents-light-bgd-weakness"
                }`
          }`}
        >
          {name}
        </li>
      ))}
      <li
        aria-hidden
        className={`hidden px-2 type-label-medium-xs tabular-nums max-[640px]:block ${dark ? "text-contents-dark-bgd-weakness" : "text-contents-light-bgd-weakness"}`}
      >
        {index + 1} / {SHOT_STAGES.length}
      </li>
    </ol>
  );
}
