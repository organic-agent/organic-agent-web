"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  folderName: string;
  onRename: () => void;
};

export function FolderCardMenu({ folderName, onRename }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div className="absolute right-4 top-4 z-[3]" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`${folderName} 폴더 관리 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-full border border-transparent text-ink-3 grid place-items-center hover:text-ink hover:border-line hover:bg-paper-deep transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5h.01M12 12h.01M12 19h.01" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] w-[132px] rounded-lg border border-line bg-white shadow-md py-1.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
            className="w-full px-4 py-2.5 text-left text-[13px] text-ink-2 hover:bg-paper-deep hover:text-ink transition-colors"
          >
            이름 수정
          </button>
        </div>
      )}
    </div>
  );
}
