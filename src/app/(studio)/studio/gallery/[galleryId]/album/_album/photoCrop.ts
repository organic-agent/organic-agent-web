/**
 * 프레임 안 사진 위치(이슈 168 PR ②) — 화면에 그리는 법
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/photoCrop.ts
 *
 * object-fit: cover로 프레임을 채운 뒤 object-position과 transform-origin을 같은 자리(px, py)에 두고 배율 s로 키우면
 * 모델의 cropRect(사진 비율로 계산한 자리)와 똑같아진다 — 그래서 사진 비율을 몰라도 그릴 수 있다(펼침면 · 띠 · 미리보기 공통).
 */

import type { CSSProperties } from "react";
import { isDefaultCrop, type Crop } from "@/lib/album/model";

export function cropStyle(c: Crop | null | undefined): CSSProperties | undefined {
  if (!c || isDefaultCrop(c)) return undefined;
  const pos = `${c.px * 100}% ${c.py * 100}%`;
  return { objectPosition: pos, transformOrigin: pos, transform: `scale(${c.s})` };
}
