"use client";

/**
 * 컨셉 수 모달 — 첫 업로드 전에 "컨셉이 몇 개인가요?"를 한 번 묻는다 (이슈 79 · 시안 2026-10-02 수민 확정)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/ConceptCountModal.tsx
 *
 * "사진 업로드"를 누르면 업로드 모달보다 먼저 뜬다 — 사진이 0장일 때만("사진 더 올리기"는 바로 업로드 모달:
 * 추가 분석은 새 사진만 처리해 같은 개수가 맞지 않는다). 값은 서버 갤러리에 저장 칸이 없어 화면이 들고 있다가
 * 업로드가 끝나 분석을 요청할 때 본문으로 보낸다(requestAnalysis).
 * 가운데 − · 숫자 · + 스테퍼, 1~30(서버 검증값 — 범위는 화면에 적지 않는다), 기본값 1. 껍데기 치수는 "고를 장수를
 * 바꿀까요?"(ChangeQuotaModal)와 같다. "건너뛰기"는 값 없이(AI가 개수를 정함), "다음"은 값이 유효할 때만.
 * 닫기(X · ESC · 바깥)는 건너뛰기가 아니라 그만두기다. 작가 1단계 · 개인 갤러리(usePersonalUpload) 공용.
 */

import { useState } from "react";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { CONCEPT_COUNT_MAX, CONCEPT_COUNT_MIN } from "@/lib/api/analysis";

const STEP_BUTTON =
  "grid w-12 cursor-pointer place-items-center text-contents-light-bgd-sub transition-colors duration-fast hover:bg-surface-default-lightness hover:text-contents-light-bgd-default disabled:cursor-default disabled:text-contents-light-bgd-disabled disabled:hover:bg-transparent";

export function ConceptCountModal({
  initial,
  onClose,
  onDone,
}: {
  /** "바꾸기"로 다시 열었을 때의 지금 값. 처음이면 null → 기본값 1 */
  initial: number | null;
  onClose: () => void;
  /** null = 건너뛰기(AI가 개수를 정한다) */
  onDone: (conceptCount: number | null) => void;
}) {
  const [value, setValue] = useState(String(initial ?? CONCEPT_COUNT_MIN));
  const parsed = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  const valid = Number.isInteger(parsed) && parsed >= CONCEPT_COUNT_MIN && parsed <= CONCEPT_COUNT_MAX;

  function step(delta: number) {
    const base = valid ? parsed : CONCEPT_COUNT_MIN;
    setValue(String(Math.max(CONCEPT_COUNT_MIN, Math.min(CONCEPT_COUNT_MAX, base + delta))));
  }

  return (
    <GalleryModalShell
      title="컨셉이 몇 개인가요?"
      desc="AI가 이 개수에 맞춰 폴더를 나눠요 · 기억나지 않으면 건너뛰어도 돼요"
      maxWidthClassName="max-w-[440px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <div className="mb-6 flex justify-center">
        <div
          className={`inline-flex h-12 items-stretch overflow-hidden rounded-(--radius-8) border bg-background-default-main transition-colors duration-fast ${
            valid
              ? "border-border-default focus-within:border-contents-light-bgd-default focus-within:ring-1 focus-within:ring-contents-light-bgd-default"
              : "border-function-error-default ring-1 ring-function-error-default"
          }`}
        >
          <button
            type="button"
            aria-label="하나 줄이기"
            disabled={valid && parsed <= CONCEPT_COUNT_MIN}
            onClick={() => step(-1)}
            className={STEP_BUTTON}
          >
            <MinusIcon size={22} />
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid) onDone(parsed);
            }}
            aria-label="컨셉 수"
            aria-invalid={!valid || undefined}
            className="w-28 border-x border-border-light bg-transparent text-center type-title-s text-contents-light-bgd-default outline-none tabular-nums"
          />
          <button
            type="button"
            aria-label="하나 늘리기"
            disabled={valid && parsed >= CONCEPT_COUNT_MAX}
            onClick={() => step(1)}
            className={STEP_BUTTON}
          >
            <PlusIcon size={22} />
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button kind="ghost" onClick={() => onDone(null)} className="flex-1">
          건너뛰기
        </Button>
        <Button onClick={() => valid && onDone(parsed)} disabled={!valid} className="flex-1">
          다음
        </Button>
      </div>
    </GalleryModalShell>
  );
}
