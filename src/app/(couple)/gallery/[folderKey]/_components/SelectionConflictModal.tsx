export type SelectionConflictKind =
  | "exclude-selected"
  | "select-excluded";

type Props = {
  kind: SelectionConflictKind;
  onCancel: () => void;
  onConfirm: () => void;
};

const CONTENT: Record<
  SelectionConflictKind,
  { title: string; description: string; confirmLabel: string }
> = {
  "exclude-selected": {
    title: "선택 앨범에서도 뺄까요?",
    description:
      "이 사진을 제외로 분류하면 선택 앨범에서도 함께 제거돼요.",
    confirmLabel: "제외하고 빼기",
  },
  "select-excluded": {
    title: "후보로 바꾸고 담을까요?",
    description:
      "제외한 사진은 선택 앨범에 담을 수 없어요. 후보로 변경한 뒤 선택 앨범에 담을게요.",
    confirmLabel: "후보로 바꾸고 담기",
  },
};

export function SelectionConflictModal({ kind, onCancel, onConfirm }: Props) {
  const content = CONTENT[kind];

  return (
    <div
      className="fixed inset-0 z-[160] grid place-items-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selection-conflict-title"
      aria-describedby="selection-conflict-description"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="확인 창 닫기"
      />
      <div className="relative z-10 w-full max-w-[380px] rounded-2xl bg-white p-7 shadow-xl">
        <h2
          id="selection-conflict-title"
          className="font-display-ko text-[20px] font-medium text-ink"
        >
          {content.title}
        </h2>
        <p
          id="selection-conflict-description"
          className="mt-2 text-[13px] leading-relaxed text-ink-2"
        >
          {content.description}
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-pill border border-line text-sm font-medium text-ink-2 transition-colors hover:bg-paper-deep"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 flex-1 rounded-pill bg-ink text-sm font-medium text-on-ink transition-colors hover:bg-[#333]"
          >
            {content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
