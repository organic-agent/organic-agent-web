"use client";

// OAuth 연동 전까지 임시로 로그인 모달을 건너뛰고 바로 이동시킴.
// 실제 로그인을 붙일 때는 아래 주석을 해제하고 Button의 href를 onClick으로 되돌리기.
// import { useState } from "react";
import { LandingNav } from "./_components/LandingNav";
import { WaitlistForm } from "./_components/WaitlistForm";
import { QnAAccordion } from "./_components/QnAAccordion";
import { Reveal } from "./_components/Reveal";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
// import { LoginModal } from "@/components/LoginModal";

/* ─── 아이콘 헬퍼 ─── */
function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ─── 기능 카드 데이터 ─── */
const FEATURES = [
  {
    title: "여러 장을 한 번에 올리는 업로드",
    desc: "이미지 파일을 여러 장 선택하거나 끌어다 놓아 한 번에 업로드합니다.",
    icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  },
  {
    title: "AI가 인물과 장면을 분류",
    desc: "신랑·신부·사물, 야외·실내까지 자동 정리. 원하는 조합으로 필터링해서 볼 수 있습니다.",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
  {
    title: "나란히 비교, 빠르게 선택",
    desc: "2장·4장·N장을 나란히 놓고 한눈에 비교. 키보드·스와이프·클릭 어느 것으로든 150ms 안에 다음 컷으로.",
    icon: "M9 3H4a1 1 0 00-1 1v6a1 1 0 001 1h5a1 1 0 001-1V4a1 1 0 00-1-1zM20 3h-5a1 1 0 00-1 1v6a1 1 0 001 1h5a1 1 0 001-1V4a1 1 0 00-1-1zM12 2v20",
  },
  {
    title: "함께 고르는 협업 셀렉",
    desc: "가족·지인을 초대해 이모지 투표와 댓글로 의견을 모읍니다. 엇갈린 선택은 따로 모아 정리해줍니다.",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M9 7a4 4 0 100 8M16 3.13a4 4 0 010 7.75",
  },
  {
    title: "사진 위에서 바로 보정 요청",
    desc: "사진 위에 핀을 찍고 코멘트를 남기면, 작가에게 깔끔하게 정리되어 전달됩니다.",
    icon: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  },
  {
    title: "선택본 전달과 정산까지",
    desc: "고른 컷만 모아 다운로드. 작가에게 바로 전달되고, 정산 리포트도 한 화면에서 확인합니다.",
    icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  },
];

export default function LandingPage() {
  // const [loginOpen, setLoginOpen] = useState(false);
  // const [loginIntent, setLoginIntent] = useState<"couple" | "studio">("couple");

  return (
    <>
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-0 focus-visible:top-0 focus-visible:z-[200] focus-visible:bg-ink focus-visible:text-on-ink focus-visible:py-3 focus-visible:px-[18px] focus-visible:rounded-br-[10px] focus-visible:text-sm"
      >
        본문으로 건너뛰기
      </a>

      <LandingNav />

      <main id="main">
        {/* ═══ HERO — 좌우 분할 ═══ */}
        <section
          className="pt-[120px] pb-[80px] bg-paper max-[820px]:pt-[100px] max-[820px]:pb-[60px]"
          aria-labelledby="hero-h"
        >
          <div className="max-w-wrap mx-auto px-6 grid lg:grid-cols-2 items-center gap-10 lg:gap-14">
            {/* 좌: 텍스트 + CTA */}
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-5">
                Wedding Easy Select
              </p>
              <h1
                id="hero-h"
                className="font-display-ko font-medium text-[clamp(36px,5.6vw,52px)] leading-[1.05] tracking-[-0.02em] text-ink mb-6"
              >
                우리의 순간을,
                <br />
                함께 고르다.
              </h1>
              <p className="text-[16px] leading-relaxed text-ink-2 max-w-[440px] mb-9">
                스튜디오가 촬영한 원본을 한 곳에서 확인하고, 부부와 가족이 함께
                마음에 드는 사진을 고르고 투표하세요. 셀렉이 이렇게 쉬웠던 적은
                없어요.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  size="lg"
                  icon={<ArrowIcon />}
                  href="/gallery"
                  // onClick={() => {
                  //   setLoginIntent("couple");
                  //   setLoginOpen(true);
                  // }}
                >
                  내 갤러리 보기
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  href="/onboarding/studio"
                  // onClick={() => {
                  //   setLoginIntent("studio");
                  //   setLoginOpen(true);
                  // }}
                >
                  스튜디오 시작하기
                </Button>
              </div>

              {/* 웨이트리스트 스크롤 링크 — 런칭 시 이 줄만 삭제 */}
              <a
                href="#waitlist"
                className="inline-flex items-center gap-1.5 mt-5 text-[13px] text-ink-3 hover:text-accent transition-colors"
              >
                서비스 오픈 알림 받기
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </a>
            </div>

            {/* 우: 웨딩 사진 */}
            <div className="relative h-[380px] lg:h-[520px] max-[820px]:h-[320px]">
              <div className="absolute inset-0 rounded-[24px] overflow-hidden shadow-2xl bg-paper-deep">
                {/* TODO: 실제 웨딩 사진 이미지로 교체
                     <Image src="/images/hero-wedding.jpg" alt="웨딩 사진" fill className="object-cover" /> */}
                <div className="w-full h-full flex items-center justify-center text-ink-3">
                  <div className="text-center">
                    <svg
                      className="mx-auto mb-3 text-line-strong"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <p className="text-sm text-ink-3">웨딩 사진 영역</p>
                    <p className="text-xs text-ink-3/60 mt-1">
                      실제 이미지로 교체 예정
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-0 border-t border-line" />

        {/* ═══ FEATURES ═══ */}
        <section
          className="bg-paper-deep py-[100px] max-[640px]:py-16"
          id="features"
          aria-labelledby="feat-h"
        >
          <div className="max-w-wrap mx-auto px-6">
            <Reveal className="text-center max-w-[600px] mx-auto mb-14">
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-4">
                What we do
              </p>
              <h2
                id="feat-h"
                className="font-display-ko font-medium text-[clamp(26px,4vw,38px)] leading-snug tracking-[-0.01em] text-ink mb-3.5"
              >
                웨딩 사진 셀렉,
                <br />
                이렇게 달라집니다.
              </h2>
              <p className="text-[15px] leading-relaxed text-ink-2">
                수천 장을 밤새 넘기고, 비슷한 컷을 비교하고, 서로 다른 취향을
                맞추는 일. 도구가 없어서가 아니라, 웨딩에 맞는 도구가
                없어서였습니다.
              </p>
            </Reveal>

            <div className="grid grid-cols-3 gap-5 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1">
              {FEATURES.map((feat, i) => (
                <Reveal
                  key={i}
                  className="bg-paper border border-line rounded-lg p-8 px-7 transition-all duration-base ease-out hover:-translate-y-[3px] hover:shadow-md"
                  delay={((i % 3) + 1) as 1 | 2 | 3}
                >
                  <div className="w-12 h-12 rounded-md bg-ink text-on-ink grid place-items-center mb-5">
                    <div className="w-[22px] h-[22px]">
                      <Icon d={feat.icon} />
                    </div>
                  </div>
                  <h3 className="font-display-ko font-medium text-[19px] text-ink leading-snug tracking-[-0.01em] mb-2.5">
                    {feat.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-2">
                    {feat.desc}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-0 border-t border-line" />

        {/* ═══ AUDIENCES ═══ */}
        <section
          className="bg-paper py-[100px] max-[640px]:py-16"
          id="audiences"
          aria-labelledby="aud-h"
        >
          <div className="max-w-wrap mx-auto px-6">
            <Reveal className="text-center max-w-[600px] mx-auto mb-14">
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-4">
                Who it&apos;s for
              </p>
              <h2
                id="aud-h"
                className="font-display-ko font-medium text-[clamp(26px,4vw,38px)] leading-snug tracking-[-0.01em] text-ink mb-3.5"
              >
                두 사람에게도, 작가에게도.
              </h2>
            </Reveal>

            <div className="grid grid-cols-2 gap-5 max-[720px]:grid-cols-1">
              <Reveal
                className="border border-line rounded-lg py-10 px-9 bg-paper-deep transition-all duration-base ease-out hover:-translate-y-[3px] hover:shadow-md"
                delay={1}
              >
                <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-accent mb-[18px]">
                  For Couples · 예비부부
                </div>
                <h3 className="font-display-ko font-medium text-2xl text-ink leading-snug tracking-[-0.01em] mb-3.5">
                  각자 모바일로,
                  <br />
                  함께 고릅니다.
                </h3>
                <p className="text-[15px] leading-relaxed text-ink-2 mb-[22px]">
                  출퇴근길에도 스와이프로 셀렉. 서로의 선택이 실시간으로 모이고,
                  마음에 든 컷만 남습니다.
                </p>
                <ul className="flex flex-col gap-2.5">
                  {[
                    "모바일 우선 · 스와이프 셀렉",
                    "카테고리별 갤러리 · 미분류 정리",
                    "선택본 다운로드",
                  ].map((text) => (
                    <li
                      key={text}
                      className="flex gap-2.5 items-center text-sm text-ink-2"
                    >
                      <span className="w-[5px] h-[5px] rounded-full bg-accent shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal
                className="border border-line rounded-lg py-10 px-9 bg-paper-deep transition-all duration-base ease-out hover:-translate-y-[3px] hover:shadow-md"
                delay={2}
              >
                <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-accent mb-[18px]">
                  For Studios · 사진작가
                </div>
                <h3 className="font-display-ko font-medium text-2xl text-ink leading-snug tracking-[-0.01em] mb-3.5">
                  여러 갤러리를
                  <br />한 콘솔에서.
                </h3>
                <p className="text-[15px] leading-relaxed text-ink-2 mb-[22px]">
                  업로드 후 전달 업무는 자동으로 줄어듭니다. 셀렉 현황부터
                  정산까지 한 화면에서 관리하세요.
                </p>
                <ul className="flex flex-col gap-2.5">
                  {[
                    "여러 이미지 일괄 업로드",
                    "초대 링크 · 셀렉 진행 현황",
                    "보정 요청 정리 · 정산 리포트",
                  ].map((text) => (
                    <li
                      key={text}
                      className="flex gap-2.5 items-center text-sm text-ink-2"
                    >
                      <span className="w-[5px] h-[5px] rounded-full bg-accent shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        <hr className="border-0 border-t border-line" />

        {/* ═══ Q&A ═══ */}
        <section
          className="bg-paper py-[100px] max-[640px]:py-16"
          id="qna"
          aria-labelledby="qna-h"
        >
          <div className="max-w-wrap mx-auto px-6">
            <Reveal className="text-center max-w-[600px] mx-auto mb-14">
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-4">
                FAQ
              </p>
              <h2
                id="qna-h"
                className="font-display-ko font-medium text-[clamp(26px,4vw,38px)] leading-snug tracking-[-0.01em] text-ink mb-3.5"
              >
                자주 묻는 질문
              </h2>
            </Reveal>
            <QnAAccordion />
          </div>
        </section>

        <hr className="border-0 border-t border-line" />

        {/* ═══ WAITLIST — 하단 섹션 (런칭 시 이 섹션 전체 삭제) ═══ */}
        <section
          className="bg-paper-deep py-[80px] max-[640px]:py-14"
          id="waitlist"
          aria-labelledby="wl-h"
        >
          <div className="max-w-wrap mx-auto px-6 text-center">
            <Reveal>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-4">
                Waitlist
              </p>
              <h2
                id="wl-h"
                className="font-display-ko font-medium text-[clamp(22px,3.5vw,32px)] leading-snug tracking-[-0.01em] text-ink mb-3.5"
              >
                가장 먼저 만나보세요
              </h2>
              <p className="text-[15px] leading-relaxed text-ink-2 max-w-[44ch] mx-auto mb-9">
                서비스 오픈 소식과 초대장을 가장 먼저 받으실 수 있어요.
              </p>
              <WaitlistForm />
            </Reveal>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-ink text-on-ink-2 pt-16 pb-10">
        <div className="max-w-wrap mx-auto px-6">
          <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-10 mb-12 max-[720px]:grid-cols-2 max-[480px]:grid-cols-1">
            <div>
              <div className="flex items-center gap-[10px]">
                <BrandLogo size={28} className="shrink-0 text-white/60" />
                <span className="flex flex-col leading-[1.15]">
                  <b className="font-display-en font-semibold text-[17px] tracking-[0.01em] text-on-ink">
                    Wedding Easy Select
                  </b>
                  <small className="font-mono text-[9px] tracking-[0.18em] uppercase text-on-ink-2">
                    Making Your Wedding Simple
                  </small>
                </span>
              </div>
              <p className="mt-3.5 text-[13px] leading-relaxed text-on-ink-2 max-w-[26ch]">
                웨딩 사진 여정에 특화된
                <br />
                한국어 셀렉 서비스
              </p>
            </div>
            {[
              {
                title: "서비스",
                links: [
                  { label: "기능 소개", href: "#features" },
                  { label: "자주 묻는 질문", href: "#qna" },
                  { label: "가격 안내", href: "#" },
                ],
              },
              {
                title: "지원",
                links: [
                  { label: "이용 가이드", href: "#" },
                  { label: "문의하기", href: "#" },
                  { label: "공지사항", href: "#" },
                ],
              },
              {
                title: "회사",
                links: [
                  { label: "팀 소개", href: "#" },
                  { label: "채용", href: "#" },
                  { label: "블로그", href: "#" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-mono text-[10px] tracking-[0.16em] uppercase text-on-ink-2 mb-[18px]">
                  {col.title}
                </h4>
                {col.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-white/60 py-[5px] transition-colors duration-fast hover:text-on-ink"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-on-ink-line pt-6 flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-white/40">
              © 2026 Wedding Easy Select
            </span>
            <div className="flex gap-5">
              <a
                href="#"
                className="text-xs text-white/40 transition-colors duration-fast hover:text-on-ink"
              >
                이용약관
              </a>
              <a
                href="#"
                className="text-xs text-white/40 transition-colors duration-fast hover:text-on-ink"
              >
                개인정보처리방침
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 로그인 모달 (히어로 CTA에서도 열림) — OAuth 연동 전까지 비활성화
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        intent={loginIntent}
      /> */}
    </>
  );
}
