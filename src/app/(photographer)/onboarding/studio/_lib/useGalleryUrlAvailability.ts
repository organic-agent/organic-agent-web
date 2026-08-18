/**
 * 갤러리 주소(슬러그) 가용성 확인 훅
 * 위치: src/app/(photographer)/onboarding/studio/_lib/useGalleryUrlAvailability.ts
 *
 * 동기로 알 수 있는 상태(idle·형식 오류·검사 중)는 렌더 중에 파생하고,
 * 상태 저장은 서버 조회 결과에만 쓴다 — effect 본문의 동기 setState를
 * 금지하는 react-hooks/set-state-in-effect 규칙과도 맞는 구조다.
 *
 * 조회 결과에 어떤 입력의 답인지(for)를 함께 담아, 입력이 이미 바뀐 뒤
 * 늦게 도착한 응답은 파생 단계에서 자연히 무시된다.
 *
 * 예약어·하이픈 세부 규칙 같은 서버만 아는 형식 위반(STUDIO_400_1)도
 * invalid로 합쳐서, 화면은 상태 하나만 보고 그리면 된다.
 */

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { checkGalleryUrlAvailability } from "@/lib/api/studios";

/** 서버 생성 규칙과 동일 — 소문자·숫자·하이픈 3~50자. */
export const GALLERY_URL_PATTERN = /^[a-z0-9-]{3,50}$/;

export type GalleryUrlCheck =
  | { status: "idle" }
  | { status: "invalid"; message?: string }
  | { status: "checking" }
  | { status: "available"; canonical: string }
  | { status: "taken" }
  | { status: "error" };

type CheckResult = { for: string } & (
  | { kind: "available"; canonical: string }
  | { kind: "taken" }
  | { kind: "invalid"; message: string }
  | { kind: "error" }
);

const DEBOUNCE_MS = 400;

export function useGalleryUrlAvailability(input: string): GalleryUrlCheck {
  const [result, setResult] = useState<CheckResult | null>(null);
  const slug = input.trim().toLowerCase();
  const formatValid = GALLERY_URL_PATTERN.test(slug);

  useEffect(() => {
    if (slug.length === 0 || !GALLERY_URL_PATTERN.test(slug)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      let next: CheckResult;
      try {
        const res = await checkGalleryUrlAvailability(slug);
        next = res.available
          ? { for: slug, kind: "available", canonical: res.galleryUrl }
          : { for: slug, kind: "taken" };
      } catch (err) {
        next =
          err instanceof ApiError && err.code === "STUDIO_400_1"
            ? { for: slug, kind: "invalid", message: err.message }
            : { for: slug, kind: "error" };
      }
      if (!cancelled) setResult(next);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  if (slug.length === 0) return { status: "idle" };
  if (!formatValid) return { status: "invalid" };
  if (result === null || result.for !== slug) return { status: "checking" };

  switch (result.kind) {
    case "available":
      return { status: "available", canonical: result.canonical };
    case "taken":
      return { status: "taken" };
    case "invalid":
      return { status: "invalid", message: result.message };
    case "error":
      return { status: "error" };
  }
}
