"use client";

/**
 * 스튜디오 이용권 결제 모달 (선결제 · 수량 할인)
 * 위치: src/app/(studio)/studio/_components/TicketCheckoutModal.tsx
 *
 * 수량 카드 1 · 10 · 30 · 50개(10% · 15% · 20% 할인) → 주문 요약 → 테스트 결제.
 * 이용권 1개 = 갤러리 1개, 기간 개념 없음. 서버에 이용권 상품·잔여 API가 아직 없어
 * 테스트 결제(POST /payments/checkout)를 서버의 플랜 하나로 한 번 부르고, 수량은
 * 로컬 이용권 저장소(studioTickets)에 더한다. 실결제 PG와 서버 이용권은 백엔드 요청 항목.
 *
 * mode — first: 첫 진입(이용권 없음) · over: 다 써서 새 갤러리가 막힘 · add: pill의 추가
 */

import { useState } from "react";
import { InfoIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { createCheckout, formatAmount, getPlans } from "@/lib/api/payments";
import {
  TICKET_PRESETS,
  TICKET_UNIT_PRICE,
  addTickets,
  ticketDiscount,
  ticketPrice,
} from "@/lib/studioTickets";
import { GalleryModalShell } from "./GalleryModalShell";
import { Button } from "@/components/ui/Button";

export type TicketCheckoutMode = "first" | "over" | "add";

const COPY: Record<TicketCheckoutMode, { title: string; desc: (remaining: number) => string }> = {
  first: {
    title: "이용권을 결제해요",
    desc: () => "갤러리 하나에 이용권 하나. 많이 살수록 할인돼요.",
  },
  over: {
    title: "이용권을 모두 썼어요",
    desc: () => "이용권을 추가하면 바로 만들 수 있어요. 갤러리 하나에 이용권 하나를 써요.",
  },
  add: {
    title: "이용권 추가",
    desc: (remaining) => `지금 ${remaining}개 남았어요. 추가한 만큼 늘어나요.`,
  },
};

export function TicketCheckoutModal({
  mode,
  workspaceId,
  remaining,
  onClose,
  onPurchased,
}: {
  mode: TicketCheckoutMode;
  workspaceId: number;
  remaining: number;
  onClose: () => void;
  /** 결제가 끝나 이용권이 더해진 뒤 — first·over는 이어서 새 갤러리 모달을 연다 */
  onPurchased: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [paying, setPaying] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const listPrice = TICKET_UNIT_PRICE * qty;
  const total = ticketPrice(qty);
  const discount = listPrice - total;
  const cta =
    mode === "over"
      ? `${formatAmount(total)}원 결제하고 갤러리 만들기`
      : mode === "first"
        ? `${formatAmount(total)}원 테스트 결제하고 시작`
        : `${formatAmount(total)}원 테스트 결제`;

  function handleClose() {
    if (paying) return;
    onClose();
  }

  async function pay() {
    if (paying) return;
    setPaying(true);
    setBanner(null);
    try {
      const res = await getPlans();
      const plan = res.plans[0];
      if (!plan || !res.testCheckoutEnabled) {
        throw new Error("지금은 결제를 열 수 없어요. 잠시 뒤 다시 시도해 주세요.");
      }
      await createCheckout(plan.id);
      addTickets(workspaceId, qty);
      onPurchased(qty);
    } catch (err) {
      setPaying(false);
      setBanner(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "결제를 시작하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }

  return (
    <GalleryModalShell
      title={COPY[mode].title}
      desc={COPY[mode].desc(remaining)}
      maxWidthClassName="max-w-[560px]"
      onClose={handleClose}
    >
      <div role="radiogroup" aria-label="이용권 수량" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {TICKET_PRESETS.map((preset) => {
          const checked = qty === preset.qty;
          return (
            <button
              key={preset.qty}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setQty(preset.qty)}
              className="relative flex cursor-pointer flex-col gap-0.5 rounded-(--radius-12) border border-divider-default bg-background-default-main px-3 pt-4 pb-3 text-left transition-[border-color,box-shadow] duration-fast hover:border-brand-secondary-light aria-checked:border-brand-primary-default aria-checked:shadow-[inset_0_0_0_1px_var(--brand-primary-default)]"
            >
              {preset.discount > 0 && (
                <span className="absolute -top-2.5 right-2.5 rounded-(--pill) bg-brand-secondary-default px-2 py-0.5 type-label-semibold-xs text-contents-dark-bgd-default">
                  {Math.round(preset.discount * 100)}% 할인
                </span>
              )}
              <span className="type-label-semibold-m text-contents-light-bgd-default">
                이용권 {preset.qty}개
              </span>
              <span className="mt-1.5 type-label-semibold-l text-contents-light-bgd-default tabular-nums">
                {formatAmount(ticketPrice(preset.qty))}
                <span className="ml-0.5 type-content-xs font-normal text-contents-light-bgd-weakness">원</span>
              </span>
              <span className="type-content-xs text-contents-light-bgd-weakness tabular-nums">
                {preset.discount > 0 ? (
                  <s>{formatAmount(TICKET_UNIT_PRICE * preset.qty)}원</s>
                ) : (
                  `개당 ${formatAmount(TICKET_UNIT_PRICE)}원`
                )}
              </span>
            </button>
          );
        })}
      </div>

      <dl className="mt-5 flex flex-col gap-2 rounded-(--radius-12) border border-divider-default px-4.5 py-4 type-content-s">
        <div className="flex justify-between gap-3">
          <dt className="text-contents-light-bgd-weakness">
            이용권 {qty}개 × {formatAmount(TICKET_UNIT_PRICE)}원
          </dt>
          <dd className="font-medium text-contents-light-bgd-default tabular-nums">
            {formatAmount(listPrice)}원
          </dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-contents-light-bgd-weakness">
              수량 할인 {Math.round(ticketDiscount(qty) * 100)}%
            </dt>
            <dd className="font-medium text-brand-secondary-dark tabular-nums">
              −{formatAmount(discount)}원
            </dd>
          </div>
        )}
        <div className="mt-0.5 flex justify-between border-t border-divider-default pt-2 type-content-m">
          <dt className="text-contents-light-bgd-weakness">결제 금액</dt>
          <dd className="type-label-semibold-m text-contents-light-bgd-default tabular-nums">
            {formatAmount(total)}원
          </dd>
        </div>
      </dl>

      <p className="mt-3 flex items-start gap-2 rounded-(--radius-8) bg-function-info-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
        <span className="mt-px shrink-0 text-function-info-default">
          <InfoIcon size={16} />
        </span>
        지금은 테스트 결제예요. 실제 돈은 나가지 않고 이용권만 발급돼요.
      </p>

      {banner && (
        <p role="alert" className="mt-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <Button kind="ghost" onClick={handleClose} className="flex-1" disabled={paying}>
          취소
        </Button>
        <Button onClick={pay} className="flex-[2]" disabled={paying}>
          {paying ? "결제하는 중…" : cta}
        </Button>
      </div>
    </GalleryModalShell>
  );
}
