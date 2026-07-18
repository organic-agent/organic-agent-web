import type { ReactNode } from "react";

type ModalFrameProps = {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  desc?: string;
  maxWidthClassName?: string;
  paddingClassName?: string;
  showCloseButton?: boolean;
};

export function ModalFrame({
  children,
  onClose,
  title,
  desc,
  maxWidthClassName = "max-w-[520px]",
  paddingClassName = "p-8",
  showCloseButton = true,
}: ModalFrameProps) {
  return (
    <div className="fixed inset-0 z-[150] grid place-items-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${maxWidthClassName} bg-white rounded-2xl ${paddingClassName}`}
      >
        {showCloseButton && (
          <button
            type="button"
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
        )}
        {title && (
          <h2 className="font-display-ko font-medium text-[20px] text-ink mb-1">
            {title}
          </h2>
        )}
        {desc && <p className="text-[13px] text-ink-2 mb-6">{desc}</p>}
        {children}
      </div>
    </div>
  );
}
