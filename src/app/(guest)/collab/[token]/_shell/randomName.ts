/**
 * 랜덤 게스트 이름 — 형용사 + 동물 (2026-09-13 수민: 오픈채팅처럼 미리 적혀 있고 다시 뽑기)
 * 위치: src/app/(guest)/collab/[token]/_shell/randomName.ts
 *
 * 서버는 이름 필수(1~50자) · 중복 허용이라 그대로 들어와도 된다. 아바타 글자는 동물 첫 글자.
 */

const ADJECTIVES = ["행복한", "느긋한", "수줍은", "명랑한", "포근한", "씩씩한", "상냥한", "고요한", "반짝이는", "다정한", "든든한", "산뜻한", "너그러운", "설레는", "차분한", "유쾌한"];
const ANIMALS = ["고양이", "판다", "사슴", "강아지", "토끼", "여우", "펭귄", "수달", "알파카", "코알라", "부엉이", "돌고래", "다람쥐", "고슴도치", "물범", "치타"];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

export function randomGuestName(exclude?: string): string {
  for (let i = 0; i < 8; i++) {
    const name = `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
    if (name !== exclude) return name;
  }
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}

/** 아바타 글자 — "행복한 고양이" → "고", 한 단어면 첫 글자 */
export function guestInitial(nickname: string): string {
  const words = nickname.trim().split(/\s+/);
  return (words.length > 1 ? words[words.length - 1] : words[0]).slice(0, 1) || "?";
}
