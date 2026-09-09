/**
 * 루트 레이아웃 (모든 페이지를 감싸는 최상위 HTML 뼈대 + 전역 메타데이터·폰트)
 * 위치: src/app/layout.tsx
 *
 * (auth)·(client)·(studio) 등 하위 layout.tsx가 이 안에 중첩되고, 최종적으로 각 page.tsx가 children 자리에 렌더된다.
 */

import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme-bootstrap";
import "./fonts/pretendard.css";
import "./tokens.generated.css";
import "./globals.css";

// 디자인 시스템 v2 폰트 — 본문·제목 전부 Pretendard Variable + 브랜드 워드마크 Montserrat. 세리프는 v2에서 제거됨.
// Pretendard는 유니코드 범위별 조각(public/fonts/pretendard, fonts/pretendard.css)으로 셀프 호스팅해
// 화면에 쓰인 글자 조각만 내려받는다. Montserrat는 next/font 셀프 호스팅. 외부 CDN 요청 없음.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Easy Select — 우리의 순간을, 함께 고르다",
  description:
    "막막했던 셀렉은 함께 고르는 설렘으로, 번거로웠던 전달은 클릭 한 번으로. 업로드부터 보정 요청, 마무리까지 사진의 여정이 한 곳에서 완성돼요.",
  openGraph: {
    title: "Easy Select — 우리의 순간을, 함께 고르다",
    description:
      "업로드부터 전달까지, 사진 셀렉의 모든 과정을 한 곳에서.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme은 <head>의 부팅 스크립트가 hydration 전에 정한다(저장값 → 라이트). 서버 HTML엔 없으므로
    // React가 속성 불일치를 경고하지 않도록 suppressHydrationWarning. 토글 UI는 C1 프로필 메뉴에서 useTheme()로 연결.
    <html
      lang="ko"
      suppressHydrationWarning
      className={montserrat.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
