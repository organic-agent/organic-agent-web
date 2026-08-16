/**
 * 루트 레이아웃 (모든 페이지를 감싸는 최상위 HTML 뼈대 + 전역 메타데이터·폰트)
 * 위치: src/app/layout.tsx
 *
 * (auth)·(couple)·(photographer) 등 하위 layout.tsx가 이 안에 중첩되고, 최종적으로 각 page.tsx가 children 자리에 렌더된다.
 */

import type { Metadata } from "next";
import { Montserrat, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import "./tokens.css";
import "./tokens.dark.css";
import "./globals.css";

// 디자인 시스템 폰트 — 본문(Noto Sans KR) + 브랜드(Montserrat) + 감성 세리프(Noto Serif KR).
// 셋 다 next/font 셀프 호스팅이라 외부 CDN 요청이 없다.
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["300", "500", "600", "700"],
  variable: "--font-noto-serif-kr",
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
    <html
      lang="ko"
      data-theme="light"
      className={`${notoSansKr.variable} ${montserrat.variable} ${notoSerifKr.variable}`}
    >
      <body>
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
