"use client";

/**
 * 개인 갤러리 온보딩 3단계 — 갤러리 정보
 * 위치: src/app/(auth)/onboarding/personal/gallery/page.tsx
 *
 * 주소의 checkout(이용권)으로 어떤 플랜인지 확인해 상단에 "무료로 시작" 또는
 * "OO 플랜 결제 완료"를 보여주고, 이름·선택 마감·고를 장수를 받아 개인 갤러리를 만든다.
 * 촬영 종류는 화면에서 받지 않고 본식으로 보낸다 — 갤러리 설정에서 바꿀 수 있다.
 * useSearchParams는 정적 페이지에서 Suspense 경계가 필요하다.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { ArrowRightIcon, BackIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import { createPersonalGallery, toSelectionDeadline } from "@/lib/api/galleries";
import { getCheckout, getPlans, type CheckoutResponse } from "@/lib/api/payments";
import { PersonalSteps } from "../_components/PersonalSteps";
import { resolvePlans, type DisplayPlan } from "../_lib/planCatalog";

export default function PersonalGalleryPage() {
  return (
    <Suspense fallback={null}>
      <PersonalGalleryForm />
    </Suspense>
  );
}

function PersonalGalleryForm() {
  const router = useRouter();
  const search = useSearchParams();
  const checkoutId = search.get("checkout");
  const planId = search.get("plan");
  const [ticket, setTicket] = useState<{
    checkout: CheckoutResponse;
    plan: DisplayPlan | null;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [count, setCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // 이용권이 없으면(주소 직접 입력 등) 플랜 선택으로
  useEffect(() => {
    if (!checkoutId) {
      router.replace("/onboarding/personal");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [checkout, plans] = await Promise.all([getCheckout(checkoutId), getPlans()]);
        if (cancelled) return;
        // 배지는 사용자가 고른 표시 플랜 기준. 주소에 없으면 이용권의 플랜으로 되짚는다.
        const list = resolvePlans(plans).plans;
        setTicket({
          checkout,
          plan:
            list.find((p) => p.id === planId) ??
            list.find((p) => p.checkoutPlanId === checkout.planId) ??
            null,
        });
      } catch {
        if (!cancelled) router.replace("/onboarding/personal");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutId, planId, router]);

  const paid =
    ticket !== null && (ticket.plan ? ticket.plan.amount > 0 : ticket.checkout.amount > 0);
  const countNumber = Number(count);
  const countValid = count === "" || (Number.isInteger(countNumber) && countNumber >= 1);
  const canSubmit = title.trim().length > 0 && countValid && !submitting && ticket !== null;

  async function handleSubmit() {
    if (!canSubmit || !checkoutId) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const gallery = await createPersonalGallery({
        checkoutId,
        title: title.trim(),
        selectionDeadline: deadline ? toSelectionDeadline(deadline) : null,
        maxSelectablePhotoCount: count ? countNumber : null,
        shootType: "CEREMONY",
      });
      router.replace(`/gallery/${gallery.id}`);
    } catch (err) {
      setSubmitting(false);
      setBanner(
        err instanceof ApiError
          ? err.message
          : "갤러리를 만들지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  const backHref =
    ticket && paid
      ? `/onboarding/personal/checkout?plan=${encodeURIComponent(ticket.plan?.id ?? ticket.checkout.planId)}`
      : "/onboarding/personal";

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar />
      <div className="grid flex-1 place-items-start justify-items-center px-6 py-10">
        <div className="w-full max-w-130">
          <Link
            href={backHref}
            className="mb-5 inline-flex items-center gap-1 type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            <BackIcon size={16} />
            {paid ? "결제로" : "플랜 선택으로"}
          </Link>
          <PersonalSteps paid={paid} current="gallery" />

          {ticket && (
            <span
              className={`mb-3 inline-flex items-center rounded-(--pill) px-2.5 py-1 type-label-semibold-xs ${
                paid
                  ? "bg-function-success-surface text-contents-light-bgd-default"
                  : "bg-brand-secondary-background text-brand-secondary-dark"
              }`}
            >
              {paid
                ? `${ticket.plan?.name ?? "플랜"} 결제 완료`
                : `무료로 시작${ticket.plan ? ` · ${ticket.plan.maxPhotoCount}장 · ${ticket.plan.durationDays}일` : ""}`}
            </span>
          )}

          <p className="type-label-eyebrow text-brand-secondary-default">For Individuals</p>
          <h1 className="mt-2 mb-1.5 type-title-xl text-balance text-contents-light-bgd-default">
            갤러리 정보를 알려 주세요
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            마감일과 장수는 나중에 갤러리 설정에서 바꿀 수 있어요.
          </p>

          <div className="mt-6 flex flex-col gap-5">
            <div>
              <label
                htmlFor="gallery-title"
                className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
              >
                갤러리 이름
              </label>
              <TextField
                id="gallery-title"
                value={title}
                onChange={setTitle}
                placeholder="예: 수민 & 지호 본식 원본"
                className="h-12 px-4"
              />
            </div>
            <div>
              <label
                htmlFor="gallery-deadline"
                className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
              >
                선택 마감
                <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
              </label>
              <TextField
                id="gallery-deadline"
                type="date"
                value={deadline}
                onChange={setDeadline}
                className="h-12 px-4"
              />
              <p className="mt-1.5 type-content-xs text-contents-light-bgd-sub">
                비우면 기한 없이 열려 있어요
              </p>
            </div>
            <div>
              <label
                htmlFor="gallery-count"
                className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
              >
                고를 장수
                <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
              </label>
              <TextField
                id="gallery-count"
                type="number"
                min={1}
                value={count}
                onChange={setCount}
                placeholder="예: 300"
                error={!countValid}
                className="h-12 px-4"
              />
              <p
                className={`mt-1.5 type-content-xs ${
                  countValid ? "text-contents-light-bgd-sub" : "text-function-error-default"
                }`}
              >
                {countValid ? "비우면 제한 없음" : "1 이상의 정수를 입력해 주세요"}
              </p>
            </div>

            {banner && (
              <p role="alert" className="text-center type-content-xs text-function-error-default">
                {banner}
              </p>
            )}

            <Button
              size="lg"
              className="w-full"
              icon={<ArrowRightIcon />}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {submitting ? "갤러리 만드는 중…" : "갤러리 만들기"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
