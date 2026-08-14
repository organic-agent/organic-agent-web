/**
 * 법적 문서 조립용 부품 (제목·조항·초안 안내)
 * 위치: src/app/(legal)/_components/LegalSection.tsx
 */

import type { ReactNode } from "react";

/** 문서 제목 + 시행일 줄 */
export function LegalTitle({
  title,
  effectiveDate,
}: {
  title: string;
  effectiveDate: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <h1 className="type-heading-large text-fg-neutral">{title}</h1>
      <p className="type-body-small text-fg-neutral-muted">
        시행일: {effectiveDate}
      </p>
    </div>
  );
}

/** 초안 안내 배너 — 법률 검토 후 제거 */
export function DraftNotice() {
  return (
    <p className="mb-10 rounded-(--radius-8) border border-stroke-neutral-muted bg-bg-layer-default-hover px-4 py-3 type-body-small text-fg-neutral-muted">
      이 문서는 정식 시행 전 초안입니다. [ ] 표시된 항목은 확정 후
      채워지며, 시행 시점에 이 안내는 제거됩니다.
    </p>
  );
}

/** 조항 하나 (제N조 제목 + 본문) */
export function LegalArticle({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8 flex flex-col gap-2">
      <h2 className="type-heading-card text-fg-neutral">{title}</h2>
      <div className="flex flex-col gap-2 type-body-medium leading-relaxed text-fg-neutral-muted [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
        {children}
      </div>
    </section>
  );
}
