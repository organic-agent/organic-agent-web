/**
 * 작가 — 갤러리 온보딩 단계 입력
 * 위치: src/app/(photographer)/onboarding/gallery/_components/OnboardingStepField.tsx
 *
 * 현재 단계에 해당하는 입력 필드 하나를 렌더링한다.
 * 갤러리 이름, 완료 예정일, 목표 선택 장수, 컨셉 개수, 메모 입력을 담당한다.
 *
 * 주요 책임:
 * - 단계별 입력 필드 렌더링
 * - 입력값과 변경 콜백 연결
 * - 단계별 보조 안내 문구 표시
 */

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
        <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
          갤러리 이름
        </label>
        <input
          type="text"
          value={formName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="예: 지민 & 하윤 웨딩"
          className="w-full h-12 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 placeholder:text-ink-3"
        />
      </>
    );
  }

  if (stepKey === "dueDate") {
    return (
      <>
        <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
          완료 예정일
        </label>
        <input
          type="date"
          value={formDueDate}
          onChange={(e) => onDueDateChange(e.target.value)}
          className="w-full h-12 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3"
        />
        <p className="text-[11px] text-ink-3 mt-2">
          기본값은 생성일로부터 50일 뒤입니다.
        </p>
      </>
    );
  }

  if (stepKey === "target") {
    return (
      <>
        <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
          목표 선택 장수
        </label>
        <input
          type="number"
          min={1}
          value={formTarget}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder="50"
          className="w-full h-12 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 placeholder:text-ink-3"
        />
      </>
    );
  }

  if (stepKey === "concept") {
    return (
      <>
        <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
          컨셉 개수
        </label>
        <input
          type="number"
          min={1}
          value={formConcept}
          onChange={(e) => onConceptChange(e.target.value)}
          placeholder="예: 4"
          className="w-full h-12 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 placeholder:text-ink-3"
        />
        <p className="text-[11px] text-ink-3 mt-2">
          아직 정하지 않았다면 비워두고 넘어가도 됩니다.
        </p>
      </>
    );
  }

  return (
    <>
      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
        특이사항 메모
      </label>
      <textarea
        rows={3}
        value={formMemo}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="예: 예식이 얼마 안 남아 전달을 서둘러야 해요"
        className="w-full px-3.5 py-2.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 placeholder:text-ink-3 resize-none"
      />
    </>
  );
}
