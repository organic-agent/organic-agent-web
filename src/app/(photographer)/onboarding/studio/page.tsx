"use client";

/**
 * 작가 — 스튜디오 생성 페이지
 * 위치: src/app/(photographer)/onboarding/studio/page.tsx
 *
 * 로그인 직후 최초 1회 사용하는 스튜디오 생성 화면이다.
 * 업체명, 갤러리 주소, 유입 경로를 입력받아 목업 스튜디오 정보로 저장한다.
 *
 * 주요 책임:
 * - 스튜디오 생성 폼 상태 관리
 * - 갤러리 주소 형식 검증
 * - 스튜디오 정보 저장 후 온보딩 이동
 *
 * 참고:
 * - 실제로는 POST /api/v1/studios와 GET /studios/url-available 연결 예정이다.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { saveStudioInfo } from "@/lib/studio";

const SOURCES = [
  {
    key: "search",
    label: "검색",
    icon: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  },
  {
    key: "instagram",
    label: "인스타그램",
    icon: "M2 2h20v20H2zM16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01",
  },
  {
    key: "referral",
    label: "지인 추천",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  },
  { key: "etc", label: "기타", icon: "M12 5v14M5 12h14" },
];

export default function StudioNewPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<string | null>(null);

  // 목업 URL 검증
  const studioSlug = url.trim().toLowerCase();
  const urlValid = studioSlug.length >= 3 && /^[a-z0-9-]+$/.test(studioSlug);
  const canSubmit = name.trim().length > 0 && urlValid && source !== null;

  function handleSubmit() {
    // 회의 후: await fetch("/api/v1/studios", {...});
    saveStudioInfo({ name: name.trim(), url: studioSlug, source });
    console.log("스튜디오 생성(목업):", { name, url, source });
    router.push("/onboarding/gallery");
  }

  return (
    <main className="min-h-dvh bg-white grid place-items-center px-6 py-12">
      <div className="w-full max-w-[460px]">
        {/* 뒤로가기 (랜딩으로) */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-6"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          홈으로
        </Link>

        {/* 브랜드 + 진행 표시 */}
        <div className="flex items-center gap-2.5 mb-8">
          <BrandLogo size={26} className="text-ink" />
          <b className="font-display-en font-semibold text-[16px] text-ink">
            Wedding Easy Select
          </b>
        </div>

        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-3">
          Set up your studio
        </p>
        <h1 className="font-display-ko font-medium text-[28px] leading-snug tracking-[-0.02em] text-ink mb-2">
          스튜디오를 만들어볼까요
        </h1>
        <p className="text-[14px] text-ink-2 mb-9">
          신혼부부에게 보여질 스튜디오 정보예요. 나중에 언제든 바꿀 수 있어요.
        </p>

        {/* 업체명 */}
        <div className="mb-6">
          <label className="block text-[13px] font-medium text-ink mb-2">
            업체명
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 세로라 스튜디오"
            className="w-full h-12 px-4 rounded-md border border-line text-[14px] text-ink outline-none focus:border-ink transition-colors placeholder:text-ink-3"
          />
        </div>

        {/* 갤러리 URL */}
        <div className="mb-6">
          <label className="block text-[13px] font-medium text-ink mb-2">
            갤러리 주소
          </label>
          <div className="flex items-center h-12 rounded-md border border-line focus-within:border-ink transition-colors overflow-hidden">
            <span className="pl-4 pr-1 text-[14px] text-ink-3 font-mono select-none">
              studio/
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value.toLowerCase())}
              placeholder="serora"
              className="flex-1 h-full pr-4 text-[14px] text-ink outline-none font-mono placeholder:text-ink-3 min-w-0"
            />
          </div>
          {/* 검증 메시지 */}
          <p
            className={`text-[12px] mt-1.5 ${url.length === 0 ? "text-ink-3" : urlValid ? "text-select" : "text-accent"}`}
          >
            {url.length === 0
              ? "영문 소문자·숫자·하이픈만 사용할 수 있어요"
              : urlValid
                ? "✓ 사용할 수 있는 주소예요"
                : "3글자 이상, 영문 소문자·숫자·하이픈만 가능해요"}
          </p>
        </div>

        {/* 유입경로 */}
        <div className="mb-9">
          <label className="block text-[13px] font-medium text-ink mb-2">
            어떻게 알고 오셨나요?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {SOURCES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSource(s.key)}
                className={`flex items-center gap-2.5 h-12 px-4 rounded-md border text-[13px] font-medium transition-all ${
                  source === s.key
                    ? "border-ink bg-ink text-on-ink"
                    : "border-line text-ink-2 hover:border-ink-3"
                }`}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={s.icon} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제출 */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-12 rounded-pill bg-ink text-on-ink text-[14px] font-medium transition-all hover:-translate-y-px hover:bg-[#333] active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none"
        >
          스튜디오 만들고 시작하기
        </button>
        <p className="text-center text-[12px] text-ink-3 mt-4">
          다음 단계에서 첫 갤러리를 만들어볼 거예요
        </p>
      </div>
    </main>
  );
}
