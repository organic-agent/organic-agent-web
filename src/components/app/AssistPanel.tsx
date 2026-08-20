"use client";

/**
 * 자동 분류 패널 — 피그마 Panel/Assist 대응 (사이드바 상단)
 * 위치: src/components/app/AssistPanel.tsx
 *
 * AI 자동 분류 조건(시간·시각적 유사성)과 묶음 결과 요약, 앨범 추가 액션.
 * 상태는 화면이 소유하고 이 컴포넌트는 표시·콜백만 담당한다.
 *
 * 슬라이더는 5단계 스냅(시안 v5 확정) — 하단 라벨 없이 눈금 위치가 값이고,
 * 시간만 우측에 현재 값을 표기한다. 단계별 실제 값(초·유사도 임계치)은
 * 05 분류 파라미터 확정 때 조정한다.
 */

import { useState } from "react";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { CheckboxField } from "@/components/ui/Checkbox";
import { StepSlider } from "@/components/ui/StepSlider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SparkleIcon, DropdownIcon } from "@/components/icons";

/** 시간 간격 5단계(초) — 최대 60초(1분): 촬영 시각으로 묶으므로 1분이 가장 긴 간격. */
const TIME_STEPS = [5, 15, 30, 45, 60];
/** 시각적 유사성 5단계 (0~100, 클수록 덜 유사함까지 허용) */
const SIMILARITY_STEPS = [0, 25, 50, 75, 100];

/** 현재 값에서 가장 가까운 단계 인덱스 */
function nearestIndex(steps: number[], value: number) {
  let best = 0;
  for (let i = 1; i < steps.length; i += 1) {
    if (Math.abs(steps[i] - value) < Math.abs(steps[best] - value)) best = i;
  }
  return best;
}

type AssistPanelProps = {
  /** 시간 기준 묶기 사용 여부 */
  timeChecked: boolean;
  onTimeChange: (checked: boolean) => void;
  /** 시간 간격(초, 5~60) — 슬라이더 우측 끝 = 60초(1분, 최대 간격) */
  timeValue: number;
  onTimeValueChange: (seconds: number) => void;
  /** 시각적 유사성 기준 사용 여부 */
  similarityChecked: boolean;
  onSimilarityChange: (checked: boolean) => void;
  /** 유사성 정도 (0~100, 클수록 덜 유사함까지 허용) */
  similarityValue: number;
  onSimilarityValueChange: (value: number) => void;
  /** 결과 요약 문구 (예: "묶음 4개 · 묶이지 않은 사진 2개") */
  summary: string;
  /** 없으면 결과 구성(앨범에 추가하기) 섹션을 숨긴다 — 앨범 반영은 부부 전용 */
  onAddToAlbum?: () => void;
};

export function AssistPanel({
  timeChecked,
  onTimeChange,
  timeValue,
  onTimeValueChange,
  similarityChecked,
  onSimilarityChange,
  similarityValue,
  onSimilarityValueChange,
  summary,
  onAddToAlbum,
}: AssistPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-3 w-full">
      <PanelHeader
        icon={<SparkleIcon size={16} />}
        action={
          <IconButton
            icon={
              <DropdownIcon
                size={16}
                className={`transition-transform duration-fast ${open ? "" : "-rotate-90"}`}
              />
            }
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "자동 분류 접기" : "자동 분류 펼치기"}
          />
        }
      >
        자동 분류
      </PanelHeader>

      {open && (
        <>
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col gap-1 w-full">
              <CheckboxField
                label="시간"
                checked={timeChecked}
                onChange={onTimeChange}
              />
              {timeChecked && (
                <StepSlider
                  index={nearestIndex(TIME_STEPS, timeValue)}
                  onChange={(i) => onTimeValueChange(TIME_STEPS[i])}
                  label={timeValue >= 60 ? "1분" : `${timeValue}초`}
                  aria-label="시간 간격"
                />
              )}
            </div>
            <div className="flex flex-col gap-1 w-full">
              <CheckboxField
                label="시각적 유사성"
                checked={similarityChecked}
                onChange={onSimilarityChange}
              />
              {similarityChecked && (
                // 우측 값은 문구(엄격 등) 대신 수치 — 하단 단계 라벨만 없음 (#25 후속 보완)
                <StepSlider
                  index={nearestIndex(SIMILARITY_STEPS, similarityValue)}
                  onChange={(i) => onSimilarityValueChange(SIMILARITY_STEPS[i])}
                  label={`${similarityValue}%`}
                  aria-label="시각적 유사성 정도"
                />
              )}
            </div>
            <p className="type-body-small text-fg-neutral-muted text-center w-full">
              {summary}
            </p>
          </div>

          {onAddToAlbum && (
            <div className="flex flex-col gap-2 items-center w-full">
              <PanelHeader>결과 구성</PanelHeader>
              <Button size="sm" onClick={onAddToAlbum}>
                앨범에 추가하기
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
