/**
 * 스튜디오 이용권 — 갤러리 1개를 만들 때 1개를 쓰는 선결제 이용권
 * 위치: src/lib/studioTickets.ts
 *
 * 서버에 이용권 API(수량별 상품·잔여 조회·생성 시 검사)가 아직 없어, 지금은 결제 모달이
 * 테스트 결제 API를 한 번 부른 뒤 수량을 여기(localStorage `sel.studioTickets`)에 더하고,
 * 갤러리를 만들 때 하나씩 뺀다. 프론트만의 소프트 게이트다 — 서버는 이용권을 검사하지 않는다.
 * 백엔드가 이용권 API를 주면 이 파일의 저장소를 서버 조회로 바꾸고 가격표만 남긴다.
 *
 * 가격: 1개 49,900원, 10개부터 10% · 30개부터 15% · 50개부터 20% 할인 (2026-09-10 결정, 기간 개념 없음).
 */

"use client";

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export const TICKET_UNIT_PRICE = 49_900;

/** 결제 모달의 수량 카드 — 할인율은 그 수량부터 적용된다 */
export const TICKET_PRESETS: ReadonlyArray<{ qty: number; discount: number }> = [
  { qty: 1, discount: 0 },
  { qty: 10, discount: 0.1 },
  { qty: 30, discount: 0.15 },
  { qty: 50, discount: 0.2 },
];

/** 수량에 적용되는 할인율 (0 ~ 0.2) */
export function ticketDiscount(qty: number): number {
  let discount = 0;
  for (const preset of TICKET_PRESETS) if (qty >= preset.qty) discount = preset.discount;
  return discount;
}

/** 할인 적용 금액 (원) */
export function ticketPrice(qty: number): number {
  return Math.round(TICKET_UNIT_PRICE * qty * (1 - ticketDiscount(qty)));
}

type TicketRecord = { total: number; remaining: number };
type TicketMap = Record<string, TicketRecord>;

const ticketStore = createLocalStore<TicketMap>("sel.studioTickets", {});

/** none = 산 적 없음(첫 진입) · full = 다 씀 · ok = 남아 있음 */
export type TicketState = "none" | "full" | "ok";

export type StudioTickets = {
  total: number;
  remaining: number;
  state: TicketState;
};

const EMPTY: TicketRecord = { total: 0, remaining: 0 };

export function useStudioTickets(workspaceId: number | null): StudioTickets {
  const map = useSyncExternalStore(
    ticketStore.subscribe,
    ticketStore.get,
    ticketStore.getServerSnapshot,
  );
  const record = (workspaceId !== null && map[String(workspaceId)]) || EMPTY;
  const state: TicketState =
    record.total === 0 ? "none" : record.remaining === 0 ? "full" : "ok";
  return { total: record.total, remaining: record.remaining, state };
}

/** 결제 성공 뒤 수량을 더한다 */
export function addTickets(workspaceId: number, qty: number) {
  const map = ticketStore.get();
  const prev = map[String(workspaceId)] ?? EMPTY;
  ticketStore.set({
    ...map,
    [String(workspaceId)]: {
      total: prev.total + qty,
      remaining: prev.remaining + qty,
    },
  });
}

/** 갤러리를 만들 때 하나 뺀다. 0 아래로는 내려가지 않는다 */
export function consumeTicket(workspaceId: number) {
  const map = ticketStore.get();
  const prev = map[String(workspaceId)] ?? EMPTY;
  ticketStore.set({
    ...map,
    [String(workspaceId)]: {
      total: prev.total,
      remaining: Math.max(0, prev.remaining - 1),
    },
  });
}
