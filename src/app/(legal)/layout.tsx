/**
 * 법적 문서 공통 레이아웃 (/terms · /privacy)
 * 위치: src/app/(legal)/layout.tsx
 *
 * 간결한 헤더(홈 링크) + 중앙 본문 컬럼. 랜딩·로그인 모달의 약관 링크가 여기로 온다.
 */

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg-layer-default">
      <header className="border-b border-stroke-neutral-muted">
        <div className="mx-auto flex h-16 w-full max-w-wrap items-center px-6">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Easy Select 홈"
          >
            <BrandLogo size={32} className="shrink-0 text-fg-neutral" />
            <b className="type-brand-wordmark text-fg-neutral">Easy Select</b>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-170 px-6 py-16">{children}</main>
    </div>
  );
}
