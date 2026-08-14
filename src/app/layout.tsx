/**
 * 루트 레이아웃 (모든 페이지를 감싸는 최상위 HTML 뼈대 + 전역 메타데이터·폰트)
 * 위치: src/app/layout.tsx
 *
 * (auth)·(couple)·(photographer) 등 하위 layout.tsx가 이 안에 중첩되고, 최종적으로 각 page.tsx가 children 자리에 렌더된다.
 */

import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Noto_Serif_KR,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["300", "500", "600", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wedding Easy Select — 수천 장의 원본에서, 사랑한 컷만",
  description:
    "업로드 한 번이면 AI가 인물과 장면으로 분류하고, 두 사람이 나란히 비교하며 고릅니다. 셀렉부터 전달까지, 웨딩 사진의 모든 여정을 한 곳에서.",
  openGraph: {
    title: "Wedding Easy Select — 웨딩 사진 셀렉, 다시 설계하다",
    description:
      "AI 자동 분류와 비교·협업 셀렉으로 선택과 전달 시간을 단축합니다.",
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
      className={`${cormorantGaramond.variable} ${notoSerifKr.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendardvariable.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
