"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { SUPPORT_CHAT_URL } from "@/lib/support";
import { PersonalArt, StudioArt } from "./_components/AudienceArt";
import { Band } from "./_components/Band";
import { ClosingCta } from "./_components/ClosingCta";
import { DemoBand } from "./_components/DemoBand";
import { FlowSection } from "./_components/FlowSection";
import { HeroPhoto } from "./_components/HeroPhoto";
import { LandingNav } from "./_components/LandingNav";
import { PainSection } from "./_components/PainSection";
import { QnAAccordion } from "./_components/QnAAccordion";
import { Reveal, type RevealDelay } from "./_components/Reveal";
import { TogetherSection } from "./_components/TogetherSection";
import { ViewfinderText } from "./_components/Viewfinder";
import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginModal, type LoginRequest } from "@/components/LoginModal";
import { useAuth } from "@/lib/auth/authStore";
import { spaceChip, type LoginIntent } from "@/lib/auth/loginFlow";

/* ─── 대상별 카드 데이터 (v2: 왼쪽 스튜디오 첫 개설 작가 · 오른쪽 개인 클라이언트)
   초대받은 클라이언트는 작가의 링크로 들어오므로 랜딩의 대상이 아니다. 카드 위 그림은 AudienceArt(이슈 182). */
const AUDIENCES: {
  eyebrow: string;
  title: ReactNode;
  desc: string;
  items: string[];
  cta: { label: string; intent: LoginIntent };
  art: ReactNode;
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
    art: <StudioArt />,
  },
  {
    eyebrow: "For Individuals",
    title: (
      <>
        받은 사진을,
        <br />
        직접 올려 고릅니다
      </>
    ),
    desc: "작가에게 받은 원본을 그대로 올려 보세요. 비슷한 컷은 자동으로 묶이고, 파트너와 함께 고를 수 있습니다.",
    items: [
      "여러 장 한 번에 업로드 · 자동 분류",
      "파트너를 초대해 함께 선택",
      "고른 사진 목록 정리",
    ],
    cta: { label: "무료로 내 갤러리 만들기", intent: "personal" },
    art: <PersonalArt />,
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
  // 히어로 · 마무리의 "무료로 시작하기" — 역할을 모르니 상단 바 회원가입과 같은 문(couple → 로그인 뒤 역할 선택).
  // 이미 로그인돼 있으면 상단 바 소속 칩과 같은 곳(최근 공간, 소속이 없으면 역할 선택)으로.
  function startFree() {
    if (auth.status === "authenticated") {
      router.push(spaceChip(auth.user).href);
      return;
    }
    setLogin({ mode: "signup", intent: "couple" });
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
        {/* ═══ HERO — 좌: 카피·CTA, 우: 웨딩 사진 + 제품 표시(이슈 182 시안 D 2-1) ═══ */}
        <Band
          labelledBy="hero-h"
          className="pt-36 pb-24 max-[820px]:pt-28 max-[820px]:pb-16 flex items-center justify-between gap-16 max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-12"
        >
            {/* 좌: 텍스트 + CTA. "함께"만 로고의 뷰파인더 모서리로 감싼다 */}
            <div className="flex flex-col items-start gap-5 max-w-125">
              <p className="type-label-eyebrow text-brand-accent-default">
                Easy Select
              </p>
              <h1 id="hero-h" className="type-maintext-xl text-contents-light-bgd-default max-[820px]:text-[40px]!">
                우리의 순간을,
                <br />
                <ViewfinderText size="lg">함께</ViewfinderText> 고르다.
              </h1>
              <p className="type-content-xl text-contents-light-bgd-sub max-[820px]:text-base!">
                막막했던 셀렉은 함께 고르는 설렘으로,{" "}
                <br className="max-[820px]:hidden" />
                번거로웠던 전달은 클릭 한 번으로.{" "}
                <br className="max-[820px]:hidden" />
                업로드부터 보정 작성, 마무리까지 사진의 여정이 한 곳에서
                완성됩니다.
              </p>

              {/* 체험이 주 버튼(이슈 144), 가입은 옆 글자 버튼 — 역할은 로그인 뒤 고른다 */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button href="/demo" size="lg" icon={<ArrowRightIcon />} onClick={() => track("demo_cta_clicked", { from: "hero" })}>
                  로그인 없이 체험하기
                </Button>
                <Button kind="ghost" size="lg" onClick={startFree}>
                  무료로 시작하기
                </Button>
              </div>
            </div>

            <HeroPhoto />
        </Band>

        {/* ═══ 문제 제기 — 단톡방 한 창 ↔ 사진 한 장(이슈 182) ═══ */}
        <PainSection />

        {/* ═══ 사용 흐름 4단계 — 이슈 144(아이콘 카드 6장 대신) → 이슈 182 좌우 2단 ═══ */}
        <FlowSection />

        {/* ═══ 함께 고르기 — 가족 의견은 사진마다(이슈 182) ═══ */}
        <TogetherSection />

        {/* ═══ AUDIENCES — 카드 위 그림 + 글(이슈 182) ═══ */}
        <Band id="audiences" labelledBy="aud-h" className="py-28 max-[640px]:py-18 flex flex-col items-center gap-12 max-[640px]:gap-8">
            <Reveal className="flex flex-col items-center gap-4 text-center max-w-140">
              <p className="type-label-eyebrow text-brand-accent-default">
                Who it&apos;s for
              </p>
              <h2 id="aud-h" className="type-maintext-s text-contents-light-bgd-default max-[640px]:text-[26px]!">
                찍는 사람에게도, 고르는 사람에게도.
              </h2>
            </Reveal>

            <div className="grid grid-cols-2 gap-6 w-full max-[720px]:grid-cols-1">
              {AUDIENCES.map(({ eyebrow, title, desc, items, cta, art }, i) => (
                <Reveal key={eyebrow} delay={(i + 1) as RevealDelay}>
                  <div className="h-full overflow-hidden bg-background-default-main border border-divider-default rounded-(--radius-24) flex flex-col transition-[border-color,translate,box-shadow] duration-base ease-out hover:border-brand-secondary-light hover:-translate-y-0.75 hover:shadow-(--shadow-hover)">
                    <div className="h-59 shrink-0 overflow-hidden">{art}</div>
                    <div className="flex flex-1 flex-col gap-4 px-9 pt-8 pb-9 max-[640px]:px-6 max-[640px]:pt-6 max-[640px]:pb-7">
                      <p className="type-label-eyebrow text-brand-accent-default">
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
                  </div>
                </Reveal>
              ))}
            </div>
        </Band>

        {/* ═══ 체험 띠 — 가입 전에 샘플 갤러리로(이슈 182) ═══ */}
        <DemoBand />

        {/* ═══ Q&A — 2단: 제목 · 문의하기 | 목록(이슈 182) ═══ */}
        <Band id="qna" labelledBy="qna-h" className="grid grid-cols-[320px_1fr] items-start gap-14 py-28 max-[820px]:grid-cols-1 max-[820px]:gap-6 max-[640px]:py-18">
            <Reveal className="flex flex-col items-start gap-3.5">
              <p className="type-label-eyebrow text-brand-accent-default">FAQ</p>
              <h2 id="qna-h" className="type-maintext-s text-contents-light-bgd-default">
                자주 묻는 질문
              </h2>
              <a
                href={SUPPORT_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("support_chat_clicked", { from: "landing" })}
                className="inline-flex items-center gap-1 type-label-medium-m text-brand-accent-text transition-colors duration-fast hover:text-brand-accent-default"
              >
                더 궁금한 점은 문의하기
                <ArrowRightIcon size={16} />
              </a>
            </Reveal>
            <QnAAccordion wide />
        </Band>

        {/* ═══ 마무리 — 보라 상자 2단(이슈 182) ═══ */}
        <ClosingCta onStart={startFree} />

      </main>

      {/* ═══ FOOTER — 연보라(이슈 182, 마무리 상자와 이어짐) ═══ */}
      <footer className="bg-brand-secondary-background/55 pt-16 pb-10">
        <div className="max-w-wrap mx-auto px-6 flex flex-col gap-12">
          <div className="flex items-start justify-between gap-10 max-[720px]:flex-col">
            {/* 브랜드 */}
            <div className="flex flex-col gap-3 max-w-61.25">
              <div className="flex items-center gap-2">
                <BrandLogo
                  size={32}
                  className="text-contents-light-bgd-default shrink-0"
                />
                <b className="type-brand-wordmark text-contents-light-bgd-default">
                  Easy Select
                </b>
              </div>
              <p className="type-content-m text-contents-light-bgd-sub">
                업로드부터 전달까지, 사진 셀렉의 모든 과정을 한 곳에서.
              </p>
            </div>

            {/* 링크 컬럼 */}
            <div className="flex gap-12 max-[480px]:flex-col">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title} className="flex flex-col gap-6 w-20">
                  <h4 className="type-label-eyebrow text-contents-light-bgd-weakness">
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
                          className="type-label-medium-m text-contents-light-bgd-sub whitespace-nowrap transition-colors duration-fast hover:text-contents-light-bgd-default"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <button
                          key={link.label}
                          type="button"
                          onClick={showComingSoon}
                          className="cursor-pointer text-left type-label-medium-m text-contents-light-bgd-sub whitespace-nowrap transition-colors duration-fast hover:text-contents-light-bgd-default"
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
          <div className="border-t border-divider-default pt-6 flex items-center justify-between flex-wrap gap-3">
            <span className="type-content-xs text-contents-light-bgd-weakness uppercase">
              © 2026 Easy Select
            </span>
            <div className="flex gap-5">
              <a
                href="/terms"
                className="type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
              >
                이용약관
              </a>
              <a
                href="/privacy"
                className="type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
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
