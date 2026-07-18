import Link from "next/link";

type Props = {
  folderName: string;
  folderMemo?: string;
  onVoteClick: () => void;
  onShareClick: () => void;
};

export function CollaborationDetailHeader({
  folderName,
  folderMemo,
  onVoteClick,
  onShareClick,
}: Props) {
  return (
    <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/collaboration"
          className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep transition-colors shrink-0"
          aria-label="협업 셀렉 목록으로"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="font-display-ko font-medium text-[18px] text-ink truncate leading-tight">
            {folderName}
          </h1>
          {folderMemo && (
            <p className="text-[12px] text-ink-3 truncate">{folderMemo}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onVoteClick}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-pill border border-ink text-[13px] font-medium text-ink hover:bg-ink hover:text-on-ink transition-colors"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          투표 만들기
        </button>
        <button
          type="button"
          onClick={onShareClick}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-pill bg-ink text-on-ink text-[13px] font-medium hover:bg-[#333] transition-colors"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
          공유
        </button>
      </div>
    </header>
  );
}
