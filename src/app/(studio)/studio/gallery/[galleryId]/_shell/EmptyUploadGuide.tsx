/**
 * 빈 갤러리 안내 — 3단계 카드 (버튼 없음, 업로드는 하단 바 CTA)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/EmptyUploadGuide.tsx
 */

import { SparkleIcon, UploadIcon, VisibilityIcon } from "@/components/icons";

const STEPS = [
  { icon: <UploadIcon size={20} />, title: "1. 사진 올리기", desc: "끌어다 놓거나 고르기" },
  { icon: <SparkleIcon size={20} />, title: "2. AI가 폴더로 정리", desc: "컨셉 · 세부 폴더 자동" },
  { icon: <VisibilityIcon size={20} />, title: "3. 확인하고 열기", desc: "클라이언트 초대" },
];

export function EmptyUploadGuide() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-8">
      <div className="flex w-full max-w-140 flex-col items-center gap-2 rounded-(--radius-16) border border-dashed border-border-default px-6 py-12 text-center">
        <h3 className="type-title-s text-contents-light-bgd-default">첫 사진을 올려 주세요</h3>
        <p className="type-content-s text-contents-light-bgd-sub">이 갤러리에서 할 일은 세 가지예요.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-5">
          {STEPS.map((step) => (
            <div key={step.title} className="flex w-32 flex-col items-center gap-1.5">
              <span className="grid size-9 place-items-center rounded-full bg-brand-secondary-background text-brand-secondary-dark">
                {step.icon}
              </span>
              <b className="type-label-semibold-s text-contents-light-bgd-default">{step.title}</b>
              <span className="type-content-xs text-contents-light-bgd-sub">{step.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
