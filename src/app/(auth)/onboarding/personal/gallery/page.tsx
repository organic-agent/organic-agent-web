"use client";

/**
 * 개인 갤러리 온보딩 — 갤러리 정보 (일반 진입 · 쿠폰 진입이 함께 쓰는 마지막 화면)
 * 위치: src/app/(auth)/onboarding/personal/gallery/page.tsx
 *
 * 주소의 plan(free · pro)과 coupon(프로일 때 미사용 쿠폰 id)으로 어떤 갤러리를 만들지 정한다. 무료는 내 혜택의
 * freePlanAvailable, 프로는 그 쿠폰이 내 것이고 미사용인지 확인하고, 아니면 앞 화면으로 돌려보낸다.
 * 배지는 플랜 응답 값으로 "프로 · 10,000장 · 1년" / "무료로 시작 · 500장 · 1개월". 단계 표시와 뒤로 가기만
 * 들어온 길에 따라 다르다(쿠폰 등록 · 플랜 선택). 이름·목표일·고를 장수를 받아 planId · couponId로 개설한다.
 * 목표일(서버 필드 selectionDeadline)은 갤러리가 닫히는 날이 아니라 D-day를 세는 기준이다 — 갤러리는 이용 기간 동안
 * 열려 있어서 "선택 마감"이라는 이름을 쓰지 않는다(QA BUG-1, 2026-10-04). 비우면 서버가 이용 기간 마지막 날을 넣는다.
 * 촬영 종류는 화면에서 받지 않고 본식으로 보낸다 — 갤러리 설정에서 바꿀 수 있다. 이슈 81.
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
import {
  formatAmount,
  getMyBenefits,
  getPlans,
  isFreePlan,
  planDurationLabel,
  type Plan,
  type ProCouponResponse,
} from "@/lib/api/payments";
import { refreshMe } from "@/lib/auth/refreshMe";
import { COUPON_PATH } from "@/lib/couponLink";
import {
  GOAL_DATE_PROBLEM_MESSAGE,
  GOAL_DATE_REJECTED_CODE,
  goalDateProblem,
  goalDateRange,
  goalDateRejectedMessage,
  planExpiryFromNow,
} from "@/lib/goalDateRange";
import { PersonalSteps } from "../_components/PersonalSteps";

export default function PersonalGalleryPage() {
  return (
    <Suspense fallback={null}>
      <PersonalGalleryForm />
    </Suspense>
  );
}

type Ticket = { plan: Plan; coupon: ProCouponResponse | null };

function PersonalGalleryForm() {
  const router = useRouter();
  const search = useSearchParams();
  const planParam = search.get("plan");
  const couponParam = search.get("coupon");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  /** 날짜 칸에 뭔가 적혀 있는데 날짜로 읽히지 않는 상태 — 값은 빈 문자열이라 따로 받는다 */
  const [deadlineUnreadable, setDeadlineUnreadable] = useState(false);
  const [now] = useState(() => Date.now());
  const [count, setCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // 주소가 가리키는 플랜 · 쿠폰이 지금 쓸 수 있는 것인지 — 아니면 앞 화면으로
  useEffect(() => {
    if (planParam !== "free" && planParam !== "pro") {
      router.replace("/onboarding/personal");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [plansRes, benefits] = await Promise.all([getPlans(), getMyBenefits()]);
        if (cancelled) return;
        const plan = plansRes.plans.find((p) => p.id === planParam);
        if (!plan) {
          router.replace("/onboarding/personal");
          return;
        }
        if (planParam === "free") {
          if (!benefits.freePlanAvailable) {
            router.replace("/onboarding/personal");
            return;
          }
          setTicket({ plan, coupon: null });
          return;
        }
        const couponId = Number(couponParam);
        const coupon = benefits.coupons.find((c) => c.couponId === couponId && c.status === "AVAILABLE") ?? null;
        if (!coupon) {
          router.replace(COUPON_PATH);
          return;
        }
        setTicket({ plan, coupon });
      } catch {
        if (!cancelled) router.replace("/onboarding/personal");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planParam, couponParam, router]);

  const pro = ticket !== null && !isFreePlan(ticket.plan);
  const countNumber = Number(count);
  const countValid = count === "" || (Number.isInteger(countNumber) && countNumber >= 1);
  // 목표일은 오늘부터 이용 기간 안에서만 — 달력은 범위만 고르게 막고, 손으로 적은 범위 밖 날짜는 이유를 보여 준다
  const goalRange = goalDateRange(ticket ? planExpiryFromNow(ticket.plan, now) : null, now);
  const deadlineProblem = goalDateProblem(deadline, goalRange, deadlineUnreadable);
  const canSubmit = title.trim().length > 0 && countValid && deadlineProblem === null && !submitting && ticket !== null;

  async function handleSubmit() {
    if (!canSubmit || !ticket) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const gallery = await createPersonalGallery({
        title: title.trim(),
        selectionDeadline: deadline ? toSelectionDeadline(deadline) : null,
        maxSelectablePhotoCount: count ? countNumber : null,
        shootType: "CEREMONY",
        planId: pro ? "pro" : "free",
        ...(ticket.coupon ? { couponId: ticket.coupon.couponId } : {}),
      });
      // 새 개인 작업공간이 내 소속에 실려야 갤러리 화면이 개인 갤러리로 판정한다(personalMembershipOf)
      await refreshMe();
      router.replace(`/gallery/${gallery.id}`);
    } catch (err) {
      setSubmitting(false);
      setBanner(
        err instanceof ApiError
          ? err.code === GOAL_DATE_REJECTED_CODE
            ? goalDateRejectedMessage(deadline, goalRange)
            : err.message
          : "갤러리를 만들지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  const badge = ticket
    ? pro
      ? `${ticket.plan.name} · ${formatAmount(ticket.plan.maxPhotoCount)}장 · ${planDurationLabel(ticket.plan)}`
      : `무료로 시작 · ${formatAmount(ticket.plan.maxPhotoCount)}장 · ${planDurationLabel(ticket.plan)}`
    : null;

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar />
      <div className="grid flex-1 place-items-start justify-items-center px-6 py-10">
        <div className="w-full max-w-130">
          <Link
            href={pro ? COUPON_PATH : "/onboarding/personal"}
            className="mb-5 inline-flex items-center gap-1 type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
          >
            <BackIcon size={16} />
            {pro ? "쿠폰 등록으로" : "플랜 선택으로"}
          </Link>
          <PersonalSteps variant={pro ? "coupon" : "plan"} current="gallery" />

          {badge && (
            <span
              className={`mb-3 inline-flex items-center rounded-(--pill) px-2.5 py-1 type-label-semibold-xs ${
                pro
                  ? "bg-function-success-surface text-contents-light-bgd-default"
                  : "bg-brand-secondary-background text-brand-secondary-dark"
              }`}
            >
              {badge}
            </span>
          )}

          <p className="type-label-eyebrow text-brand-secondary-default">For Individuals</p>
          <h1 className="mt-2 mb-1.5 type-title-xl text-balance text-contents-light-bgd-default">
            갤러리 정보를 알려 주세요
          </h1>
          <p className="type-content-m text-contents-light-bgd-sub">
            목표일과 장수는 나중에 갤러리 설정에서 바꿀 수 있어요.
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
                목표일
                <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
              </label>
              <TextField
                id="gallery-deadline"
                type="date"
                value={deadline}
                onChange={setDeadline}
                onBadInput={setDeadlineUnreadable}
                min={goalRange.min}
                max={goalRange.max ?? undefined}
                error={deadlineProblem !== null}
                className="h-12 px-4"
              />
              <p
                className={`mt-1.5 type-content-xs ${
                  deadlineProblem ? "text-function-error-default" : "text-contents-light-bgd-sub"
                }`}
              >
                {deadlineProblem ? GOAL_DATE_PROBLEM_MESSAGE[deadlineProblem] : "정하면 남은 날을 D-day로 보여 줘요"}
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
