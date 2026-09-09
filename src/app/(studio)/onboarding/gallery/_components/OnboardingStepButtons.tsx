/**
 * 작가 — 갤러리 온보딩 단계 버튼
 * 위치: src/app/(studio)/onboarding/gallery/_components/OnboardingStepButtons.tsx
 *
 * 갤러리 생성 온보딩의 하단 이동 버튼을 단계에 맞게 보여준다 (공용 Button 사용).
 * 이전·건너뛰기 = ghost, 다음·만들기 = primary.
 */

import { Button } from "@/components/ui/Button";

type Props = {
  step: number;
  isLastStep: boolean;
  canGoNext: boolean;
  canCreate: boolean;
  creating: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onCreate: () => void;
};

export function OnboardingStepButtons({
  step,
  isLastStep,
  canGoNext,
  canCreate,
  creating,
  onBack,
  onNext,
  onSkip,
  onCreate,
}: Props) {
  if (step === 0) {
    return (
      <div className="flex gap-2">
        <Button
          kind="ghost"
          disabled={creating}
          onClick={onSkip}
          className="flex-1"
        >
          건너뛰기
        </Button>
        <Button
          disabled={creating || !canGoNext}
          onClick={onNext}
          className="flex-1"
        >
          다음
        </Button>
      </div>
    );
  }

  if (isLastStep) {
    return (
      <div className="flex gap-2">
        <Button
          kind="ghost"
          disabled={creating}
          onClick={onBack}
          className="flex-1"
        >
          이전
        </Button>
        <Button
          disabled={creating || !canCreate}
          onClick={onCreate}
          className="flex-1"
        >
          {creating ? "만드는 중..." : "샘플 갤러리 만들기"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button kind="ghost" disabled={creating} onClick={onBack}>
        이전
      </Button>
      <Button disabled={creating || !canGoNext} onClick={onNext}>
        다음
      </Button>
      <Button kind="ghost" disabled={creating} onClick={onSkip}>
        건너뛰기
      </Button>
    </div>
  );
}
