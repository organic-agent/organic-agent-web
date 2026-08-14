/**
 * 작가 — 갤러리 온보딩 단계 버튼
 * 위치: src/app/(photographer)/onboarding/gallery/_components/OnboardingStepButtons.tsx
 *
 * 갤러리 생성 온보딩의 하단 이동 버튼을 단계에 맞게 보여준다.
 * 첫 단계, 중간 단계, 마지막 단계마다 필요한 버튼 구성을 분리한다.
 *
 * 주요 책임:
 * - 이전/다음/건너뛰기 버튼 구성
 * - 마지막 단계 생성 버튼 표시
 * - 생성 중 버튼 비활성화 처리
 */

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
  const buttonClass =
    "flex-1 h-11 rounded-pill text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";
  const secondaryClass = `${buttonClass} border border-line text-ink-2 hover:bg-paper-deep`;
  const primaryClass = `${buttonClass} bg-ink text-on-ink hover:bg-[#333]`;

  if (step === 0) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSkip}
          disabled={creating}
          className={secondaryClass}
        >
          건너뛰기
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={creating || !canGoNext}
          className={primaryClass}
        >
          다음
        </button>
      </div>
    );
  }

  if (isLastStep) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={creating}
          className={secondaryClass}
        >
          이전
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={creating || !canCreate}
          className={primaryClass}
        >
          {creating ? "만드는 중..." : "샘플 갤러리 만들기"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={onBack}
        disabled={creating}
        className={secondaryClass}
      >
        이전
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={creating || !canGoNext}
        className={primaryClass}
      >
        다음
      </button>
      <button
        type="button"
        onClick={onSkip}
        disabled={creating}
        className={secondaryClass}
      >
        건너뛰기
      </button>
    </div>
  );
}
