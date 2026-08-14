/**
 * 작가 — 갤러리 목록 모달 공통 UI
 * 위치: src/app/(photographer)/galleries/_components/GalleryModalShell.tsx
 *
 * 갤러리 목록에서 사용하는 생성/수정/삭제 모달의 공통 껍데기다.
 * 배경 딤, 제목, 설명, 버튼 묶음 레이아웃을 제공한다.
 *
 * 주요 책임:
 * - 모달 배경과 본문 컨테이너 렌더링
 * - 제목/설명/본문 슬롯 제공
 * - 기본/위험 액션 버튼 묶음 제공
 */

import type { ReactNode } from "react";

type GalleryModalShellProps = {
  title: string;
  desc?: string;
  maxWidthClassName?: string;
  paddingClassName?: string;
  onClose: () => void;
  children: ReactNode;
};

export function GalleryModalShell({
  title,
  desc,
  maxWidthClassName = "max-w-[420px]",
  paddingClassName = "p-8",
  onClose,
  children,
}: GalleryModalShellProps) {
  return (
    <div className="fixed inset-0 z-[150] grid place-items-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${maxWidthClassName} bg-white rounded-2xl ${paddingClassName}`}
      >
        <h2 className="font-display-ko font-medium text-[20px] text-ink mb-1">
          {title}
        </h2>
        {desc && <p className="text-[13px] text-ink-2 mb-6">{desc}</p>}
        {children}
      </div>
    </div>
  );
}

export function GalleryModalButtons({
  onClose,
  onConfirm,
  confirmLabel,
  confirmVariant = "primary",
  disabled = false,
}: {
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  disabled?: boolean;
}) {
  const confirmClassName =
    confirmVariant === "danger"
      ? "bg-danger text-white hover:bg-red-700"
      : "bg-ink text-on-ink hover:bg-[#333]";

  return (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
        type="button"
      >
        취소
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className={`flex-1 h-11 rounded-pill text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${confirmClassName}`}
        type="button"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
