"use client";

/**
 * 개인 갤러리 온보딩 2단계 — 결제 (유료 플랜만)
 * 위치: src/app/(auth)/onboarding/personal/checkout/page.tsx
 *
 * 주소의 plan으로 플랜을 찾아 주문 요약을 보여주고, 테스트 결제 한 번으로 이용권을
 * 받아 갤러리 정보로 간다. 실결제 PG는 중간평가 이후 — 결제 수단 행에 자리만 둔다.
 * useSearchParams는 정적 페이지에서 Suspense 경계가 필요하다.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { initialOf } from "@/components/app/ProfileAvatarButton";
import { BackIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  createCheckout,
  formatAmount,
  getPlans,
  isFreePlan,
  type Plan,
} from "@/lib/api/payments";
import { useAuth } from "@/lib/auth/authStore";
import { PersonalSteps } from "../_components/PersonalSteps";

export default function PersonalCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <PersonalCheckout />
    </Suspense>
  );
}

function PersonalCheckout() {
  const router = useRouter();
  const auth = useAuth();
  const planId = useSearchParams().get("plan");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [paying, setPaying] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // 플랜을 못 찾거나(없는 id·무료) 주소에 plan이 없으면 플랜 선택으로
  useEffect(() => {
    if (!planId) {
      router.replace("/onboarding/personal");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getPlans();
        if (cancelled) return;
        const found = res.plans.find((p) => p.id === planId) ?? null;
        if (!found || isFreePlan(found)) router.replace("/onboarding/personal");
        else setPlan(found);
      } catch {
        if (!cancelled) router.replace("/onboarding/personal");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, router]);

  async function pay() {
    if (!plan || paying) return;
    setPaying(true);
    setBanner(null);
    try {
      const checkout = await createCheckout(plan.id);
      router.push(
        `/onboarding/personal/gallery?checkout=${encodeURIComponent(checkout.checkoutId)}`,
      );
    } catch (err) {
      setPaying(false);
      setBanner(
        err instanceof ApiError
          ? err.message
          : "결제를 시작하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar initial={initialOf(auth.user?.nickname)} />
      <div className="grid flex-1 place-items-start justify-items-center px-6 py-10">
        <div className="w-full max-w-130">
          <Link
            href="/onboarding/personal"
            className="mb-5 inline-flex items-center gap-1 type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            <BackIcon size={16} />
            플랜 선택으로
          </Link>
          <PersonalSteps paid current="checkout" />
          <p className="type-label-eyebrow text-brand-secondary-default">For Individuals</p>
          <h1 className="mt-2 mb-1.5 type-title-xl text-balance text-contents-light-bgd-default">
            결제할 내용을 확인해 주세요
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            지금은 테스트 결제예요. 실제 돈은 나가지 않고 이용권만 발급돼요.
          </p>

          {plan === null ? (
            <p className="mt-6 type-content-xs text-contents-light-bgd-sub animate-pulse">
              플랜을 확인하고 있어요…
            </p>
          ) : (
            <>
              <section className="mt-6">
                <h2 className="mb-3 type-label-semibold-m text-contents-light-bgd-default">
                  주문 요약
                </h2>
                <dl className="flex flex-col gap-2 rounded-(--radius-12) border border-divider-default px-4.5 py-4 type-content-s">
                  <Row label="플랜" value={plan.name} />
                  <Row label="보관 기간" value={`${plan.durationDays}일`} />
                  <Row label="사진" value={`${formatAmount(plan.maxPhotoCount)}장까지`} />
                  <div className="mt-0.5 flex justify-between border-t border-divider-default pt-2 type-content-m">
                    <dt className="text-contents-light-bgd-weakness">결제 금액</dt>
                    <dd className="type-label-semibold-m text-contents-light-bgd-default tabular-nums">
                      {formatAmount(plan.amount)}원
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="mt-6">
                <h2 className="mb-3 type-label-semibold-m text-contents-light-bgd-default">
                  결제 수단
                </h2>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 rounded-(--radius-8) border border-brand-primary-default px-3.5 py-3 type-content-s text-contents-light-bgd-default shadow-[inset_0_0_0_1px_var(--brand-primary-default)]">
                    테스트 결제
                    <span className="ml-auto type-content-xs text-contents-light-bgd-weakness">
                      실제 결제 없음
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-(--radius-8) border border-divider-default px-3.5 py-3 type-content-s text-contents-light-bgd-disabled">
                    카드 결제
                    <span className="ml-auto type-content-xs text-contents-light-bgd-disabled">
                      준비 중
                    </span>
                  </div>
                </div>
              </section>

              {banner && (
                <p role="alert" className="mt-6 text-center type-content-xs text-function-error-default">
                  {banner}
                </p>
              )}

              <Button size="lg" className="mt-6 w-full" disabled={paying} onClick={pay}>
                {paying ? "결제하는 중…" : `${formatAmount(plan.amount)}원 테스트 결제하기`}
              </Button>
              <p className="mt-3 text-center type-content-xs text-contents-light-bgd-weakness">
                결제가 끝나면 바로 갤러리 정보를 입력해요.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-contents-light-bgd-weakness">{label}</dt>
      <dd className="text-right font-medium text-contents-light-bgd-default tabular-nums">
        {value}
      </dd>
    </div>
  );
}
