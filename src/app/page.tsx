"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { SUPPORT_CHAT_URL } from "@/lib/support";
import { Band } from "./_components/Band";
import { FlowSection } from "./_components/FlowSection";
import { LandingNav } from "./_components/LandingNav";
import { QnAAccordion } from "./_components/QnAAccordion";
import { Reveal, type RevealDelay } from "./_components/Reveal";
import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginModal, type LoginRequest } from "@/components/LoginModal";
import { useAuth } from "@/lib/auth/authStore";
import type { LoginIntent } from "@/lib/auth/loginFlow";

/* ─── 대상별 카드 데이터 (v2: 왼쪽 스튜디오 첫 개설 작가 · 오른쪽 개인 클라이언트)
   초대받은 클라이언트는 작가의 링크로 들어오므로 랜딩의 대상이 아니다. */
const AUDIENCES: {
  eyebrow: string;
  title: ReactNode;
  desc: string;
  items: string[];
  cta: { label: string; intent: LoginIntent };
}[] = [
  {
    eyebrow: "For Studios",
    title: (
      <>
        여러 갤러리를,
        <br />
        하나의 작업 공간에서
      </>
    ),
    desc: "스튜디오를 만들고 갤러리마다 초대 링크를 보내면, 셀렉 진행부터 보정 요청까지 한 화면에서 관리할 수 있습니다.",
    items: [
      "갤러리별 초대 링크 · 셀렉 진행 현황",
      "보정 요청 한눈에 정리",
      "팀원과 함께 쓰는 작업 공간",
    ],
    cta: { label: "무료로 스튜디오 만들기", intent: "studio" },
  },
  {
    eyebrow: "For Individuals",
    title: (
      <>
        받은 사진을,
        <br />
        직접 올려 고릅니다.
      </>
    ),
    desc: "작가에게 받은 원본을 그대로 올려 보세요. 비슷한 컷은 자동으로 묶이고, 파트너와 함께 고를 수 있습니다.",
    items: [
      "여러 장 한 번에 업로드 · 자동 분류",
      "파트너를 초대해 함께 선택",
      "고른 사진 목록 정리",
    ],
    cta: { label: "무료로 내 갤러리 만들기", intent: "personal" },
  },
];

/* ─── 푸터 링크 데이터 (피그마 Landing/Footer) ───
   href가 없는 항목은 준비 중 — 클릭 시 준비 중 토스트를 띄운다 (사용자 결정).
   "문의하기"는 카카오톡 채널 채팅(바깥 주소 → 새 탭, 팀 노션 77번) */
const FOOTER_COLUMNS: {
  title: string;
  links: { label: string; href?: string }[];
}[] = [
  {
    title: "서비스",
    links: [
      { label: "기능 소개", href: "#flow" },
      { label: "자주 묻는 질문", href: "#qna" },
      { label: "가격 안내" },
    ],
  },
  {
    title: "지원",
    links: [
      { label: "이용 가이드" },
      { label: "문의하기", href: SUPPORT_CHAT_URL },
      { label: "공지사항" },
    ],
  },
  {
    title: "회사",
    links: [{ label: "팀 소개" }, { label: "채용" }, { label: "블로그" }],
  },
];

export default function LandingPage() {
  // 푸터의 준비 중 링크 안내용
  const { showComingSoon, comingSoonToast } = useComingSoonToast();
  // 로그인 모달 — nav(로그인·회원가입)와 대상 카드 버튼이 함께 쓴다. null이면 닫힘.
  // 카드 버튼은 신규 여부를 알 수 없어 항상 회원가입 문구로 열고, 목적지(intent)만 카드별로 다르다.
  // 이미 로그인돼 있으면 모달 없이 그 온보딩으로 바로 간다.
  const [login, setLogin] = useState<LoginRequest | null>(null);
  const auth = useAuth();
  const router = useRouter();
  function startAs(intent: LoginIntent) {
    if (auth.status === "authenticated") {
      router.push(intent === "studio" ? "/onboarding/studio" : "/onboarding/personal");
      return;
    }
    setLogin({ mode: "signup", intent });
  }

  return (
    <>
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-0 focus-visible:top-0 focus-visible:z-200 focus-visible:bg-background-inverse-main focus-visible:text-contents-dark-bgd-default focus-visible:py-3 focus-visible:px-4.5 focus-visible:rounded-br-[10px] focus-visible:text-sm"
      >
        본문으로 건너뛰기
      </a>

      <LandingNav onOpenLogin={setLogin} />

      <main id="main">
        {/* ═══ HERO — 좌: 카피·CTA, 우: 웨딩 사진 (피그마 Landing/Hero) ═══ */}
        <Band
          labelledBy="hero-h"
          className="pt-36 pb-20 max-[820px]:pt-28 max-[820px]:pb-14 flex items-center justify-between gap-10 max-[900px]:flex-col max-[900px]:items-start"
        >
            {/* 좌: 텍스트 + CTA */}
            <div className="flex flex-col items-start gap-5 max-w-107.5">
              <p className="type-label-eyebrow text-brand-secondary-default">
                Easy Select
              </p>
              <h1 id="hero-h" className="type-maintext-l text-contents-light-bgd-default">
                우리의 순간을,
                <br />
                함께 고르다.
              </h1>
              <p className="type-content-l text-contents-light-bgd-sub">
                막막했던 셀렉은 함께 고르는 설렘으로,
                <br />
                번거로웠던 전달은 클릭 한 번으로.
                <br />
                업로드부터 보정 요청, 마무리까지 사진의 여정이 한 곳에서
                완성됩니다.
              </p>

              {/* 역할별 가입은 Who it's for 카드의 버튼에서 — 히어로는 로그인 없이 체험 페이지로(이슈 144) */}
              <Button href="/demo" icon={<ArrowRightIcon />} onClick={() => track("demo_cta_clicked", { from: "hero" })}>
                로그인 없이 체험하기
              </Button>
            </div>

            {/* 우: 웨딩 사진 (시안 400×500). 세로 사진(2:3)이라 가로로 넓어지는 900 미만에서는 얼굴 쪽이 보이게 위쪽에 맞춘다.
                 첫 화면에 바로 보이는 사진이라 미루지 않고 먼저 받는다(loading eager · fetchPriority high) */}
            <div className="relative w-100 h-125 shrink-0 overflow-hidden rounded-(--radius-24) bg-brand-secondary-background max-[900px]:w-full max-[900px]:h-80">
              <Image
                src="/images/hero-wedding.jpg"
                alt="웨딩드레스와 정장을 입고 손을 잡은 채 웃고 있는 신랑 신부"
                fill
                sizes="(max-width: 900px) 100vw, 400px"
                loading="eager"
                fetchPriority="high"
                className="object-cover max-[900px]:object-[50%_22%]"
              />
            </div>
        </Band>

        {/* ═══ 사용 흐름 4단계 — 이슈 144(아이콘 카드 6장 대신) ═══ */}
        <FlowSection />

        {/* ═══ AUDIENCES (피그마 Landing/Audiences) ═══ */}
        <Band id="audiences" labelledBy="aud-h" className="py-20 max-[640px]:py-14 flex flex-col items-center gap-12">
            <Reveal className="flex flex-col items-center gap-4 text-center max-w-140">
              <p className="type-label-eyebrow text-brand-secondary-default">
                Who it&apos;s for
              </p>
              <h2 id="aud-h" className="type-maintext-s text-contents-light-bgd-default">
                찍는 사람에게도, 고르는 사람에게도.
              </h2>
            </Reveal>

            <div className="grid grid-cols-2 gap-6 w-full max-[720px]:grid-cols-1">
              {AUDIENCES.map(({ eyebrow, title, desc, items, cta }, i) => (
                <Reveal key={eyebrow} delay={(i + 1) as RevealDelay}>
                  <div className="h-full bg-background-default-main border border-divider-default rounded-(--radius-16) p-10 flex flex-col gap-4 transition-[border-color,translate,box-shadow] duration-base ease-out hover:border-brand-secondary-light hover:-translate-y-0.75 hover:shadow-(--shadow-hover)">
                    <p className="type-label-eyebrow text-brand-secondary-default">
                      {eyebrow}
                    </p>
                    <h3 className="type-title-xl text-contents-light-bgd-default">
                      {title}
                    </h3>
                    <p className="type-content-m text-contents-light-bgd-sub">
                      {desc}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {items.map((text) => (
                        <li
                          key={text}
                          className="flex items-center gap-2 type-content-m text-contents-light-bgd-sub"
                        >
                          <span className="size-1 rounded-full bg-brand-secondary-default shrink-0" />
                          {text}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-4">
                      <Button
                        icon={<ArrowRightIcon />}
                        onClick={() => startAs(cta.intent)}
                      >
                        {cta.label}
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
        </Band>

        {/* ═══ Q&A (피그마 Landing/QnA) ═══ */}
        <Band id="qna" labelledBy="qna-h" className="py-20 max-[640px]:py-14 flex flex-col items-center gap-12">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <p className="type-label-eyebrow text-brand-secondary-default">FAQ</p>
              <h2 id="qna-h" className="type-maintext-s text-contents-light-bgd-default">
                자주 묻는 질문
              </h2>
            </Reveal>
            <QnAAccordion />
        </Band>

      </main>

      {/* ═══ FOOTER (피그마 Landing/Footer) ═══ */}
      <footer className="bg-background-inverse-main pt-16 pb-10">
        <div className="max-w-wrap mx-auto px-6 flex flex-col gap-12">
          <div className="flex items-start justify-between gap-10 max-[720px]:flex-col">
            {/* 브랜드 */}
            <div className="flex flex-col gap-3 max-w-61.25">
              <div className="flex items-center gap-2">
                <BrandLogo
                  size={32}
                  className="text-contents-dark-bgd-default shrink-0"
                />
                <b className="type-brand-wordmark text-contents-dark-bgd-default">
                  Easy Select
                </b>
              </div>
              <p className="type-content-m text-contents-dark-bgd-weakness">
                업로드부터 전달까지, 사진 셀렉의 모든 과정을 한 곳에서.
              </p>
            </div>

            {/* 링크 컬럼 */}
            <div className="flex gap-12 max-[480px]:flex-col">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title} className="flex flex-col gap-6 w-20">
                  <h4 className="type-label-eyebrow text-contents-dark-bgd-weakness">
                    {col.title}
                  </h4>
                  <div className="flex flex-col gap-3">
                    {col.links.map((link) =>
                      link.href ? (
                        <a
                          key={link.label}
                          href={link.href}
                          onClick={link.href === SUPPORT_CHAT_URL ? () => track("support_chat_clicked", { from: "landing" }) : undefined}
                          // 바깥 주소(카카오톡 채널)는 새 탭으로 — 페이지 안 앵커(#…)는 그대로
                          {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="type-label-medium-m text-contents-dark-bgd-weakness whitespace-nowrap transition-colors duration-fast hover:text-contents-dark-bgd-default"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <button
                          key={link.label}
                          type="button"
                          onClick={showComingSoon}
                          className="cursor-pointer text-left type-label-medium-m text-contents-dark-bgd-weakness whitespace-nowrap transition-colors duration-fast hover:text-contents-dark-bgd-default"
                        >
                          {link.label}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {comingSoonToast}
          <div className="border-t border-surface-inverse-medium pt-6 flex items-center justify-between flex-wrap gap-3">
            <span className="type-content-xs text-contents-dark-bgd-weakness uppercase">
              © 2026 Easy Select
            </span>
            <div className="flex gap-5">
              <a
                href="/terms"
                className="type-label-medium-m text-contents-dark-bgd-weakness transition-colors duration-fast hover:text-contents-dark-bgd-default"
              >
                이용약관
              </a>
              <a
                href="/privacy"
                className="type-label-medium-m text-contents-dark-bgd-weakness transition-colors duration-fast hover:text-contents-dark-bgd-default"
              >
                개인정보처리방침
              </a>
            </div>
          </div>
        </div>
      </footer>

      <LoginModal
        open={login !== null}
        onClose={() => setLogin(null)}
        mode={login?.mode ?? "login"}
        intent={login?.intent ?? "couple"}
      />
    </>
  );
}
