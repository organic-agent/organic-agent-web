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
      <h1 className="type-title-xl text-contents-light-bgd-default">{title}</h1>
      <p className="type-content-xs text-contents-light-bgd-sub">
        시행일: {effectiveDate}
      </p>
    </div>
  );
}

/** 초안 안내 배너 — 법률 검토 후 제거 */
export function DraftNotice() {
  return (
    <p className="mb-10 rounded-(--radius-8) border border-divider-default bg-surface-default-lightness px-4 py-3 type-content-xs text-contents-light-bgd-sub">
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
      <h2 className="type-title-m text-contents-light-bgd-default">{title}</h2>
      <div className="flex flex-col gap-2 type-content-m leading-relaxed text-contents-light-bgd-sub [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
        {children}
      </div>
    </section>
  );
}
