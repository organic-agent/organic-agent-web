"use client";

/**
 * 셀렉 필터 — 묶음 4개(선택 여부 · 별점 · 게스트 좋아요 · AI 추천)를 한 패널에서 걸고, 칩 줄로 보여 준다(이슈 149, 2026-10-30 시안 7판)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/SelectFilter.tsx
 *
 * 묶음끼리는 AND — 겹쳐 걸 수 있다. 별점은 여러 점수를 같이(별점 없음 포함), 게스트 좋아요 · AI 추천은 켜고 끄기.
 * 정렬 메뉴는 없다 — 그리드는 늘 점수 묶음(★5 → ★1 → 별점 없음)이고 묶음 안은 업로드 순. 받은 목록을 화면에서 거르고,
 * 폴더를 바꿔도 남고 새로고침하면 풀린다(저장 안 함, 이슈 130과 같은 방식).
 * 헤더 버튼은 조건이 하나라도 걸리면 연보라 채움 + 보라 테두리(다크는 보라 틴트 + 흰 글자)로 바뀐다 — 숫자 배지 없음.
 * 패널 안 장수는 보는 폴더 기준이고, 다른 묶음의 조건은 적용한 채로 센다(이 줄을 고르면 몇 장이 되는지).
 * 컨셉 분류(정리 모드)는 scoresOnly로 별점 묶음만 쓴다 — 그 화면의 체크박스는 옮기기 · 지우기용이라 "선택 여부"와 섞이지 않게(이슈 156).
 */

import { useEffect, useRef, useState } from "react";
import { CloseIcon, FilterIcon, StarFillIcon, StarIcon } from "@/components/icons";
import { Checkbox } from "@/components/ui/Checkbox";
import { Toggle } from "@/components/ui/Toggle";
import type { PhotoResponse } from "@/lib/api/photos";

export type PickCondition = "all" | "picked" | "unpicked";
export type SelectConditions = {
  pick: PickCondition;
  /** 고른 점수(0 = 별점 없음) — 비어 있으면 조건 없음 */
  scores: ReadonlySet<number>;
  /** 게스트 좋아요가 하나라도 있는 사진만 */
  guest: boolean;
  /** 이번 라운드 AI 추천만 */
  ai: boolean;
};
export const EMPTY_CONDITIONS: SelectConditions = { pick: "all", scores: new Set(), guest: false, ai: false };

const PICK_LABEL: Record<PickCondition, string> = { all: "전체", picked: "선택함", unpicked: "선택 안 함" };
/** 별점 묶음의 순서 — 패널 줄 · 칩 글자가 같이 쓴다 */
const SCORE_ROWS = [5, 4, 3, 2, 1, 0];

export function activeGroupCount(c: SelectConditions): number {
  return (c.pick !== "all" ? 1 : 0) + (c.scores.size > 0 ? 1 : 0) + (c.guest ? 1 : 0) + (c.ai ? 1 : 0);
}
/** 별점 조건을 글자로 — "★5 ★4 별점 없음" */
export function scoresLabel(scores: ReadonlySet<number>): string {
  return SCORE_ROWS.filter((s) => scores.has(s)).map((s) => (s === 0 ? "별점 없음" : `★${s}`)).join(" ");
}
/** 걸린 조건을 가운뎃점으로 이은 요약 — 칩 줄 · 공유폴더 "지금 보는 사진"의 설명 · 이벤트 */
export function conditionsSummary(c: SelectConditions): string {
  const parts: string[] = [];
  if (c.pick !== "all") parts.push(PICK_LABEL[c.pick]);
  if (c.scores.size > 0) parts.push(scoresLabel(c.scores));
  if (c.guest) parts.push("게스트 좋아요");
  if (c.ai) parts.push("AI 추천");
  return parts.join(" · ");
}

export type ConditionContext = {
  pickedIds: ReadonlySet<number>;
  likesByPhoto: ReadonlyMap<number, number>;
  aiIds: ReadonlySet<number>;
};
function scoreKey(photo: PhotoResponse): number {
  return photo.score ?? 0;
}
function matchesPick(photo: PhotoResponse, pick: PickCondition, ctx: ConditionContext): boolean {
  return pick === "all" || (pick === "picked") === ctx.pickedIds.has(photo.photoId);
}
function matchesGuest(photo: PhotoResponse, on: boolean, ctx: ConditionContext): boolean {
  return !on || (ctx.likesByPhoto.get(photo.photoId) ?? 0) > 0;
}
function matchesAi(photo: PhotoResponse, on: boolean, ctx: ConditionContext): boolean {
  return !on || ctx.aiIds.has(photo.photoId);
}
export function matchesConditions(photo: PhotoResponse, c: SelectConditions, ctx: ConditionContext): boolean {
  return (
    matchesPick(photo, c.pick, ctx) &&
    (c.scores.size === 0 || c.scores.has(scoreKey(photo))) &&
    matchesGuest(photo, c.guest, ctx) &&
    matchesAi(photo, c.ai, ctx)
  );
}

/** 별 다섯 개(채움 = 점수) — 점수 묶음 머리글 · 필터 패널 · 공유폴더 모달이 같이 쓴다 */
export function ScoreStars({ score, size = 14 }: { score: number; size?: number }) {
  return (
    <span className="flex text-brand-secondary-default" aria-label={`별점 ${score}`}>
      {[1, 2, 3, 4, 5].map((n) => (n <= score ? <StarFillIcon key={n} size={size} /> : <StarIcon key={n} size={size} className="text-border-default" />))}
    </span>
  );
}

const ROW_CLASS = "flex h-8 cursor-pointer items-center gap-2 rounded-(--radius-4) px-1.5 type-content-s text-contents-light-bgd-default hover:bg-surface-default-lightness";
const COUNT_CLASS = "ml-auto type-content-xs text-contents-light-bgd-weakness tabular-nums";

/** 헤더 오른쪽 끝의 "필터" 버튼 + 패널 */
export function SelectFilterButton({
  conditions,
  onChange,
  photos,
  context,
  visibleCount,
  scoresOnly = false,
}: {
  conditions: SelectConditions;
  onChange: (next: SelectConditions) => void;
  /** 별점 묶음만 — 컨셉 분류(정리 모드) */
  scoresOnly?: boolean;
  /** 보는 폴더의 사진 — 패널 장수의 분모 */
  photos: PhotoResponse[];
  context: ConditionContext;
  /** 지금 조건으로 보이는 장수 */
  visibleCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = activeGroupCount(conditions) > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 줄마다 "이걸 고르면 몇 장" — 그 묶음만 빼고 나머지 조건을 적용해 센다
  const countScore = (s: number) =>
    photos.filter((p) => scoreKey(p) === s && matchesPick(p, conditions.pick, context) && matchesGuest(p, conditions.guest, context) && matchesAi(p, conditions.ai, context)).length;
  const guestCount = photos.filter((p) => matchesGuest(p, true, context) && matchesPick(p, conditions.pick, context) && (conditions.scores.size === 0 || conditions.scores.has(scoreKey(p))) && matchesAi(p, conditions.ai, context)).length;
  const aiCount = photos.filter((p) => matchesAi(p, true, context) && matchesPick(p, conditions.pick, context) && (conditions.scores.size === 0 || conditions.scores.has(scoreKey(p))) && matchesGuest(p, conditions.guest, context)).length;

  function toggleScore(s: number) {
    const next = new Set(conditions.scores);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({ ...conditions, scores: next });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={active ? `필터 · ${conditionsSummary(conditions)}` : "필터"}
        title={active ? conditionsSummary(conditions) : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-(--radius-8) px-3 whitespace-nowrap type-content-s transition-colors duration-fast max-sm:px-2.25 ${
          active
            ? "bg-brand-chip-background font-semibold text-brand-chip-text ring-1 ring-inset ring-brand-accent-default dark:bg-brand-step-background dark:text-brand-on-fill"
            : "bg-surface-default-light text-contents-light-bgd-default hover:bg-surface-default-medium"
        }`}
      >
        <span className={`flex ${active ? "" : "text-contents-light-bgd-sub"}`}>
          <FilterIcon size={18} />
        </span>
        <span className="max-sm:hidden">필터</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="필터"
          className="absolute top-full right-0 z-20 mt-1 flex w-72 flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1.5 shadow-(--shadow-hover)"
        >
          {!scoresOnly && <div className="px-1 pt-1 pb-2">
            <p className="px-1 pb-1.5 type-label-semibold-xs text-contents-light-bgd-weakness">선택 여부</p>
            <div role="radiogroup" aria-label="선택 여부" className="grid grid-cols-3 gap-0.5 rounded-(--radius-8) bg-surface-default-light p-0.5">
              {(Object.keys(PICK_LABEL) as PickCondition[]).map((key) => {
                const on = conditions.pick === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onChange({ ...conditions, pick: key })}
                    className={`h-7 cursor-pointer rounded-(--radius-4) type-content-xs transition-colors duration-fast ${
                      on ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-(--shadow-hover)" : "text-contents-light-bgd-sub hover:text-contents-light-bgd-default"
                    }`}
                  >
                    {PICK_LABEL[key]}
                  </button>
                );
              })}
            </div>
          </div>}
          <div className={`px-1 pt-1.5 pb-1 ${scoresOnly ? "" : "border-t border-divider-default"}`}>
            <p className="px-1 pb-0.5 type-label-semibold-xs text-contents-light-bgd-weakness">별점</p>
            {SCORE_ROWS.map((s) => (
              <label key={s} className={ROW_CLASS}>
                <Checkbox checked={conditions.scores.has(s)} onChange={() => toggleScore(s)} />
                {s === 0 ? <span className="text-contents-light-bgd-sub">별점 없음</span> : <ScoreStars score={s} />}
                <span className={COUNT_CLASS}>{countScore(s)}</span>
              </label>
            ))}
          </div>
          {!scoresOnly && <div className="border-t border-divider-default px-1 pt-1.5 pb-1">
            <label className={ROW_CLASS}>
              <Toggle checked={conditions.guest} onChange={(v) => onChange({ ...conditions, guest: v })} aria-label="게스트 좋아요 있는 사진만" />
              게스트 좋아요 있는 사진만
              <span className={COUNT_CLASS}>{guestCount}</span>
            </label>
            <label className={ROW_CLASS}>
              <Toggle checked={conditions.ai} onChange={(v) => onChange({ ...conditions, ai: v })} aria-label="AI 추천만" />
              AI 추천만
              <span className={COUNT_CLASS}>{aiCount}</span>
            </label>
          </div>}
          <div className="flex items-center justify-between border-t border-divider-default px-2.5 pt-2 pb-1 type-content-xs text-contents-light-bgd-sub">
            <span>
              <b className="font-semibold text-contents-light-bgd-default tabular-nums">{visibleCount}장</b> 보기
            </span>
            <button
              type="button"
              disabled={!active}
              onClick={() => onChange(EMPTY_CONDITIONS)}
              className="cursor-pointer text-contents-light-bgd-sub underline underline-offset-2 hover:text-contents-light-bgd-default disabled:cursor-default disabled:text-contents-light-bgd-disabled disabled:no-underline"
            >
              조건 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 헤더 아래 칩 줄 — 묶음마다 칩 하나(× 로 그 묶음만 풀기) + 조건 해제 + 장수. 조건이 없으면 아무것도 안 그린다 */
export function SelectFilterChips({
  conditions,
  onChange,
  visibleCount,
}: {
  conditions: SelectConditions;
  onChange: (next: SelectConditions) => void;
  visibleCount: number;
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (conditions.pick !== "all") chips.push({ key: "pick", label: PICK_LABEL[conditions.pick], clear: () => onChange({ ...conditions, pick: "all" }) });
  if (conditions.scores.size > 0) chips.push({ key: "score", label: scoresLabel(conditions.scores), clear: () => onChange({ ...conditions, scores: new Set() }) });
  if (conditions.guest) chips.push({ key: "guest", label: "게스트 좋아요", clear: () => onChange({ ...conditions, guest: false }) });
  if (conditions.ai) chips.push({ key: "ai", label: "AI 추천", clear: () => onChange({ ...conditions, ai: false }) });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-5 pb-2 max-[480px]:px-3">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex h-7 items-center gap-1 rounded-(--pill) bg-brand-chip-background pr-1 pl-2.5 type-label-semibold-xs text-brand-chip-text">
          {chip.label}
          <button type="button" aria-label={`${chip.label} 조건 풀기`} onClick={chip.clear} className="grid size-5 cursor-pointer place-items-center rounded-full transition-colors duration-fast hover:bg-brand-accent-surface">
            <CloseIcon size={12} />
          </button>
        </span>
      ))}
      <button type="button" onClick={() => onChange(EMPTY_CONDITIONS)} className="ml-1 cursor-pointer type-content-xs text-contents-light-bgd-sub underline underline-offset-2 hover:text-contents-light-bgd-default">
        조건 해제
      </button>
      <span className="ml-auto type-content-xs text-contents-light-bgd-weakness tabular-nums">{visibleCount}장</span>
    </div>
  );
}
