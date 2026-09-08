"use client";

/**
 * 자동 분류 패널 — 피그마 Panel/Assist 대응 (사이드바, 작가·부부 공용)
 * 위치: src/components/app/AssistPanel.tsx
 *
 * 시안 v4(이슈 #31)·부부 보드 v3(이슈 #34) 확정: 슬라이더는 "시각적 유사성"
 * 하나다 — 서버가 받는 값이 레벨(1=크게 묶기 ~ 5=잘게 묶기) 하나뿐이라
 * 시간 줄은 제거됐고, 5단계 스냅을 0·25·50·75·100%로 표기한다(우측 값).
 * 체크박스는 없다 — 접기(▾)가 폴더 미리보기 끄기를 겸한다(onOpenChange).
 * '결과 구성' 소제목 없이 요약 바로 아래 '앨범으로 저장' 버튼이 붙는다.
 */

import { useState } from "react";
import { PanelHeader } from "@/components/ui/PanelHeader";
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
  /** 유사성 단계 인덱스(0~4) */
  levelIndex: number;
  onLevelChange: (index: number) => void;
  /** 묶음 요약 문구 — null이면 조회 중(스켈레톤 표시) */
  summary: string | null;
  /** 요약 아래 보조 안내 — 예: 분석 중인 사진 n장 · 잠김 이유 */
  hint?: string;
  /** 없으면 저장 버튼을 숨긴다 */
  onSave?: () => void;
  saveDisabled?: boolean;
  /** 접기(▾) = 폴더 미리보기 끄기 — 호출부가 미리보기 상태를 따라가게 한다 */
  onOpenChange?: (open: boolean) => void;
};

export function AssistPanel({
  levelIndex,
  onLevelChange,
  summary,
  hint,
  onSave,
  saveDisabled = false,
  onOpenChange,
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
            onClick={() => {
              const next = !open;
              setOpen(next);
              onOpenChange?.(next);
            }}
            aria-label={open ? "자동 분류 접기" : "자동 분류 펼치기"}
          />
        }
      >
        자동 분류
      </PanelHeader>

      {open && (
        <>
          <div className="flex flex-col gap-1 w-full">
            <div className="flex w-full items-center justify-between">
              <span className="type-content-m text-contents-light-bgd-default">
                시각적 유사성
              </span>
              <span className="type-content-xs text-contents-light-bgd-sub">
                {LEVEL_PERCENT_LABELS[clampedIndex]}
              </span>
            </div>
            <StepSlider
              index={clampedIndex}
              onChange={onLevelChange}
              aria-label="시각적 유사성 정도"
            />
            {summary === null ? (
              // 조회 중 — 정적 스켈레톤 (shimmer는 '분석 준비 중' 셀 전용)
              <span
                aria-hidden
                className="mx-auto mt-1 h-3 w-36 rounded-(--pill) bg-surface-default-light"
              />
            ) : (
              <p className="type-content-xs text-contents-light-bgd-sub text-center w-full">
                {summary}
              </p>
            )}
            {hint && (
              <p className="type-content-xs text-contents-light-bgd-weakness text-center w-full">
                {hint}
              </p>
            )}
          </div>

          {onSave && (
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
