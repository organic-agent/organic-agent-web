"use client";

/**
 * 작가 — 스튜디오 생성 페이지
 * 위치: src/app/(photographer)/onboarding/studio/page.tsx
 *
 * 로그인 직후 최초 1회 사용하는 스튜디오 생성 화면이다.
 * 업체명, 갤러리 주소, 유입 경로를 입력받아 목업 스튜디오 정보로 저장한다.
 * 전용 시안이 없어 배치·플로우는 유지하고 표피만 디자인 시스템 토큰·부품으로 구성.
 *
 * 참고:
 * - 실제로는 POST /api/v1/studios와 GET /studios/url-available 연결 예정이다.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { BackIcon } from "@/components/icons";
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
    // 라운드 사각 외곽 + 렌즈 + 플래시 점 (실제 로고 형태)
    icon: "M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zM16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01",
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

  // 목업 URL 검증 — 유입 경로는 선택 입력이라 제출 조건에서 제외
  const studioSlug = url.trim().toLowerCase();
  const urlValid = studioSlug.length >= 3 && /^[a-z0-9-]+$/.test(studioSlug);
  const canSubmit = name.trim().length > 0 && urlValid;

  function handleSubmit() {
    // 회의 후: await fetch("/api/v1/studios", {...});
    saveStudioInfo({ name: name.trim(), url: studioSlug, source });
    router.push("/onboarding/gallery");
  }

  return (
    <main className="min-h-dvh bg-bg-layer-default grid place-items-center px-6 py-12">
      <div className="w-full max-w-115">
        {/* 뒤로가기 (랜딩으로) */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 type-label-button text-fg-neutral-muted transition-colors duration-fast hover:text-fg-neutral"
        >
          <BackIcon size={16} />
          홈으로
        </Link>

        {/* 브랜드 */}
        <div className="mb-8 flex items-center gap-2">
          <BrandLogo size={32} className="text-fg-neutral" />
          <b className="type-brand-wordmark text-fg-neutral">Easy Select</b>
        </div>

        <p className="mb-3 type-label-eyebrow text-fg-neutral-muted">
          Set up your studio
        </p>
        <h1 className="mb-2 type-heading-large text-fg-neutral">
          스튜디오를 만들어볼까요
        </h1>
        <p className="mb-9 type-body-medium text-fg-neutral-muted">
          신혼부부에게 보여질 스튜디오 정보예요. 나중에 언제든 바꿀 수 있어요.
        </p>

        {/* 업체명 */}
        <div className="mb-6">
          <label className="mb-2 block type-label-button text-fg-neutral">
            업체명
          </label>
          <TextField
            value={name}
            onChange={setName}
            placeholder="예: 세로라 스튜디오"
            aria-label="업체명"
            className="h-12 px-4"
          />
        </div>

        {/* 갤러리 URL */}
        <div className="mb-6">
          <label className="mb-2 block type-label-button text-fg-neutral">
            갤러리 주소
          </label>
          <div
            className={`flex h-12 items-center overflow-hidden rounded-(--radius-8) border bg-bg-layer-default transition-colors duration-fast ${
              url.length > 0 && !urlValid
                ? "border-fg-critical ring-1 ring-fg-critical"
                : "border-stroke-neutral-weak focus-within:border-fg-neutral focus-within:ring-1 focus-within:ring-fg-neutral"
            }`}
          >
            <span className="select-none pl-4 pr-1 type-body-medium text-fg-neutral-muted">
              studio/
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value.toLowerCase())}
              placeholder="serora"
              aria-label="갤러리 주소"
              className="h-full min-w-0 flex-1 bg-transparent pr-4 type-body-medium text-fg-neutral outline-none placeholder:text-fg-neutral-muted"
            />
          </div>
          {/* 검증 메시지 */}
          <p
            className={`mt-1.5 type-body-small ${
              url.length === 0
                ? "text-fg-neutral-muted"
                : urlValid
                  ? "text-fg-positive"
                  : "text-fg-critical"
            }`}
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
          <label className="mb-2 block type-label-button text-fg-neutral">
            어떻게 알고 오셨나요?
            <span className="ml-1 font-normal text-fg-neutral-muted">
              (선택)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {SOURCES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSource(s.key)}
                aria-pressed={source === s.key}
                className={`flex h-12 cursor-pointer items-center gap-2.5 rounded-(--radius-8) border px-4 type-label-button transition-colors duration-fast ${
                  source === s.key
                    ? "border-transparent bg-bg-brand-solid text-fg-neutral-inverted"
                    : "border-stroke-neutral-muted text-fg-neutral-muted hover:border-stroke-neutral-weak"
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
                  aria-hidden="true"
                >
                  <path d={s.icon} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제출 */}
        <Button
          size="lg"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full"
        >
          스튜디오 만들고 시작하기
        </Button>
        <p className="mt-4 text-center type-body-small text-fg-neutral-muted">
          다음 단계에서 첫 갤러리를 만들어볼 거예요
        </p>
      </div>
    </main>
  );
}
