"use client";

/**
 * 스튜디오 온보딩 — 스튜디오 작업공간 만들기 (S1 한 장)
 * 위치: src/app/(studio)/onboarding/studio/page.tsx
 *
 * 역할 선택에서 "스튜디오를 열어요"를 고르거나 랜딩 카드에서 온 사용자가 도착한다.
 * 이름·공개 주소(필수), 연락처·소개(선택)를 받아 POST /studios로 만들고,
 * 만들어지면 바로 스튜디오 홈 /studio/[공개 주소]로 간다.
 *
 * 공개 주소는 디바운스 가용성 조회(useGalleryUrlAvailability)로 미리 확인하지만
 * UX 보조일 뿐이고, 확인과 생성 사이의 경쟁은 생성 API의 STUDIO_409_2로 최종 판정된다.
 * 공개 주소는 만든 뒤 바꾸지 않기로 했다(설정에 변경 기능을 두지 않음) — 입력란에서 알린다.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { BackIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import { checkGalleryUrlAvailability, createStudio } from "@/lib/api/studios";
import { useAuth } from "@/lib/auth/authStore";
import {
  useGalleryUrlAvailability,
  type GalleryUrlCheck,
} from "./_lib/useGalleryUrlAvailability";

const DESCRIPTION_MAX = 500;

/** 상태별 공개 주소 안내 문구와 색. */
function urlGuide(state: GalleryUrlCheck): { text: string; tone: string } {
  switch (state.status) {
    case "idle":
      return {
        text: "영문 소문자·숫자·하이픈 3~50자. 만든 뒤에는 바꿀 수 없어요",
        tone: "text-contents-light-bgd-sub",
      };
    case "invalid":
      return {
        text: state.message ?? "3~50자, 영문 소문자·숫자·하이픈만 가능해요",
        tone: "text-function-error-default",
      };
    case "checking":
      return { text: "주소를 확인하는 중…", tone: "text-contents-light-bgd-sub" };
    case "available":
      return {
        text: "사용할 수 있는 주소예요. 만든 뒤에는 바꿀 수 없어요",
        tone: "text-brand-secondary-dark",
      };
    case "taken":
      return {
        text: "이미 사용 중인 주소예요. 다른 주소를 입력해 주세요",
        tone: "text-function-error-default",
      };
    case "error":
      return {
        text: "주소 확인에 실패했어요. 잠시 후 다시 입력해 보세요",
        tone: "text-function-error-default",
      };
  }
}

export default function StudioOnboardingPage() {
  const router = useRouter();
  const auth = useAuth();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** 제출 시점에 판정된 주소 중복 — 주소를 고치면 풀린다. */
  const [urlTaken, setUrlTaken] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const urlCheck = useGalleryUrlAvailability(url);
  const urlState: GalleryUrlCheck = urlTaken ? { status: "taken" } : urlCheck;
  const guide = urlGuide(urlState);
  const urlInvalid = urlState.status === "invalid" || urlState.status === "taken";

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
        contact: contact.trim() || null,
        description: description.trim() || null,
      });
      router.replace(`/studio/${studio.galleryUrl}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "STUDIO_409_2") {
          // 확인과 생성 사이에 다른 사람이 주소를 채갔다.
          setUrlTaken(true);
          return;
        }
        if (err.code === "STUDIO_409_1") {
          // 이미 스튜디오가 있는 계정 — 만들 게 없으니 내 스튜디오로.
          router.replace("/studio");
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

  const initial = auth.user?.nickname.trim().slice(0, 1) || "?";

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar initial={initial} />
      <div className="grid flex-1 place-items-center px-6 py-12">
        <div className="w-full max-w-115">
          <Link
            href="/onboarding/role"
            className="mb-5 inline-flex items-center gap-1 type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            <BackIcon size={16} />
            역할 선택으로
          </Link>

          <p className="mb-3 type-label-eyebrow text-brand-secondary-default">
            Set up your studio
          </p>
          <h1 className="mb-2 type-title-xl text-balance text-contents-light-bgd-default">
            스튜디오를 만들어볼까요
          </h1>
          <p className="mb-8 type-content-m text-contents-light-bgd-sub">
            클라이언트에게 보여질 스튜디오 정보예요.
            {/* 넓은 화면에서만 두 줄로 — 좁은 화면은 자연 줄바꿈에 맡긴다 */}
            <br className="max-[480px]:hidden" /> 공개 주소 말고는 나중에 언제든 바꿀 수
            있어요.
          </p>

          <div className="flex flex-col gap-6">
            {/* 스튜디오 이름 */}
            <div>
              <label
                htmlFor="studio-name"
                className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
              >
                스튜디오 이름
              </label>
              <TextField
                value={name}
                onChange={setName}
                placeholder="예: 세로라 스튜디오"
                className="h-12 px-4"
                id="studio-name"
                autoComplete="organization"
              />
            </div>

            {/* 공개 주소 */}
            <div>
              <label
                htmlFor="studio-url"
                className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
              >
                공개 주소
              </label>
              <div
                className={`flex h-12 items-center overflow-hidden rounded-(--radius-8) border bg-background-default-main transition-colors duration-fast ${
                  urlInvalid
                    ? "border-function-error-default ring-1 ring-function-error-default"
                    : "border-border-default focus-within:border-contents-light-bgd-default focus-within:ring-1 focus-within:ring-contents-light-bgd-default"
                }`}
              >
                <span className="select-none pl-4 pr-1 type-content-m whitespace-nowrap text-contents-light-bgd-sub">
                  easyselect.kr/studio/
                </span>
                <input
                  id="studio-url"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value.toLowerCase());
                    setUrlTaken(false);
                  }}
                  placeholder="serora"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-full min-w-0 flex-1 bg-transparent pr-4 type-content-m text-contents-light-bgd-default outline-none placeholder:text-contents-light-bgd-sub"
                />
              </div>
              <p aria-live="polite" className={`mt-1.5 type-content-xs ${guide.tone}`}>
                {guide.text}
              </p>
            </div>

            {/* 연락처 (선택) */}
            <div>
              <label
                htmlFor="studio-contact"
                className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
              >
                연락처
                <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
              </label>
              <TextField
                value={contact}
                onChange={setContact}
                placeholder="예: 010-1234-5678"
                className="h-12 px-4"
                id="studio-contact"
                autoComplete="tel"
              />
              <p className="mt-1.5 type-content-xs text-contents-light-bgd-sub">
                클라이언트에게 보여 줄 연락처예요
              </p>
            </div>

            {/* 소개 (선택) */}
            <div>
              <label
                htmlFor="studio-description"
                className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
              >
                소개
                <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
              </label>
              <textarea
                id="studio-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                maxLength={DESCRIPTION_MAX}
                rows={4}
                placeholder="예: 자연스러운 순간을 기록합니다."
                className="w-full resize-y rounded-(--radius-8) border border-border-default bg-background-default-main px-4 py-3 type-content-m text-contents-light-bgd-default outline-none transition-colors duration-fast placeholder:text-contents-light-bgd-sub focus:border-contents-light-bgd-default focus:ring-1 focus:ring-contents-light-bgd-default"
              />
              <p className="mt-1.5 text-right type-content-xs text-contents-light-bgd-weakness">
                {description.length} / {DESCRIPTION_MAX}
              </p>
            </div>

            {/* 제출 실패 안내 — 주소 문제는 필드 아래에서, 그 외는 여기서 알린다 */}
            {banner && (
              <p role="alert" className="text-center type-content-xs text-function-error-default">
                {banner}
              </p>
            )}

            <Button size="lg" disabled={!canSubmit} onClick={handleSubmit} className="w-full">
              {submitting ? "스튜디오 만드는 중…" : "스튜디오 만들기"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
