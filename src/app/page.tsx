"use client";

import { useState, type ReactNode } from "react";
import { useComingSoonToast } from "@/components/app/ComingSoonToast";
import { LandingNav } from "./_components/LandingNav";
import { QnAAccordion } from "./_components/QnAAccordion";
import { Reveal, type RevealDelay } from "./_components/Reveal";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  UploadIcon,
  UsersIcon,
  SparkleIcon,
  CollabIcon,
  CommentIcon,
  DocIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginModal, type LoginRequest } from "@/components/LoginModal";
import type { LoginIntent } from "@/lib/auth/loginFlow";

/* ─── 기능 카드 데이터 (피그마 Landing/Features 카피) ─── */
const FEATURES = [
  {
    title: "여러 장을 한 번에 올리는 업로드",
    desc: "이미지 파일을 여러 장 선택하여 끌어다 놓아 한 번에 업로드합니다.",
    Icon: UploadIcon,
  },
  {
    title: "AI가 자동 분류",
    desc: "비슷한 컷은 AI가 알아서 묶어줍니다. 원하는 사진을 바로 찾을 수 있습니다.",
    Icon: UsersIcon,
  },
  {
    title: "고르기 어려울 땐, AI 셀렉",
    desc: "고민되는 컷은 AI 추천으로 시작하세요. 폴더별로 잘 나온 사진을 선택 장수에 맞게 제안하고, 최종 선택은 직접 합니다.",
    Icon: SparkleIcon,
  },
  {
    title: "함께 고르는 협업 셀렉",
    desc: "가족·지인을 초대해 좋아요와 댓글로 의견을 모읍니다.",
    Icon: CollabIcon,
  },
  {
    title: "사진을 보며 바로 보정 요청",
    desc: "사진을 보면서 바로 보정 요청을 남기면, 작가에게 깔끔하게 정리되어 전달됩니다.",
    Icon: CommentIcon,
  },
  {
    title: "선택본부터 보정본까지 한 곳에서",
    desc: "고른 컷은 작가에게 바로 전달되고, 완성된 보정본도 같은 곳에서 받습니다.",
    Icon: DocIcon,
  },
];

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
   href가 없는 항목은 준비 중 — 클릭 시 준비 중 토스트를 띄운다 (사용자 결정) */
const FOOTER_COLUMNS: {
  title: string;
  links: { label: string; href?: string }[];
}[] = [
  {
    title: "서비스",
    links: [
      { label: "기능 소개", href: "#features" },
      { label: "자주 묻는 질문", href: "#qna" },
      { label: "가격 안내" },
    ],
  },
  {
    title: "지원",
    links: [
      { label: "이용 가이드" },
      { label: "문의하기" },
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
  const [login, setLogin] = useState<LoginRequest | null>(null);

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
        <section
          className="bg-background-default-main border-b border-divider-default pt-36 pb-20 max-[820px]:pt-28 max-[820px]:pb-14"
          aria-labelledby="hero-h"
        >
          <div className="max-w-wrap mx-auto px-6 flex items-center justify-between gap-10 max-[900px]:flex-col max-[900px]:items-start">
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
                완성돼요.
              </p>

              {/* 역할별 진입은 Who it's for 카드의 버튼에서 — 히어로는 그리로 안내만 한다 */}
              <a
                href="#audiences"
                className="inline-flex items-center gap-1 pb-px type-label-medium-m text-brand-secondary-dark border-b border-brand-secondary-lightness transition-colors duration-fast hover:text-brand-secondary-default hover:border-brand-secondary-default"
              >
                나에게 맞는 시작 찾기
                <ArrowDownIcon size={14} />
              </a>
            </div>

            {/* 우: 웨딩 사진 자리 (시안 400×500) — TODO: 실제 이미지로 교체
                 <Image src="/images/hero-wedding.jpg" alt="웨딩 사진" fill className="object-cover" />
                 플레이스홀더는 실사진 교체 전 임시 — 브랜드 올리브 그라데이션(C1 랜딩 C2 결정) */}
            <div
              aria-hidden
              className="w-100 h-125 shrink-0 rounded-(--radius-24) bg-linear-to-br from-brand-secondary-background to-brand-secondary-lightness max-[900px]:w-full max-[900px]:h-80"
            />
          </div>
        </section>

        {/* ═══ FEATURES (피그마 Landing/Features) ═══ */}
        <section
          className="bg-background-default-main border-b border-divider-default py-20 max-[640px]:py-14"
          id="features"
          aria-labelledby="feat-h"
        >
          <div className="max-w-wrap mx-auto px-6 flex flex-col items-center gap-12">
            <Reveal className="flex flex-col items-center gap-4 text-center max-w-140">
              <p className="type-label-eyebrow text-brand-secondary-default">
                What we do
              </p>
              <h2 id="feat-h" className="type-maintext-s text-contents-light-bgd-default">
                사진 셀렉,
                <br />
                이렇게 달라집니다.
              </h2>
              <p className="type-content-l text-contents-light-bgd-sub">
                수천 장을 밤새 넘기고, 비슷한 컷을 비교하고, 서로 다른 취향을
                맞추는 일.
                <br />
                사진 셀렉에 맞는 도구가 없어서였습니다.
              </p>
            </Reveal>

            <div className="grid grid-cols-3 gap-6 w-full max-[820px]:grid-cols-2 max-[520px]:grid-cols-1">
              {FEATURES.map(({ title, desc, Icon }, i) => (
                <Reveal key={title} delay={(i + 1) as RevealDelay}>
                  {/* 리빌(래퍼)과 호버 떠오름(카드)을 다른 요소에 두어 transform 충돌을 피한다 */}
                  <div className="h-full bg-background-default-main border border-divider-default rounded-(--radius-16) p-8 flex flex-col gap-5 transition-[border-color,translate,box-shadow] duration-base ease-out hover:border-brand-secondary-light hover:-translate-y-0.75 hover:shadow-(--shadow-hover)">
                    <div className="self-start rounded-(--radius-12) bg-brand-secondary-background p-3 text-brand-secondary-default">
                      <span className="flex size-6 items-center justify-center">
                        <Icon />
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="type-title-m text-contents-light-bgd-default">
                        {title}
                      </h3>
                      <p className="type-content-m text-contents-light-bgd-sub">
                        {desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ AUDIENCES (피그마 Landing/Audiences) ═══ */}
        <section
          className="bg-background-default-main border-b border-divider-default py-20 max-[640px]:py-14"
          id="audiences"
          aria-labelledby="aud-h"
        >
          <div className="max-w-wrap mx-auto px-6 flex flex-col items-center gap-12">
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
                        onClick={() =>
                          setLogin({ mode: "signup", intent: cta.intent })
                        }
                      >
                        {cta.label}
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Q&A (피그마 Landing/QnA) ═══ */}
        <section
          className="bg-background-default-main border-b border-divider-default py-20 max-[640px]:py-14"
          id="qna"
          aria-labelledby="qna-h"
        >
          <div className="max-w-wrap mx-auto px-6 flex flex-col items-center gap-12">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <p className="type-label-eyebrow text-brand-secondary-default">FAQ</p>
              <h2 id="qna-h" className="type-maintext-s text-contents-light-bgd-default">
                자주 묻는 질문
              </h2>
            </Reveal>
            <QnAAccordion />
          </div>
        </section>

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
