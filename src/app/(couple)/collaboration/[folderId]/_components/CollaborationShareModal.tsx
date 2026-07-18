import { ModalFrame } from "@/components/ui/ModalFrame";

type CopyState = "idle" | "copied" | "failed";

type Props = {
  shareUrl: string;
  shareCode: string;
  expiresIn: string;
  copyState: CopyState;
  onCopy: () => void;
  onClose: () => void;
};

export function CollaborationShareModal({
  shareUrl,
  shareCode,
  expiresIn,
  copyState,
  onCopy,
  onClose,
}: Props) {
  return (
    <ModalFrame
      onClose={onClose}
      title="협업 링크"
      desc="이 링크를 가족·지인에게 보내세요."
      maxWidthClassName="max-w-[520px]"
    >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-11 px-3.5 rounded-md border border-line bg-paper-deep flex items-center font-mono text-[12px] text-ink-2 truncate">
            {shareUrl}
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
          <p className="text-[12px] text-danger mb-3">
            복사에 실패했어요. 링크를 직접 선택해서 복사해주세요.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="rounded-lg border border-line bg-paper-deep px-4 py-3">
            <p className="text-[11px] font-medium text-ink-3 mb-1">공유 코드</p>
            <p className="font-mono text-[22px] font-semibold tracking-[0.18em] text-ink">
              {shareCode}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-paper-deep px-4 py-3">
            <p className="text-[11px] font-medium text-ink-3 mb-1">링크 만료</p>
            <p className="text-[15px] font-semibold text-accent-press">
              {expiresIn}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] transition-colors"
          >
            카카오톡으로 보내기
          </button>
        </div>
    </ModalFrame>
  );
}
