"use client";

/**
 * 작가 — 갤러리 생성 온보딩 페이지
 * 위치: src/app/(photographer)/onboarding/gallery/page.tsx
 *
 * 스튜디오 생성 직후 첫 샘플 갤러리를 단계별로 만들어보는 화면이다.
 * 입력한 세 값(이름·완료 예정일·목표 장수)으로 POST /api/v1/galleries/mock을
 * 호출해 샘플 사진이 채워진 진짜 갤러리를 만들고 목록으로 이동한다.
 *
 * Mock 생성 API는 부를 때마다 새 갤러리를 만든다(멱등 아님) — 그래서
 * 생성 시작 후에는 성공·이동까지 버튼을 계속 잠가 중복 생성을 막고,
 * 실패했을 때만 버튼을 풀어 같은 자리에서 재시도하게 한다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { createMockGallery, toSelectionDeadline } from "@/lib/api/galleries";
import { listWorkspaces } from "@/lib/api/workspaces";
import { useStudioInfo } from "@/lib/studio";
import {
  addDaysAsInputValue,
  isGalleryFormValid,
} from "../../_lib/galleryForm";
import { OnboardingStepButtons } from "./_components/OnboardingStepButtons";
import { OnboardingStepField } from "./_components/OnboardingStepField";
import { STEPS, type StepKey } from "./_lib/galleryOnboarding";

/** 실패 상태 코드 → 사용자 안내. 400은 서버 메시지가 더 구체적이라 그대로 쓴다. */
function createErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503)
      return "샘플 사진이 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.";
    if (err.status === 502)
      return "샘플 사진을 복사하다 실패했어요. 만들다 만 갤러리는 남지 않으니 그대로 다시 시도하면 돼요.";
    return err.message;
  }
  return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
}

export default function OnboardingPage() {
  const router = useRouter();
  const studio = useStudioInfo();

  const [step, setStep] = useState(0);
  const [formName, setFormName] = useState("");
  const [formDueDate, setFormDueDate] = useState(() => addDaysAsInputValue(50));
  const [formTarget, setFormTarget] = useState("50");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formValues = {
    name: formName,
    dueDate: formDueDate,
    target: formTarget,
  };

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const canCreate = isGalleryFormValid(formValues);
  const canGoNext = current.optional || isCurrentStepValid(current.key);

  function isCurrentStepValid(key: StepKey) {
    if (key === "name") return formName.trim().length > 0;
    // 지난 마감 기한은 서버가 400으로 거절한다 — 미리 막는다
    if (key === "dueDate") return formDueDate >= addDaysAsInputValue(0);
    if (key === "target") return Number(formTarget) > 0;
    return true;
  }

  function goNext() {
    if (!canGoNext || creating) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function goBack() {
    if (creating) return;
    setStep((prev) => Math.max(prev - 1, 0));
  }

  async function createSampleGallery() {
    if (!canCreate || creating) return;
    setCreating(true);
    setError(null);

    try {
      const workspaces = await listWorkspaces();
      const workspace = workspaces.find((item) => item.type === "STUDIO") ?? workspaces[0];
      if (!workspace) throw new Error("갤러리를 만들 작업공간이 없습니다.");
      await createMockGallery({
        workspaceId: workspace.id,
        title: formName.trim(),
        selectionDeadline: toSelectionDeadline(formDueDate),
        maxSelectablePhotoCount: Number(formTarget),
      });

      // 성공 후에도 버튼은 잠근 채로 이동한다 — 전환 중 재클릭이 새 갤러리를
      // 하나 더 만드는 사고 방지.
      router.push("/galleries");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // 스튜디오가 없다(STUDIO_404_1) — 갤러리는 스튜디오에 속하므로
        // 앞 단계인 스튜디오 온보딩으로 돌려보낸다.
        router.push("/onboarding/studio");
        return;
      }
      setError(createErrorMessage(err));
      setCreating(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg-layer-default grid place-items-center px-6 py-12">
      <div className="w-full max-w-130">
        <div className="mb-8">
          <p className="mb-3 type-label-eyebrow text-fg-neutral-muted">
            First gallery
          </p>
          <h1 className="mb-2 type-heading-large text-fg-neutral">
            첫 샘플 갤러리를 만들어볼까요
          </h1>
          <p className="type-body-medium text-fg-neutral-muted">
            <b className="font-medium text-fg-neutral">{studio.name}</b>에서
            사용할 첫 갤러리를 실제 생성 흐름처럼 하나씩 입력해봅니다.
          </p>
        </div>

        <div className="rounded-(--radius-16) border border-stroke-neutral-muted bg-bg-layer-default p-8">
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="type-label-eyebrow text-fg-neutral-muted">
                Step {step + 1} / {STEPS.length}
              </p>
              {current.optional && (
                <span className="type-body-small text-fg-neutral-muted">
                  선택 입력
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {STEPS.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStep(index)}
                  disabled={creating}
                  aria-label={`${index + 1}단계로 이동`}
                  className={`h-1.5 flex-1 cursor-pointer rounded-(--pill) transition-colors duration-fast ${
                    index <= step ? "bg-bg-brand-solid" : "bg-bg-disabled"
                  }`}
                />
              ))}
            </div>
          </div>

          <h2 className="mb-2 type-heading-card text-fg-neutral">
            {current.title}
          </h2>
          <p className="mb-7 type-body-medium text-fg-neutral-muted">
            {current.desc}
          </p>

          <div className="h-30.5 mb-5">
            <OnboardingStepField
              stepKey={current.key}
              formName={formName}
              formDueDate={formDueDate}
              formTarget={formTarget}
              onNameChange={setFormName}
              onDueDateChange={setFormDueDate}
              onTargetChange={setFormTarget}
            />
          </div>

          {/* 생성 실패 안내 — 같은 버튼이 재시도 역할을 한다 */}
          {error && (
            <p
              role="alert"
              className="mb-4 type-body-small text-fg-critical"
            >
              {error}
            </p>
          )}

          <OnboardingStepButtons
            step={step}
            isLastStep={isLastStep}
            canGoNext={canGoNext}
            canCreate={canCreate}
            creating={creating}
            onBack={goBack}
            onNext={goNext}
            onSkip={() => router.push("/galleries")}
            onCreate={createSampleGallery}
          />
        </div>
      </div>
    </main>
  );
}
