"use client";

/**
 * 편집기 위 배너 한 줄(이슈 168) — 보정 상태(노랑 보정 전 · 파랑 회차 반영 · 초록 확정) · 선택에서 빠진 사진(회색)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumBanner.tsx
 *
 * 오른쪽 ✕로 닫는다. 닫은 상태 키는 앨범과 함께 저장되고, 상태가 바뀌면(키가 다르면) 새 문구로 다시 뜬다. 둘이 함께면 위아래로 쌓인다.
 */

import { CheckCircleIcon, CloseIcon, InfoIcon } from "@/components/icons";

export type BannerTone = "warn" | "info" | "ok" | "neutral";

const TONE: Record<BannerTone, { box: string; icon: string }> = {
  warn: { box: "bg-function-warning-background", icon: "text-function-warning-default" },
  info: { box: "bg-function-info-background", icon: "text-function-info-default" },
  ok: { box: "bg-function-success-background", icon: "text-function-success-default" },
  neutral: { box: "bg-surface-default-light", icon: "text-contents-light-bgd-weakness" },
};

export function AlbumBanner({ tone, title, body, onClose }: { tone: BannerTone; title: string; body: string; onClose: () => void }) {
  const t = TONE[tone];
  return (
    <div role="status" className={`flex items-center gap-2.5 rounded-(--radius-8) px-3 py-2.5 type-content-s text-contents-light-bgd-default ${t.box}`}>
      <span className={`flex shrink-0 ${t.icon}`}>{tone === "ok" ? <CheckCircleIcon size={18} /> : <InfoIcon size={18} />}</span>
      <span className="min-w-0 flex-1">
        <b className="font-semibold">{title}</b>
        {body && <> · {body}</>}
      </span>
      <button type="button" aria-label="배너 닫기" onClick={onClose} className="flex shrink-0 cursor-pointer rounded-(--radius-4) p-1 text-contents-light-bgd-sub hover:bg-surface-default-light">
        <CloseIcon size={18} />
      </button>
    </div>
  );
}
