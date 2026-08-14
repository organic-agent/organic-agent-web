import { photoUrl, type CompareTag, type Photo } from "@/lib/couple";

type Props = {
  label: "A" | "B";
  photo: Photo;
  active: boolean;
  currentDecision?: CompareTag;
  isSelected: boolean;
  onActivate: () => void;
};

const DECISION_BADGE: Record<
  CompareTag,
  { label: string; className: string }
> = {
  good: {
    label: "후보",
    className: "border-select-soft bg-select-soft/60 text-select",
  },
  hold: {
    label: "고민중",
    className: "border-hold-soft bg-hold-soft/70 text-hold",
  },
  remove: {
    label: "제외",
    className: "border-line bg-paper-deep text-ink-2",
  },
};

export function ComparisonPhotoCard({
  label,
  photo,
  active,
  currentDecision,
  isSelected,
  onActivate,
}: Props) {
  const decision = currentDecision
    ? DECISION_BADGE[currentDecision]
    : undefined;

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-pressed={active}
      aria-label={`${label} 사진을 다음 비교의 기준으로 선택`}
      className={`min-w-[300px] h-full rounded-xl border bg-white overflow-hidden flex flex-col text-left transition-all ${
        active ? "border-ink ring-2 ring-ink/10 shadow-md" : "border-line"
      }`}
    >
      <div className="h-11 shrink-0 px-4 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full text-[11px] font-semibold grid place-items-center ${
              active ? "bg-ink text-on-ink" : "bg-paper-deep text-ink-2"
            }`}
          >
            {label}
          </span>
          <span className="text-[12px] text-ink-3">
            {active ? "정보 확인 중" : "클릭해서 정보 보기"}
          </span>
        </div>
        <span className="font-mono text-[11px] text-ink-3">
          #{String(photo.id).padStart(3, "0")}
        </span>
      </div>

      <div className="flex-1 min-h-0 bg-paper-deep p-3 grid place-items-center overflow-hidden">
        <img
          src={photoUrl(photo.photoId, 1400)}
          alt={`${label} 비교 사진 ${photo.id}`}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="shrink-0 border-t border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={`rounded-pill border px-2.5 py-1 text-[11px] font-medium ${
                decision
                  ? decision.className
                  : "border-line bg-white text-ink-3"
              }`}
            >
              {decision?.label ?? "미정"}
            </span>
            {isSelected && (
              <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-press">
                선택 앨범
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-ink-3">
            {active ? "비교 기준" : "기준으로 선택"}
          </span>
        </div>
      </div>
    </button>
  );
}
