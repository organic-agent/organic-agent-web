"use client";

/**
 * 개인 갤러리 초대 모달 — 파트너 | 게스트 탭 (묶음 D, 2026-09-23 확정)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PersonalInviteModal.tsx
 *
 * 작가 갤러리 초대 모달(GalleryInviteModal)과 같은 구조 — 제목 "초대" + 갤러리 이름, 알약 세그먼트 탭.
 * 파트너 탭은 PartnerInviteBody(링크 · 현황 · 내보내기), 게스트 탭은 초대 클라이언트의 게스트 초대 본문(InviteGuestsBody)
 * 그대로 — 셀렉부터 열리고 그 전엔 잠금 아이콘만(글자 없음). 상단 초대 버튼은 업로드 단계부터 소유자에게 보인다.
 */

import { useState, type ReactNode } from "react";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { LockIcon } from "@/components/icons";
import { PartnerInviteBody } from "./PartnerInviteBody";

export type PersonalInviteTab = "partner" | "guest";

export function PersonalInviteModal({
  galleryId,
  galleryTitle,
  guest,
  initialTab = "partner",
  onClose,
}: {
  galleryId: number;
  galleryTitle: string;
  /** 게스트 탭 본문 — null이면 아직 잠김(셀렉 전) */
  guest: ReactNode | null;
  initialTab?: PersonalInviteTab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PersonalInviteTab>(guest ? initialTab : "partner");
  return (
    <GalleryModalShell title="초대" desc={galleryTitle} maxWidthClassName={tab === "guest" ? "max-w-140" : "max-w-[460px]"} onClose={onClose}>
      <div role="tablist" className="mb-4 flex rounded-(--radius-8) bg-surface-default-light p-0.75">
        {(["partner", "guest"] as const).map((key) => {
          const locked = key === "guest" && guest === null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-disabled={locked || undefined}
              disabled={locked}
              onClick={() => setTab(key)}
              className={`inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-(--radius-8) type-label-medium-s transition-colors duration-fast ${
                tab === key
                  ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-(--shadow-hover)"
                  : locked
                    ? "cursor-default text-contents-light-bgd-weakness"
                    : "cursor-pointer text-contents-light-bgd-sub hover:text-contents-light-bgd-default"
              }`}
            >
              {locked && <LockIcon size={14} />}
              {key === "partner" ? "파트너" : "게스트"}
            </button>
          );
        })}
      </div>
      {tab === "partner" || guest === null ? <PartnerInviteBody galleryId={galleryId} canManage onClose={onClose} /> : guest}
    </GalleryModalShell>
  );
}
