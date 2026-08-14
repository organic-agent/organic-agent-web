/**
 * 작가 — 갤러리 상세 모달 공통 UI
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/ModalShell.tsx
 *
 * 갤러리 상세 화면에서 사용하는 모달의 공통 껍데기와 버튼 묶음이다.
 * 제목, 설명, 닫기 버튼, 배경 딤 처리 구조를 제공한다.
 *
 * 주요 책임:
 * - 모달 레이아웃과 닫기 처리
 * - 모달 제목/설명/본문 슬롯 제공
 * - 취소/확인 버튼 UI 제공
 */

import type { ReactNode } from "react";

type ModalShellProps = {
  onClose: () => void;
  title: string;
  desc: string;
  children: ReactNode;
};

export function ModalShell({
  onClose,
  title,
  desc,
  children,
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-[150] grid place-items-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-2xl p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-ink-3 hover:bg-paper-deep transition-colors"
          aria-label="닫기"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 className="font-display-ko font-medium text-[20px] text-ink mb-1">
          {title}
        </h2>
        <p className="text-[13px] text-ink-2 mb-6">{desc}</p>
        {children}
      </div>
    </div>
  );
}

export function ModalButtons({
  onClose,
  onConfirm,
  confirmLabel,
}: {
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
      >
        취소
      </button>
      <button
        onClick={onConfirm ?? onClose}
        className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] transition-colors"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
