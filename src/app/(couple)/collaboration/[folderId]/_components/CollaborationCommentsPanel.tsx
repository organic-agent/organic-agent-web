import type { CollabComment, CollabPhoto } from "@/lib/couple";

type Props = {
  folderName: string;
  activePhoto: CollabPhoto | null;
  visibleComments: CollabComment[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export function CollaborationCommentsPanel({
  folderName,
  activePhoto,
  visibleComments,
  draft,
  onDraftChange,
  onSubmit,
}: Props) {
  return (
    <aside className="xl:sticky xl:top-24 rounded-lg border border-line bg-white p-5">
      <div className="mb-5">
        <p className="text-[12px] font-medium text-ink-3 mb-1">
          {activePhoto ? "선택한 사진 의견" : "전체 폴더 의견"}
        </p>
        <h2 className="text-[16px] font-medium text-ink">
          {activePhoto
            ? `#${String(activePhoto.id).padStart(3, "0")}`
            : folderName}
        </h2>
      </div>

      <div className="space-y-4 mb-5 max-h-[420px] overflow-y-auto pr-1">
        {visibleComments.length === 0 && (
          <p className="text-[13px] text-ink-3">
            아직 의견이 없어요. 먼저 의견을 남겨보세요.
          </p>
        )}
        {visibleComments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full bg-paper-deep grid place-items-center text-[12px] text-ink-2 shrink-0">
              {comment.avatar}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-ink">
                  {comment.author}
                </span>
                {comment.photoId && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-pill bg-paper-deep text-ink-3 font-mono">
                    #{String(comment.photoId).padStart(3, "0")}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-ink-2 mt-0.5">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-pill border border-line p-1.5 pl-4 focus-within:border-ink-3 transition-colors">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onSubmit()}
          placeholder={activePhoto ? "이 사진에 의견 남기기" : "전체 의견 남기기"}
          className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-ink-3 min-w-0"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="w-8 h-8 rounded-full bg-ink text-on-ink grid place-items-center shrink-0 hover:bg-[#333] transition-colors"
          aria-label="의견 남기기"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
