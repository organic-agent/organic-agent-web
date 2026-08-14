"use client";

/**
 * 작가 — 갤러리 생성 온보딩 페이지
 * 위치: src/app/(photographer)/onboarding/gallery/page.tsx
 *
 * 스튜디오 생성 직후 첫 샘플 갤러리를 단계별로 직접 만들어보는 화면이다.
 * 실제 새 갤러리 생성 항목을 하나씩 설명하며 갤러리 생성 과정을 체험하게 한다.
 *
 * 주요 책임:
 * - 샘플 갤러리 생성 단계 상태 관리
 * - 단계별 입력값 검증과 안내 문구 렌더링
 * - 입력값으로 샘플 갤러리 생성 후 갤러리 목록 이동
 *
 * 참고:
 * - 실제로는 POST /api/v1/galleries/mock 연결 후 /galleries로 이동할 예정이다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertGallery } from "@/lib/galleries";
import { useStudioInfo } from "@/lib/studio";
import {
  addDaysAsInputValue,
  createGalleryFromForm,
  isGalleryFormValid,
} from "../../_lib/galleryForm";
import { OnboardingStepButtons } from "./_components/OnboardingStepButtons";
import { OnboardingStepField } from "./_components/OnboardingStepField";
import { STEPS, type StepKey } from "./_lib/galleryOnboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const studio = useStudioInfo();

  const [step, setStep] = useState(0);
  const [formName, setFormName] = useState("");
  const [formDueDate, setFormDueDate] = useState(() => addDaysAsInputValue(50));
  const [formTarget, setFormTarget] = useState("50");
  const [formConcept, setFormConcept] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [creating, setCreating] = useState(false);
  const formValues = {
    name: formName,
    dueDate: formDueDate,
    target: formTarget,
    concept: formConcept,
    memo: formMemo,
  };

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const canCreate = isGalleryFormValid(formValues);
  const canGoNext = current.optional || isCurrentStepValid(current.key);

  function isCurrentStepValid(key: StepKey) {
    if (key === "name") return formName.trim().length > 0;
    if (key === "dueDate") return formDueDate.length > 0;
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

  function createSampleGallery() {
    if (!canCreate || creating) return;
    setCreating(true);

    // 회의 후: await fetch("/api/v1/galleries/mock", { method: "POST" });
    setTimeout(() => {
      upsertGallery(
        createGalleryFromForm({
          values: formValues,
          id: `sample-${Date.now()}`,
        }),
      );
      router.push("/galleries");
    }, 600);
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
              formConcept={formConcept}
              formMemo={formMemo}
              onNameChange={setFormName}
              onDueDateChange={setFormDueDate}
              onTargetChange={setFormTarget}
              onConceptChange={setFormConcept}
              onMemoChange={setFormMemo}
            />
          </div>

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
