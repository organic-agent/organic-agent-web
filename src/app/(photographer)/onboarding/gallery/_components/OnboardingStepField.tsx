/**
 * 작가 — 갤러리 온보딩 단계 입력
 * 위치: src/app/(photographer)/onboarding/gallery/_components/OnboardingStepField.tsx
 *
 * 현재 단계에 해당하는 입력 필드 하나를 렌더링한다 (TextField·Textarea 부품 사용).
 */

import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import type { StepKey } from "../_lib/galleryOnboarding";

type Props = {
  stepKey: StepKey;
  formName: string;
  formDueDate: string;
  formTarget: string;
  formConcept: string;
  formMemo: string;
  onNameChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onConceptChange: (value: string) => void;
  onMemoChange: (value: string) => void;
};

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block type-label-button text-fg-neutral">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: string }) {
  return (
    <p className="mt-2 type-body-small text-fg-neutral-muted">{children}</p>
  );
}

export function OnboardingStepField({
  stepKey,
  formName,
  formDueDate,
  formTarget,
  formConcept,
  formMemo,
  onNameChange,
  onDueDateChange,
  onTargetChange,
  onConceptChange,
  onMemoChange,
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

  if (stepKey === "target") {
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

  if (stepKey === "concept") {
    return (
      <>
        <FieldLabel>컨셉 개수</FieldLabel>
        <TextField
          type="number"
          min={1}
          value={formConcept}
          onChange={onConceptChange}
          placeholder="예: 4"
          aria-label="컨셉 개수"
          className="h-12"
        />
        <FieldHint>아직 정하지 않았다면 비워두고 넘어가도 됩니다.</FieldHint>
      </>
    );
  }

  return (
    <>
      <FieldLabel>특이사항 메모</FieldLabel>
      <Textarea
        value={formMemo}
        onChange={onMemoChange}
        placeholder="예: 예식이 얼마 안 남아 전달을 서둘러야 해요"
        aria-label="특이사항 메모"
        className="h-22"
      />
    </>
  );
}
