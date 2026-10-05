"use client";

/**
 * 싱글뷰 "정보" 탭 — 칩(AI 추천) · 별점 · 이 기기에서 본 횟수 · 우리끼리 메모
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PhotoInfoPanel.tsx
 *
 * 메모는 작가에게 보이지 않아야 해서(2026-09-12) 지금은 브라우저에만 저장한다(clientMemory). 서버 "내부 사진 댓글"의
 * 열람 범위를 확인한 뒤 저장 방식을 정한다(노션 ② 미결). 열람 횟수도 같은 이유로 이 기기 기준.
 */

import { type ReactNode, useSyncExternalStore } from "react";
import { SparkleIcon, StarFillIcon, StarIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";
import { memoStore, viewedStore, writeMemo } from "./clientMemory";

export function PhotoInfoPanel({
  galleryId,
  photo,
  score,
  editable,
  aiPicked = false,
  onRate,
}: {
  galleryId: number;
  photo: PhotoResponse;
  score: number | null;
  editable: boolean;
  /** 이번 AI 추천에 든 사진인가(셀렉 화면만 준다) */
  aiPicked?: boolean;
  onRate: (score: number | null) => void;
}) {
  const memoRaw = useSyncExternalStore(memoStore.subscribe, () => memoStore.readRaw(galleryId), () => "");
  const memo = memoStore.parse(memoRaw)[String(photo.photoId)] ?? "";
  const viewedRaw = useSyncExternalStore(viewedStore.subscribe, () => viewedStore.readRaw(galleryId), () => "");
  const viewed = viewedStore.parse(viewedRaw)[String(photo.photoId)] ?? 0;

  return (
    <>
      {aiPicked && (
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="ai">
            <SparkleIcon size={14} />
            AI 추천
          </Chip>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h4 className="type-label-semibold-xs text-contents-light-bgd-weakness">
          별점 <span className="font-normal">· 함께 매기는 별점</span>
        </h4>
        <div role="radiogroup" aria-label="별점" className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = score !== null && n <= score;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                aria-label={`별점 ${n}`}
                disabled={!editable}
                onClick={() => onRate(score === n ? null : n)}
                className={`grid size-7 place-items-center rounded-full transition-colors duration-fast ${
                  editable ? "cursor-pointer hover:bg-surface-default-lightness" : "cursor-default"
                } ${on ? "text-brand-secondary-default" : "text-border-default"}`}
              >
                {on ? <StarFillIcon size={22} /> : <StarIcon size={22} />}
              </button>
            );
          })}
          {score !== null && <span className="ml-1 type-content-xs text-contents-light-bgd-weakness">{score} / 5</span>}
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <h4 className="type-label-semibold-xs text-contents-light-bgd-weakness">파일</h4>
        <dl className="flex flex-col gap-1 type-content-s">
          <Row label="봤어요" value={viewed > 0 ? `${viewed}번 · 이 기기에서` : "처음이에요"} />
        </dl>
      </section>

      <section className="flex flex-col gap-1.5">
        <h4 className="type-label-semibold-xs text-contents-light-bgd-weakness">우리끼리 메모</h4>
        <textarea
          value={memo}
          onChange={(e) => writeMemo(galleryId, photo.photoId, e.target.value)}
          placeholder="작가에게는 보이지 않아요"
          rows={3}
          className="w-full resize-none rounded-(--radius-8) border border-border-default bg-transparent px-2.5 py-2 type-content-s text-contents-light-bgd-default placeholder:text-contents-light-bgd-weakness focus:border-contents-light-bgd-sub focus:outline-none"
        />
        <p className="type-content-xs text-contents-light-bgd-weakness">지금은 이 기기에만 저장돼요.</p>
      </section>
    </>
  );
}

// 연한 칩 — 색을 옅게 깐 바탕에 같은 색의 진한 글자 (2026-10-05 시안)
const CHIP_TONE = {
  ai: "bg-brand-secondary-default/14 text-[color:color-mix(in_srgb,var(--brand-secondary-default)_68%,var(--background-inverse-main))]",
};

function Chip({ tone, children }: { tone: keyof typeof CHIP_TONE; children: ReactNode }) {
  return <span className={`inline-flex h-7 items-center gap-1 rounded-(--pill) px-2.5 type-label-semibold-s whitespace-nowrap ${CHIP_TONE[tone]}`}>{children}</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-contents-light-bgd-sub">{label}</dt>
      <dd className="truncate text-right font-medium text-contents-light-bgd-default">{value}</dd>
    </div>
  );
}
