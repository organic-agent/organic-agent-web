type CopyState = "idle" | "copied" | "failed";

type Props = {
  message: string;
  voteLink: string;
  copyState: CopyState;
  onCopy: () => void;
  onClose: () => void;
};

export function VoteLinkNotice({
  message,
  voteLink,
  copyState,
  onCopy,
  onClose,
}: Props) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-accent-soft bg-accent-soft/40 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[13px] font-medium text-accent-press">{message}</p>
        {voteLink && (
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-ink-3 hover:text-ink"
          >
            닫기
          </button>
        )}
      </div>
      {voteLink && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-11 px-3.5 rounded-md border border-line bg-white flex items-center font-mono text-[12px] text-ink-2 truncate">
              {voteLink}
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="h-11 min-w-[72px] px-4 rounded-md bg-ink text-on-ink text-[13px] font-medium hover:bg-[#333] transition-colors shrink-0"
            >
              {copyState === "copied" ? "복사됨" : "복사"}
            </button>
          </div>
          {copyState === "failed" && (
            <p className="text-[12px] text-danger mt-2">
              복사에 실패했어요. 링크를 직접 선택해서 복사해주세요.
            </p>
          )}
        </>
      )}
    </div>
  );
}
