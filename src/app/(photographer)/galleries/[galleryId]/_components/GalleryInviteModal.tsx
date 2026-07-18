/**
 * 작가 — 갤러리 초대 모달
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryInviteModal.tsx
 *
 * 갤러리 상세 화면에서 신혼부부에게 보낼 초대 링크를 보여준다.
 * 초대 확인 액션을 부모 컴포넌트로 전달한다.
 *
 * 주요 책임:
 * - 초대 링크와 인증번호 표시
 * - 취소/확인 버튼 표시
 * - 초대 확인 이벤트 전달
 *
 * 참고:
 * - 실제 메시지 발송은 아직 연결되어 있지 않다.
 */

import { useEffect, useState } from "react";
import { ModalButtons, ModalShell } from "./ModalShell";

const INVITE_URL = "https://www.easyselect.kr/invite/a1b2c3d4";
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
    <ModalShell
      onClose={onClose}
      title="초대 링크"
      desc="이 링크를 신혼부부에게 보내세요."
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-11 px-3.5 rounded-md border border-line bg-paper-deep flex items-center font-mono text-[12px] text-ink-2 truncate">
          {INVITE_URL}
        </div>
        <button
          onClick={copyInviteUrl}
          className="h-11 min-w-[72px] px-4 rounded-md bg-ink text-on-ink text-[13px] font-medium hover:bg-[#333] transition-colors shrink-0"
          type="button"
        >
          {copyState === "copied" ? "복사됨" : "복사"}
        </button>
      </div>
      {copyState === "failed" && (
        <p className="text-[12px] text-danger mb-3">
          복사에 실패했어요. 링크를 직접 선택해서 복사해주세요.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="rounded-lg border border-line bg-paper-deep px-4 py-3">
          <p className="text-[11px] font-medium text-ink-3 mb-1">인증번호</p>
          <p className="font-mono text-[22px] font-semibold tracking-[0.18em] text-ink">
            {INVITE_CODE}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-paper-deep px-4 py-3">
          <p className="text-[11px] font-medium text-ink-3 mb-1">링크 만료</p>
          <p className="text-[15px] font-semibold text-accent-press">
            {EXPIRES_IN}
          </p>
        </div>
      </div>
      <ModalButtons
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="카카오톡으로 보내기"
      />
    </ModalShell>
  );
}
