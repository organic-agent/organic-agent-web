"use client";

/**
 * 작가 — 스튜디오 생성 페이지
 * 위치: src/app/(photographer)/onboarding/studio/page.tsx
 *
 * 로그인 직후 최초 1회 사용하는 스튜디오 생성 화면이다.
 * 업체명, 갤러리 주소, 유입 경로를 입력받아 POST /api/v1/studios로 생성한다.
 * 생성이 성공하면 사용자 종류가 PHOTOGRAPHER로 확정된다.
 *
 * 갤러리 주소는 디바운스 가용성 조회(useGalleryUrlAvailability)로 미리
 * 확인하지만 이는 UX 보조일 뿐이고, 확인과 생성 사이의 경쟁은 생성 API의
 * STUDIO_409_2로 최종 판정된다 — 그래서 제출 직전 재확인과 409 처리가
 * 둘 다 있다.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { BackIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { checkGalleryUrlAvailability, createStudio } from "@/lib/api/studios";
import { saveStudioInfo } from "@/lib/studio";
import {
  useGalleryUrlAvailability,
  type GalleryUrlCheck,
} from "./_lib/useGalleryUrlAvailability";

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

/** 상태별 갤러리 주소 안내 문구와 색. */
function urlGuide(state: GalleryUrlCheck): { text: string; tone: string } {
  switch (state.status) {
    case "idle":
      return {
        text: "영문 소문자·숫자·하이픈만 사용할 수 있어요",
        tone: "text-fg-neutral-muted",
      };
    case "invalid":
      return {
        text: state.message ?? "3~50자, 영문 소문자·숫자·하이픈만 가능해요",
        tone: "text-fg-critical",
      };
    case "checking":
      return { text: "주소를 확인하는 중…", tone: "text-fg-neutral-muted" };
    case "available":
      return { text: "✓ 사용할 수 있는 주소예요", tone: "text-fg-positive" };
    case "taken":
      return {
        text: "이미 사용 중인 주소예요. 다른 주소를 입력해 주세요",
        tone: "text-fg-critical",
      };
    case "error":
      return {
        text: "주소 확인에 실패했어요. 잠시 후 다시 입력해 보세요",
        tone: "text-fg-critical",
      };
  }
}

export default function StudioNewPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 제출 시점에 판정된 주소 중복 — 주소를 고치면 풀린다. */
  const [urlTaken, setUrlTaken] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const urlCheck = useGalleryUrlAvailability(url);
  const urlState: GalleryUrlCheck = urlTaken ? { status: "taken" } : urlCheck;
  const guide = urlGuide(urlState);

  const canSubmit =
    name.trim().length > 0 && urlState.status === "available" && !submitting;

  async function handleSubmit() {
    if (urlState.status !== "available" || submitting) return;
    const canonical = urlState.canonical;
    setSubmitting(true);
    setBanner(null);
    try {
      // 디바운스 결과는 오래됐을 수 있다 — 제출 직전 한 번 더 확인한다.
      const availability = await checkGalleryUrlAvailability(canonical);
      if (!availability.available) {
        setUrlTaken(true);
        return;
      }

      const studio = await createStudio({
        name: name.trim(),
        galleryUrl: availability.galleryUrl,
        inflowChannel:
          SOURCES.find((s) => s.key === source)?.label ?? null,
      });

      // 갤러리 목록·온보딩 화면이 아직 이 로컬 스토어로 이름을 읽는다.
      saveStudioInfo({ name: studio.name, url: studio.galleryUrl, source });
      router.push("/onboarding/gallery");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "STUDIO_409_2") {
          // 확인과 생성 사이에 다른 사람이 주소를 채갔다.
          setUrlTaken(true);
          return;
        }
        if (err.code === "STUDIO_409_1") {
          // 이미 스튜디오가 있는 계정 — 만들 게 없으니 다음 단계로 보낸다.
          router.push("/onboarding/gallery");
          return;
        }
        if (err.code === "USER_409_1") {
          setBanner(
            "예비 부부로 가입된 계정이라 스튜디오를 만들 수 없어요. 작가용 계정으로 다시 로그인해 주세요.",
          );
          return;
        }
        setBanner(err.message);
        return;
      }
      setBanner("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
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
              urlState.status === "invalid" || urlState.status === "taken"
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
              onChange={(e) => {
                setUrl(e.target.value.toLowerCase());
                setUrlTaken(false);
              }}
              placeholder="serora"
              aria-label="갤러리 주소"
              className="h-full min-w-0 flex-1 bg-transparent pr-4 type-body-medium text-fg-neutral outline-none placeholder:text-fg-neutral-muted"
            />
          </div>
          {/* 검증·가용성 안내 */}
          <p
            aria-live="polite"
            className={`mt-1.5 type-body-small ${guide.tone}`}
          >
            {guide.text}
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

        {/* 제출 실패 안내 — 주소 문제는 필드 아래에서, 그 외는 여기서 알린다 */}
        {banner && (
          <p
            role="alert"
            className="mb-4 text-center type-body-small text-fg-critical"
          >
            {banner}
          </p>
        )}

        {/* 제출 */}
        <Button
          size="lg"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full"
        >
          {submitting ? "스튜디오 만드는 중…" : "스튜디오 만들고 시작하기"}
        </Button>
        <p className="mt-4 text-center type-body-small text-fg-neutral-muted">
          다음 단계에서 첫 갤러리를 만들어볼 거예요
        </p>
      </div>
    </main>
  );
}
