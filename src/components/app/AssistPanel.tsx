"use client";

/**
 * 자동 분류 패널 — 피그마 Panel/Assist 대응 (사이드바)
 * 위치: src/components/app/AssistPanel.tsx
 *
 * 시안 v4 확정(이슈 #31): 슬라이더는 "시각적 유사성" 하나다. 서버가 받는
 * 값이 레벨(1=크게 묶기 ~ 5=잘게 묶기) 하나뿐이라 시간 줄은 제거됐다 —
 * 촬영 시각 기준은 서버가 알아서 반영한다. 5단계 스냅을 0·25·50·75·100%로
 * 표기하고(우측 값), 체크박스는 폴더 미리보기 켜기/끄기다.
 * '결과 구성' 소제목 없이 요약 바로 아래 '앨범으로 저장' 버튼이 붙는다.
 */

import { useState } from "react";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { CheckboxField } from "@/components/ui/Checkbox";
import { StepSlider } from "@/components/ui/StepSlider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SparkleIcon, DropdownIcon } from "@/components/icons";

/** 단계 인덱스(0~4)의 표기 라벨 — 서버에는 인덱스+1(1~5)을 보낸다 */
export const LEVEL_PERCENT_LABELS = [
  "0%",
  "25%",
  "50%",
  "75%",
  "100%",
] as const;

type AssistPanelProps = {
  /** 폴더 미리보기 켜짐 — 끄면 슬라이더·요약·저장이 숨고 원래 그리드로 */
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 유사성 단계 인덱스(0~4) */
  levelIndex: number;
  onLevelChange: (index: number) => void;
  /** 묶음 요약 문구 — null이면 조회 중(스켈레톤 표시) */
  summary: string | null;
  /** 요약 아래 보조 안내 — 예: 분석 중인 사진 n장 */
  hint?: string;
  /** 없으면 저장 버튼을 숨긴다 */
  onSave?: () => void;
  saveDisabled?: boolean;
};

export function AssistPanel({
  checked,
  onCheckedChange,
  levelIndex,
  onLevelChange,
  summary,
  hint,
  onSave,
  saveDisabled = false,
}: AssistPanelProps) {
  const [open, setOpen] = useState(true);
  const clampedIndex = Math.min(
    Math.max(levelIndex, 0),
    LEVEL_PERCENT_LABELS.length - 1,
  );

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
          <div className="flex flex-col gap-1 w-full">
            <CheckboxField
              label="시각적 유사성"
              checked={checked}
              onChange={onCheckedChange}
            />
            {checked && (
              <StepSlider
                index={clampedIndex}
                onChange={onLevelChange}
                label={LEVEL_PERCENT_LABELS[clampedIndex]}
                aria-label="시각적 유사성 정도"
              />
            )}
            {checked &&
              (summary === null ? (
                // 조회 중 — 정적 스켈레톤 (shimmer는 '분석 준비 중' 셀 전용)
                <span
                  aria-hidden
                  className="mx-auto mt-1 h-3 w-36 rounded-(--pill) bg-bg-disabled"
                />
              ) : (
                <p className="type-body-small text-fg-neutral-muted text-center w-full">
                  {summary}
                </p>
              ))}
            {checked && hint && (
              <p className="type-body-small text-fg-neutral-subtle text-center w-full">
                {hint}
              </p>
            )}
          </div>

          {checked && onSave && (
            <div className="flex w-full justify-center">
              <Button size="sm" onClick={onSave} disabled={saveDisabled}>
                앨범으로 저장
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
