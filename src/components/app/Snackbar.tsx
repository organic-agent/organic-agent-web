/**
 * 스낵바 — 잠깐 떴다 사라지는 알림의 공용 모양 (디자이너 DS 스낵바, 피그마 DS 파일 39:357)
 * 위치: src/components/app/Snackbar.tsx
 *
 * 모양만 맡는다 — 언제 띄우고 지울지, 화면 어디에 둘지(className)는 쓰는 쪽이 정한다.
 * 시안(높이 56 · 글자 16 · 아이콘 24)의 모양 · 색 · 아이콘을 그대로 두고 크기만 줄였다: 높이 36 · 글자 13 · 아이콘 18
 * (2026-10-05 결정). 폭은 글자에 맞추고 닫기 버튼은 없다. 아이콘은 뜻에 맞게 네 가지.
 */

import type { ReactNode } from "react";

export type SnackbarKind = "info" | "success" | "error" | "warning";

// 디자이너 스낵바 아이콘(채운 도형, 24 격자) — 사이트 아이콘 세트(icons.tsx)는 선 도형이라 여기에 따로 둔다
const ICONS: Record<SnackbarKind, { className: string; opacity: number; path: string }> = {
  info: {
    className: "text-function-info-default",
    opacity: 0.7,
    path: "M12 2C6.47715 2 2 6.4772 2 12C2 17.5229 6.47715 22 12 22C17.5228 22 22 17.5229 22 12C22 6.4772 17.5228 2 12 2ZM12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9ZM12 17C11.4477 17 11 16.5523 11 16V12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12V16C13 16.5523 12.5523 17 12 17Z",
  },
  success: {
    className: "text-function-success-default",
    opacity: 1,
    path: "M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM17.2637 8.20703C16.8732 7.81658 16.2401 7.81672 15.8496 8.20703L10.3643 13.6924L8.12109 11.4502C7.73057 11.0597 7.09755 11.0597 6.70703 11.4502C6.31676 11.8407 6.31659 12.4738 6.70703 12.8643L9.65723 15.8135C10.0478 16.2039 10.6808 16.204 11.0713 15.8135L17.2637 9.62109C17.654 9.23058 17.6541 8.59749 17.2637 8.20703Z",
  },
  error: {
    className: "text-function-error-default",
    opacity: 0.7,
    path: "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15ZM12 7C11.4477 7 11 7.44772 11 8V12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12V8C13 7.44772 12.5523 7 12 7Z",
  },
  warning: {
    className: "text-function-warning-default",
    opacity: 0.7,
    path: "M10.2688 4.98984C11.0392 3.65927 12.9604 3.65927 13.7308 4.98984L21.262 17.9977C22.0339 19.3309 21.0719 20.9993 19.5315 20.9996H4.46904C2.92837 20.9996 1.96566 19.331 2.73759 17.9977L10.2688 4.98984ZM12.0003 15.9996C11.4481 15.9996 11.0005 16.4475 11.0003 16.9996C11.0003 17.5519 11.448 17.9996 12.0003 17.9996C12.5524 17.9995 13.0003 17.5518 13.0003 16.9996C13.0001 16.4476 12.5523 15.9998 12.0003 15.9996ZM12.0003 8.99961C11.4481 8.99961 11.0005 9.4475 11.0003 9.99961V13.9996C11.0003 14.5519 11.448 14.9996 12.0003 14.9996C12.5524 14.9995 13.0003 14.5518 13.0003 13.9996V9.99961C13.0001 9.4476 12.5523 8.99976 12.0003 8.99961Z",
  },
};

export function Snackbar({
  kind,
  action,
  className = "",
  children,
}: {
  kind: SnackbarKind;
  /** 문구 옆 버튼 하나(실행 취소 등) */
  action?: { label: string; onClick: () => void };
  /** 자리 잡기 — fixed bottom-8 left-1/2 -translate-x-1/2 등 */
  className?: string;
  children: ReactNode;
}) {
  const icon = ICONS[kind];
  return (
    <div
      role="status"
      className={`flex min-h-9 w-max max-w-[calc(100vw-32px)] items-center gap-1.5 rounded-(--radius-8) bg-surface-default-darkness py-1 pr-1.5 pl-2.5 type-content-s text-contents-dark-bgd-default ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-4.5 shrink-0 ${icon.className}`}>
        <path d={icon.path} fill="currentColor" fillOpacity={icon.opacity} />
      </svg>
      <span className="min-w-0 pr-2">{children}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 cursor-pointer rounded-(--radius-4) px-2.5 py-1.5 type-label-semibold-s whitespace-nowrap transition-colors duration-fast hover:bg-surface-inverse-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
