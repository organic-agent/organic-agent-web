"use client";

/**
 * 자동 분류 패널 — 피그마 Panel/Assist 대응 (사이드바 상단)
 * 위치: src/components/app/AssistPanel.tsx
 *
 * AI 자동 분류 조건(시간·시각적 유사성)과 묶음 결과 요약, 앨범 추가 액션.
 * 상태는 화면이 소유하고 이 컴포넌트는 표시·콜백만 담당한다.
 * - 시간 슬라이더는 우측 끝이 1분 (오른쪽으로 갈수록 간격이 촘촘해짐)
 * - 유사성 슬라이더는 우측 끝이 "덜 유사함"
 */

import { useState } from "react";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { CheckboxField } from "@/components/ui/Checkbox";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SparkleIcon, DropdownIcon } from "@/components/icons";

/** 시간 간격 최대치 = 60초(1분). 사진 메타데이터의 촬영 시각으로 묶으므로 1분이 가장 긴 간격. */
const TIME_MAX_SECONDS = 60;

function similarityLabel(value: number): string {
  if (value >= 67) return "덜 유사함";
  if (value >= 34) return "보통";
  return "매우 유사함";
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
                <Slider
                  value={timeValue}
                  min={5}
                  max={TIME_MAX_SECONDS}
                  step={5}
                  onChange={onTimeValueChange}
                  label={
                    timeValue >= TIME_MAX_SECONDS ? "1분" : `${timeValue}초`
                  }
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
                <Slider
                  value={similarityValue}
                  min={0}
                  max={100}
                  onChange={onSimilarityValueChange}
                  label={similarityLabel(similarityValue)}
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
