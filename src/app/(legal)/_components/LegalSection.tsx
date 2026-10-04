/**
 * 법적 문서 조립용 부품 (제목 · 조항 · 작은 제목 · 표)
 * 위치: src/app/(legal)/_components/LegalSection.tsx
 */

import type { ReactNode } from "react";

/** 문서 제목 + 날짜 줄 — 약관은 "시행일", 처리방침은 "최종 수정일" */
export function LegalTitle({
  title,
  effectiveDate,
  dateLabel = "시행일",
}: {
  title: string;
  effectiveDate: string;
  dateLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <h1 className="type-title-xl text-contents-light-bgd-default">{title}</h1>
      <p className="type-content-xs text-contents-light-bgd-sub">
        {dateLabel}: {effectiveDate}
      </p>
    </div>
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
      <div className="flex flex-col gap-2 type-content-m leading-relaxed text-contents-light-bgd-sub [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_li_ul]:list-[circle]">
        {children}
      </div>
    </section>
  );
}

/** 조항 안의 작은 제목 ("1.1 수집 항목") */
export function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 type-title-s text-contents-light-bgd-default">{children}</h3>;
}

/** 목록 앞에 붙는 굵은 한 줄 ("회원가입 시 수집하는 정보") */
export function LegalLabel({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 font-semibold text-contents-light-bgd-default">{children}</p>;
}

/** 표 — thead · tbody를 그대로 받는다. 좁은 화면에서는 표만 옆으로 스크롤된다 */
export function LegalTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-(--radius-8) border border-border-light">
      <table className="w-full border-collapse text-left type-content-s [&_td]:border-b [&_td]:border-divider-default [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border-b [&_th]:border-divider-default [&_th]:bg-surface-default-lightness [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:whitespace-nowrap [&_th]:text-contents-light-bgd-weakness [&_tr:last-child>td]:border-b-0">
        {children}
      </table>
    </div>
  );
}
