"use client";

/**
 * 작가 — 부부 초대 모달
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryInviteModal.tsx
 *
 * 워크스페이스 탑바의 공유 버튼에서 열어, 신혼부부에게 보낼 초대 링크를 보여준다.
 * 실제 메시지 발송은 아직 연결되어 있지 않다 — 확인 액션만 부모로 전달한다.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "../../_components/GalleryModalShell";

const INVITE_URL = "https://easyselect.app/invite/a1b2c3d4";
const INVITE_CODE = "4728";
const EXPIRES_IN = "7일 후 만료";

type Props = {
  onClose: () => void;
  onConfirm: () => void;
};

export function GalleryInviteModal({ onClose, onConfirm }: Props) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyInviteUrl() {
    try {
      await navigator.clipboard.writeText(INVITE_URL);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <GalleryModalShell
      title="초대 링크"
      desc="이 링크를 신혼부부에게 보내세요."
      onClose={onClose}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center truncate rounded-(--radius-8) border border-stroke-neutral-muted bg-bg-layer-default-hover px-3.5 type-body-small text-fg-neutral-muted">
          {INVITE_URL}
        </div>
        <Button size="sm" onClick={copyInviteUrl} className="shrink-0">
          {copyState === "copied" ? "복사됨" : "복사"}
        </Button>
      </div>
      {copyState === "failed" && (
        <p className="mb-3 type-body-small text-fg-critical">
          복사에 실패했어요. 링크를 직접 선택해서 복사해주세요.
        </p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-2">
        <div className="rounded-(--radius-8) border border-stroke-neutral-muted px-4 py-3">
          <p className="mb-1 type-body-small text-fg-neutral-muted">인증번호</p>
          <p className="type-heading-page text-fg-neutral tracking-[0.18em]">
            {INVITE_CODE}
          </p>
        </div>
        <div className="rounded-(--radius-8) border border-stroke-neutral-muted px-4 py-3">
          <p className="mb-1 type-body-small text-fg-neutral-muted">링크 만료</p>
          <p className="type-label-button text-fg-neutral">{EXPIRES_IN}</p>
        </div>
      </div>
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="카카오톡으로 보내기"
      />
    </GalleryModalShell>
  );
}
