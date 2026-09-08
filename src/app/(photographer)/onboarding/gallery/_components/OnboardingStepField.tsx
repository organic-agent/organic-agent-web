/**
 * 작가 — 갤러리 온보딩 단계 입력
 * 위치: src/app/(photographer)/onboarding/gallery/_components/OnboardingStepField.tsx
 *
 * 현재 단계에 해당하는 입력 필드 하나를 렌더링한다 (TextField 부품 사용).
 */

import { TextField } from "@/components/ui/TextField";
import type { StepKey } from "../_lib/galleryOnboarding";

type Props = {
  stepKey: StepKey;
  formName: string;
  formDueDate: string;
  formTarget: string;
  onNameChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onTargetChange: (value: string) => void;
};

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block type-label-medium-m text-contents-light-bgd-default">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: string }) {
  return (
    <p className="mt-2 type-content-xs text-contents-light-bgd-sub">{children}</p>
  );
}

export function OnboardingStepField({
  stepKey,
  formName,
  formDueDate,
  formTarget,
  onNameChange,
  onDueDateChange,
  onTargetChange,
}: Props) {
  if (stepKey === "name") {
    return (
      <>
        <FieldLabel>갤러리 이름</FieldLabel>
        <TextField
          value={formName}
          onChange={onNameChange}
          placeholder="예: 지민 & 하윤 웨딩"
          aria-label="갤러리 이름"
          className="h-12"
        />
      </>
    );
  }

  if (stepKey === "dueDate") {
    return (
      <>
        <FieldLabel>완료 예정일</FieldLabel>
        <TextField
          type="date"
          value={formDueDate}
          onChange={onDueDateChange}
          aria-label="완료 예정일"
          className="h-12"
        />
        <FieldHint>기본값은 생성일로부터 50일 뒤입니다.</FieldHint>
      </>
    );
  }

  return (
    <>
      <FieldLabel>목표 선택 장수</FieldLabel>
      <TextField
        type="number"
        min={1}
        value={formTarget}
        onChange={onTargetChange}
        placeholder="50"
        aria-label="목표 선택 장수"
        className="h-12"
      />
    </>
  );
}
