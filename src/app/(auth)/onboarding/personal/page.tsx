"use client";

/**
 * 개인 갤러리 온보딩 1단계 — 플랜 선택 (일반 진입)
 * 위치: src/app/(auth)/onboarding/personal/page.tsx
 *
 * 서버 플랜(free · pro)을 카드로 그린다. 무료는 계정당 한 번 — 내 혜택(GET /billing/me)의 freePlanAvailable이
 * false면 잠긴다("이미 썼어요"). 프로는 카드 결제가 열릴 때까지 잠긴다("결제 준비 중") — 다만 등록해 둔 미사용
 * 쿠폰이 있으면 그 쿠폰으로 고를 수 있다("쿠폰 등록됨"). 무료를 고르면 결제 없이 바로 갤러리 정보로, 프로는
 * 쿠폰 id를 실어 갤러리 정보로 간다. 쿠폰 선물 링크(#code=)로 왔으면 이 화면을 그리지 않고 쿠폰 등록 화면으로
 * 바꾼다(OnboardingGate가 먼저 받지만 직접 진입도 대비). 2026-10-03 수민 결정 · 이슈 81.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { ArrowRightIcon, BackIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  availableCoupon,
  getMyBenefits,
  getPlans,
  isFreePlan,
  type MyBenefitsResponse,
  type Plan,
} from "@/lib/api/payments";
import { couponRedemptionPath } from "@/lib/couponLink";
import { useCouponCodeFromHash } from "@/lib/useCouponCodeFromHash";
import { PersonalSteps } from "./_components/PersonalSteps";
import { PlanCard } from "./_components/PlanCard";

type Loaded = { plans: Plan[]; benefits: MyBenefitsResponse };

export default function PersonalPlanPage() {
  const router = useRouter();
  const hash = useCouponCodeFromHash();
  /** 선물 링크(#code=)로 들어왔으면 플랜 선택을 보여주지 않고 쿠폰 등록 화면으로 — # 조각을 읽은 뒤에만 판단 */
  const hashChecked = hash.ready && hash.code === null;
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (hash.code) router.replace(couponRedemptionPath(hash.code));
  }, [hash.code, router]);

  useEffect(() => {
    if (!hashChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const [plansRes, benefits] = await Promise.all([getPlans(), getMyBenefits()]);
        if (cancelled) return;
        // 무료를 앞에 — 서버 순서와 무관하게 카드 자리를 고정한다
        const plans = [...plansRes.plans].sort((a, b) => Number(isFreePlan(b)) - Number(isFreePlan(a)));
        setData({ plans, benefits });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hashChecked, nonce]);

  const coupon = data ? availableCoupon(data.benefits) : null;

  /** 카드를 고를 수 있는지와 꼬리표 — 무료 소진 · 프로는 결제 전(쿠폰 있으면 올리브 꼬리표로 열림) */
  function lockOf(plan: Plan): { disabled: boolean; tag: string | null; tagTone: "muted" | "brand" } {
    if (isFreePlan(plan)) {
      return data && !data.benefits.freePlanAvailable
        ? { disabled: true, tag: "이미 썼어요", tagTone: "muted" }
        : { disabled: false, tag: null, tagTone: "muted" };
    }
    return coupon
      ? { disabled: false, tag: "쿠폰 등록됨", tagTone: "brand" }
      : { disabled: true, tag: "결제 준비 중", tagTone: "muted" };
  }

  const picked = data?.plans.find((p) => p.id === pickedId) ?? null;
  const pickedFree = picked !== null && isFreePlan(picked);

  function proceed() {
    if (!picked) return;
    if (pickedFree) {
      router.push("/onboarding/personal/gallery?plan=free");
      return;
    }
    if (coupon) router.push(`/onboarding/personal/gallery?plan=pro&coupon=${coupon.couponId}`);
  }

  const buttonLabel = !picked ? "플랜을 골라 주세요" : pickedFree ? "무료로 시작하기" : "쿠폰으로 계속하기";

  if (!hashChecked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background-default-main">
        <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">플랜을 불러오고 있어요…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar />
      <div className="grid flex-1 place-items-start justify-items-center px-6 py-10">
        <div className="w-full max-w-170">
          <Link
            href="/onboarding/role"
            className="mb-5 inline-flex items-center gap-1 type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            <BackIcon size={16} />
            역할 선택으로
          </Link>
          <PersonalSteps variant="plan" current="plan" />
          <p className="type-label-eyebrow text-brand-secondary-default">For Individuals</p>
          <h1 className="mt-2 mb-1.5 type-title-xl text-balance text-contents-light-bgd-default">
            플랜을 골라 주세요
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            무료로 시작할 수도, 처음부터 더 큰 갤러리로 시작할 수도 있어요.
          </p>

          <div className="mt-6">
            {data === null && !failed && (
              <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">
                플랜을 불러오고 있어요…
              </p>
            )}
            {failed && (
              <div className="flex flex-col items-start gap-3">
                <p className="type-content-m text-contents-light-bgd-sub">
                  플랜을 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.
                </p>
                <Button
                  kind="ghost"
                  onClick={() => {
                    setFailed(false);
                    setNonce((n) => n + 1);
                  }}
                >
                  다시 시도
                </Button>
              </div>
            )}
            {data && (
              <div
                role="radiogroup"
                aria-label="플랜"
                className={`grid gap-3 max-[720px]:grid-cols-1 ${
                  data.plans.length >= 3 ? "grid-cols-3" : "grid-cols-2"
                }`}
              >
                {data.plans.map((plan) => {
                  const lock = lockOf(plan);
                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      checked={pickedId === plan.id}
                      disabled={lock.disabled}
                      tag={lock.tag}
                      tagTone={lock.tagTone}
                      onPick={() => setPickedId(plan.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="mt-6 w-full"
            icon={<ArrowRightIcon />}
            disabled={!picked}
            onClick={proceed}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </main>
  );
}
