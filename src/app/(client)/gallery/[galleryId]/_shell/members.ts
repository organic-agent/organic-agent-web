/**
 * 함께 고르는 사람 — 색 · 이니셜 배정(이슈 148)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/members.ts
 *
 * 개인 갤러리의 부부(소유자 + 파트너) 두 사람에게 색을 붙여, 그리드의 체크 칸(담은 사람) · 이니셜 칩과 배지(매긴 사람) ·
 * 크게 보기의 별과 "선택됨" 알약을 그 사람 색으로 칠한다. 글자 · 체크는 항상 검정(contents/dark-bgd/default)이라
 * 라이트 · 다크에서 같은 모양이다.
 *
 * 색은 서버 사용자 정보에 저장될 예정(서버 요청 중)이고, 그 전까지는 들어온 순서로 기본 색만 쓴다 — 먼저 들어온 사람 하늘,
 * 두 번째 코랄. 서버가 색을 주면 여기 assign만 바꾸면 된다(설정 화면의 색 고르기는 2차 PR).
 *
 * 이니셜은 닉네임 첫 글자(영문은 대문자). 두 사람 첫 글자가 같으면 두 글자까지 쓴다.
 */

import type { GalleryMemberResponse } from "@/lib/api/galleries";

/** 고를 수 있는 일곱 색 — 토큰 member/* (tokens/light.json · dark.json, 두 모드 같은 값) */
export const MEMBER_COLORS = [
  { key: "sky", name: "하늘" },
  { key: "coral", name: "코랄" },
  { key: "apricot", name: "살구" },
  { key: "lemon", name: "레몬" },
  { key: "sage", name: "세이지" },
  { key: "mint", name: "민트" },
  { key: "rose", name: "로즈" },
] as const;
export type MemberColorKey = (typeof MEMBER_COLORS)[number]["key"];

/** 기본 색 — 먼저 들어온 사람부터 */
const DEFAULT_ORDER: MemberColorKey[] = ["sky", "coral"];

/** CSS 변수 참조 — 인라인 style에 그대로 넣는다 */
export const memberColorVar = (key: MemberColorKey) => `var(--member-${key})`;

/** 사람 색 위의 글자 · 체크 색 — 파스텔 위에서 어느 색이든 8:1 이상 */
export const MEMBER_INK = "var(--contents-dark-bgd-default)";

export type Member = {
  userId: number;
  nickname: string;
  /** 나인가 */
  me: boolean;
  colorKey: MemberColorKey;
  /** 인라인 style에 넣는 색 */
  color: string;
  /** 칩 · 배지에 쓰는 한두 글자 */
  initial: string;
};

/** 닉네임의 첫 글자(영문은 대문자) — 길이만큼 자른다 */
function initialOf(nickname: string, length: number): string {
  const chars = [...nickname.trim()];
  return chars.slice(0, length).join("").toUpperCase();
}

/**
 * 멤버 목록에 색 · 이니셜을 붙인다 — 들어온 순서(joinedAt, 없으면 목록 순)로 기본 색을 준다.
 * 두 사람 첫 글자가 같으면 둘 다 두 글자.
 */
export function assignMembers(members: GalleryMemberResponse[], meId: number | null): Member[] {
  const ordered = members
    .map((m, i) => ({ m, i, at: m.joinedAt ? new Date(m.joinedAt).getTime() : Number.NEGATIVE_INFINITY }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ m }) => m);
  const firsts = ordered.map((m) => initialOf(m.nickname, 1));
  const clash = new Set(firsts.filter((c, i) => firsts.indexOf(c) !== i));
  return ordered.map((m, i) => {
    const colorKey = DEFAULT_ORDER[i] ?? MEMBER_COLORS[i % MEMBER_COLORS.length].key;
    const first = firsts[i];
    return {
      userId: m.userId,
      nickname: m.nickname,
      me: meId !== null && m.userId === meId,
      colorKey,
      color: memberColorVar(colorKey),
      initial: clash.has(first) ? initialOf(m.nickname, 2) : first,
    };
  });
}

/** 사용자 id → 멤버. 목록에 없는 id(나간 파트너 · 작가)는 undefined */
export function memberMapOf(members: Member[]): ReadonlyMap<number, Member> {
  return new Map(members.map((m) => [m.userId, m]));
}

/** 이름 뒤 주격 조사 — 받침이 있으면 "이", 없으면 "가". 한글이 아니면 "이"("서연이 담았어요" · "민주가 담았어요") */
export function subjectParticle(name: string): string {
  const last = [...name.trim()].at(-1);
  if (!last) return "이";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "이";
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}
