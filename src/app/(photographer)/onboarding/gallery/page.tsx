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
import { upsertGallery, useGalleries } from "@/lib/galleries";
import { useStudioInfo } from "@/lib/studio";
import {
  addDaysAsInputValue,
  createGalleryFromForm,
  isGalleryFormValid,
} from "../../_lib/galleryForm";
import { OnboardingStepButtons } from "./_components/OnboardingStepButtons";
import { OnboardingStepField } from "./_components/OnboardingStepField";
import { SAMPLE_COVERS, STEPS, type StepKey } from "./_lib/galleryOnboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const studio = useStudioInfo();
  const galleries = useGalleries();

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
      const cover = SAMPLE_COVERS[galleries.length % SAMPLE_COVERS.length];
      upsertGallery(
        createGalleryFromForm({
          values: formValues,
          id: `sample-${Date.now()}`,
          coverId: cover,
        }),
      );
      router.push("/galleries");
    }, 600);
  }

  return (
    <main className="min-h-dvh bg-white grid place-items-center px-6 py-12">
      <div className="w-full max-w-[520px]">
        <div className="mb-8">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-3">
            First gallery
          </p>
          <h1 className="font-display-ko font-medium text-[28px] leading-snug tracking-[-0.02em] text-ink mb-2">
            첫 샘플 갤러리를 만들어볼까요
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-2">
            <b className="font-medium text-ink">{studio.name}</b>에서 사용할
            첫 갤러리를 실제 생성 흐름처럼 하나씩 입력해봅니다.
          </p>
        </div>

        <div className="border border-line rounded-2xl p-8 bg-white">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                Step {step + 1} / {STEPS.length}
              </p>
              {current.optional && (
                <span className="text-[11px] text-ink-3">선택 입력</span>
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
                  className={`h-1.5 flex-1 rounded-pill transition-colors ${
                    index <= step ? "bg-ink" : "bg-line"
                  }`}
                />
              ))}
            </div>
          </div>

          <h2 className="font-display-ko font-medium text-[22px] leading-snug text-ink mb-2">
            {current.title}
          </h2>
          <p className="text-[13px] leading-relaxed text-ink-2 mb-7">
            {current.desc}
          </p>

          <div className="h-[122px] mb-5">
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
