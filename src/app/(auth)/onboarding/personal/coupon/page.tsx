"use client";

/**
 * 개인 갤러리 온보딩 — 프로 쿠폰 등록 (선물 링크 진입의 첫 화면)
 * 위치: src/app/(auth)/onboarding/personal/coupon/page.tsx
 *
 * 백오피스 선물 링크(/onboarding/personal#code=토큰)로 들어온 사람이 보는 첫 화면 — 코드가 채워져 있고 버튼 하나.
 * 플랜 선택은 보지 않는다(2026-10-03 수민). 이 화면은 OnboardingGate의 인증 가드를 거치지 않는다: 비로그인이면
 * LoginModal(asPage)을 띄우고 코드를 로그인 왕복 컨텍스트에 실어 로그인 뒤 같은 주소로 돌아온다.
 * 등록(POST /coupons/register)은 코드를 보관만 하고 이용 기간은 갤러리를 만들 때 시작한다. 등록되면 쿠폰 id를 실어
 * 갤러리 정보로 간다. 코드 없이 직접 들어오면 빈 입력란이다. ?error=는 OAuth 콜백이 실패를 되돌려보낼 때.
 * 같은 링크를 다시 누른 사람은 이 화면에서 멈추지 않는다(QA BUG-75): 등록해 둔 쿠폰이 하나라도 있는 사람이 링크로
 * 들어오면 버튼을 누르지 않아도 서버에 물어보고(등록은 같은 사람에게 몇 번이든 같은 답을 준다) 이미 갤러리를 만든
 * 쿠폰이면 그 갤러리로, 등록만 해 둔 쿠폰이면 갤러리 정보로 보낸다. 쿠폰이 하나도 없는 사람(처음 받은 사람)은
 * 지금처럼 등록 화면을 본다 — 확인 없이 계정에 쿠폰을 묶지 않기 위해서다.
 * useSearchParams는 정적 페이지에서 Suspense 경계가 필요하다.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { LoginModal } from "@/components/LoginModal";
import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import {
  formatAmount,
  getMyBenefits,
  getPlans,
  planDurationLabel,
  registerProCoupon,
  type Plan,
  type ProCouponResponse,
} from "@/lib/api/payments";
import { useAuth } from "@/lib/auth/authStore";
import { useCouponCodeFromHash } from "@/lib/useCouponCodeFromHash";
import { PersonalSteps } from "../_components/PersonalSteps";

/** 등록 결과로 갈 곳 — 이미 갤러리를 만든 쿠폰이면 그 갤러리, 미사용이면 갤러리 정보. 그 밖(비활성 등)은 이 화면에 남는다 */
function couponDestination(coupon: ProCouponResponse): string | null {
  if (coupon.status === "USED" && coupon.galleryId !== null) return `/gallery/${coupon.galleryId}`;
  if (coupon.status === "AVAILABLE") return `/onboarding/personal/gallery?plan=pro&coupon=${coupon.couponId}`;
  return null;
}

export default function PersonalCouponPage() {
  return (
    <Suspense fallback={null}>
      <PersonalCoupon />
    </Suspense>
  );
}

function PersonalCoupon() {
  const router = useRouter();
  const auth = useAuth();
  const errorCode = useSearchParams().get("error");
  // # 조각의 코드가 입력란의 시작값 — 사용자가 고치기 전까지는 링크의 코드를 그대로 쓴다
  const hash = useCouponCodeFromHash();
  const hashRead = hash.ready;
  const fromLink = hash.code !== null;
  const [edited, setEdited] = useState<string | null>(null);
  const code = edited ?? hash.code ?? "";
  const [pro, setPro] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  /** 링크로 들어온 사람이 이미 쿠폰을 가진 사람인지 확인을 마쳤는가 — 마치기 전에는 등록 화면을 그리지 않는다 */
  const [linkChecked, setLinkChecked] = useState(false);
  const linkCode = hash.code;

  // 다시 누른 링크 — 등록해 둔 쿠폰이 있는 사람이면 버튼 없이 바로 그 쿠폰의 자리로 보낸다
  useEffect(() => {
    if (auth.status !== "authenticated" || linkCode === null) return;
    let cancelled = false;
    (async () => {
      try {
        const benefits = await getMyBenefits();
        if (cancelled) return;
        if (benefits.coupons.length > 0) {
          const destination = couponDestination(await registerProCoupon(linkCode));
          if (cancelled) return;
          if (destination) {
            router.replace(destination);
            return;
          }
        }
      } catch {
        // 남이 등록한 쿠폰 · 네트워크 오류 등 — 등록 화면을 보여 주고, 이유는 버튼을 눌렀을 때 안내한다
      }
      if (!cancelled) setLinkChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.status, linkCode, router]);

  // 안내 문구의 기간 · 장수는 서버 플랜 값으로 — 못 읽어도 화면은 그대로
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    let cancelled = false;
    getPlans()
      .then((res) => {
        if (!cancelled) setPro(res.plans.find((p) => p.couponRequired || p.id === "pro") ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [auth.status]);

  if (auth.status === "loading" || !hashRead || (auth.status === "authenticated" && fromLink && !linkChecked)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background-default-main">
        <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">쿠폰을 확인하고 있어요…</p>
      </main>
    );
  }
  if (auth.status === "guest") {
    return <LoginModal asPage intent="personal" couponCode={code.trim() || null} errorCode={errorCode} />;
  }

  const trimmed = code.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const coupon = await registerProCoupon(trimmed);
      const destination = couponDestination(coupon);
      if (destination) {
        router.replace(destination);
        return;
      }
      setSubmitting(false);
      setBanner(
        coupon.status === "USED"
          ? "이미 사용한 쿠폰이에요. 갤러리 목록에서 확인해 주세요."
          : "지금은 사용할 수 없는 쿠폰이에요. 보내 준 사람에게 확인해 주세요.",
      );
    } catch (err) {
      setSubmitting(false);
      setBanner(
        err instanceof ApiError
          ? err.message
          : "쿠폰을 등록하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar />
      <div className="grid flex-1 place-items-start justify-items-center px-6 py-10">
        <div className="w-full max-w-130">
          <PersonalSteps variant="coupon" current="coupon" />
          <p className="type-label-eyebrow text-brand-secondary-default">For Individuals</p>
          <h1 className="mt-2 mb-1.5 type-title-xl text-balance text-contents-light-bgd-default">
            {fromLink ? "프로 쿠폰이 도착했어요" : "프로 쿠폰을 등록해 주세요"}
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            {pro
              ? `등록하면 ${planDurationLabel(pro)} · ${formatAmount(pro.maxPhotoCount)}장 갤러리를 바로 만들 수 있어요.`
              : "등록하면 프로 갤러리를 바로 만들 수 있어요."}
          </p>

          <div className="mt-6">
            <label
              htmlFor="coupon-code"
              className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
            >
              쿠폰 코드
            </label>
            <TextField
              id="coupon-code"
              value={code}
              onChange={setEdited}
              placeholder="WES-로 시작하는 코드"
              autoComplete="off"
              className="h-12 px-4"
            />
          </div>

          {banner && (
            <p role="alert" className="mt-6 text-center type-content-xs text-function-error-default">
              {banner}
            </p>
          )}

          <Button
            size="lg"
            className="mt-6 w-full"
            icon={<ArrowRightIcon />}
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {submitting ? "등록하는 중…" : "등록하고 계속하기"}
          </Button>
        </div>
      </div>
    </main>
  );
}
