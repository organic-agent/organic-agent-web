"use client";

/**
 * 개인 갤러리 온보딩 1단계 — 플랜 선택
 * 위치: src/app/(auth)/onboarding/personal/page.tsx
 *
 * 플랜 API 목록을 카드로 그린다. 0원 플랜은 무료 카드(점선), 나머지는 유료 카드.
 * 무료를 고르면 결제 화면 없이 0원 이용권을 조용히 받아 바로 갤러리 정보로 간다 —
 * 갤러리 생성 API가 이용권을 필수로 받기 때문이다. 유료는 결제 화면으로 간다.
 * 무료 플랜이 아직 서버에 없으면 유료 카드만 보인다(백엔드에 0원 플랜 추가 요청 중).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { initialOf } from "@/components/app/ProfileAvatarButton";
import { ArrowRightIcon, BackIcon, InfoIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  createCheckout,
  getPlans,
  isFreePlan,
  type PlansResponse,
} from "@/lib/api/payments";
import { useAuth } from "@/lib/auth/authStore";
import { PersonalSteps } from "./_components/PersonalSteps";
import { PlanCard } from "./_components/PlanCard";

export default function PersonalPlanPage() {
  const router = useRouter();
  const auth = useAuth();
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPlans();
        if (!cancelled) setPlans(res);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const picked = plans?.plans.find((p) => p.id === pickedId) ?? null;
  const paid = picked !== null && !isFreePlan(picked);
  const checkoutOff = plans !== null && !plans.testCheckoutEnabled;

  async function proceed() {
    if (!picked || starting) return;
    if (paid) {
      router.push(`/onboarding/personal/checkout?plan=${encodeURIComponent(picked.id)}`);
      return;
    }
    // 무료 — 0원 이용권을 받아 바로 갤러리 정보로
    setStarting(true);
    setBanner(null);
    try {
      const checkout = await createCheckout(picked.id);
      router.push(
        `/onboarding/personal/gallery?checkout=${encodeURIComponent(checkout.checkoutId)}`,
      );
    } catch (err) {
      setStarting(false);
      setBanner(
        err instanceof ApiError
          ? err.message
          : "시작하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  const buttonLabel = !picked
    ? "플랜을 골라 주세요"
    : paid
      ? `${picked.name} 결제하러 가기`
      : starting
        ? "시작하는 중…"
        : "무료로 시작하기";

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar initial={initialOf(auth.user?.nickname)} />
      <div className="grid flex-1 place-items-start justify-items-center px-6 py-10">
        <div className="w-full max-w-170">
          <Link
            href="/onboarding/role"
            className="mb-5 inline-flex items-center gap-1 type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            <BackIcon size={16} />
            역할 선택으로
          </Link>
          <PersonalSteps paid={paid} current="plan" />
          <p className="type-label-eyebrow text-brand-secondary-default">For Individuals</p>
          <h1 className="mt-2 mb-1.5 type-title-xl text-balance text-contents-light-bgd-default">
            플랜을 골라 주세요
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            무료로 시작할 수도, 처음부터 더 큰 갤러리로 시작할 수도 있어요.
          </p>

          <div className="mt-6">
            {plans === null && !failed && (
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
            {plans && (
              <>
                <div
                  role="radiogroup"
                  aria-label="플랜"
                  className={`grid gap-3 max-[720px]:grid-cols-1 ${
                    plans.plans.length >= 3 ? "grid-cols-3" : "grid-cols-2"
                  }`}
                >
                  {plans.plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      checked={pickedId === plan.id}
                      onPick={() => setPickedId(plan.id)}
                    />
                  ))}
                </div>
                {checkoutOff && (
                  <p
                    role="status"
                    className="mt-4 flex items-start gap-2 rounded-(--radius-8) bg-function-info-surface px-3 py-2 type-content-s text-contents-light-bgd-default"
                  >
                    <InfoIcon size={18} className="mt-px shrink-0 text-function-info-default" />
                    지금은 결제를 열 수 없어요. 잠시 후 다시 시도하거나 문의해 주세요.
                  </p>
                )}
              </>
            )}
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
            disabled={!picked || starting || checkoutOff}
            onClick={proceed}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </main>
  );
}
