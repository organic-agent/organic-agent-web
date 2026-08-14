"use client";

/**
 * 작가 — 갤러리 목록 모달 공통 UI
 * 위치: src/app/(photographer)/galleries/_components/GalleryModalShell.tsx
 *
 * 생성/수정/삭제 모달의 공통 껍데기. 로그인 모달과 같은 문법
 * (오버레이 bg.overlay + 카드 radius-16 + 제목 heading.large)을 따르고,
 * 닫기 수단 3종(ESC · 우상단 X · 오버레이 클릭)도 LoginModal·ShareModal과 동일하게 지원한다.
 */

import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

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
  maxWidthClassName = "max-w-105",
  paddingClassName = "p-8",
  onClose,
  children,
}: GalleryModalShellProps) {
  // ESC 닫기 + 열려 있는 동안 배경 스크롤 잠금 (LoginModal·ShareModal과 동일 동작)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center px-4"
    >
      <div
        className="absolute inset-0 bg-bg-overlay backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${maxWidthClassName} rounded-(--radius-16) bg-bg-layer-default shadow-(--shadow-modal) ${paddingClassName}`}
      >
        <IconButton
          icon={<CloseIcon />}
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5"
        />
        <h2 className="mb-1 pr-8 type-heading-large text-fg-neutral">
          {title}
        </h2>
        {desc && (
          <p className="mb-6 type-body-medium text-fg-neutral-muted">{desc}</p>
        )}
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
  /** accent = 로즈 — "선택 확정" 액션 전용 (예: 부부의 전달하기) */
  confirmVariant?: "primary" | "danger" | "accent";
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Button kind="ghost" onClick={onClose} className="flex-1">
        취소
      </Button>
      {confirmVariant === "danger" ? (
        // 파괴적 확정 — bg.critical 계열 토큰이 아직 없어 fg.critical을 배경으로 차용 (토큰 추가 시 교체)
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-(--pill) bg-fg-critical px-5 type-label-button text-fg-neutral-inverted transition-opacity duration-fast hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
        >
          {confirmLabel}
        </button>
      ) : (
        <Button
          kind={confirmVariant === "accent" ? "accent" : "primary"}
          onClick={onConfirm}
          disabled={disabled}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
      )}
    </div>
  );
}
