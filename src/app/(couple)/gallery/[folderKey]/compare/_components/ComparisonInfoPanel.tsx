import type { CompareTag, Photo, PhotoViewHistory } from "@/lib/couple";

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  photo: Photo;
  photoLabel: "A" | "B";
  currentDecision?: CompareTag;
  onDecisionChange: (tag: CompareTag) => void;
  isSelected: boolean;
  selectedCount: number;
  selectedTarget: number;
  onToggleSelected: () => void;
  selectionNotice: string;
  memo: string;
  onMemoChange: (value: string) => void;
  retouchRequest: string;
  onRetouchRequestChange: (value: string) => void;
  viewHistory?: PhotoViewHistory;
  submitted: boolean;
};

const DECISION_LABEL: Record<CompareTag, string> = {
  good: "후보",
  hold: "고민중",
  remove: "제외",
};

const DECISION_OPTIONS: Array<{
  tag: CompareTag;
  label: string;
  activeClassName: string;
}> = [
  {
    tag: "good",
    label: "후보",
    activeClassName: "border-select bg-select text-white",
  },
  {
    tag: "hold",
    label: "고민중",
    activeClassName: "border-hold bg-hold text-white",
  },
  {
    tag: "remove",
    label: "제외",
    activeClassName: "border-ink bg-ink text-on-ink",
  },
];

function formatLastViewedAt(value?: string) {
  if (!value) return "아직 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ComparisonInfoPanel({
  collapsed,
  onToggleCollapsed,
  photo,
  photoLabel,
  currentDecision,
  onDecisionChange,
  isSelected,
  selectedCount,
  selectedTarget,
  onToggleSelected,
  selectionNotice,
  memo,
  onMemoChange,
  retouchRequest,
  onRetouchRequestChange,
  viewHistory,
  submitted,
}: Props) {
  return (
    <aside
      className={`${collapsed ? "w-[52px]" : "w-[300px]"} shrink-0 border-l border-line flex flex-col bg-white transition-[width] duration-200 ease-out`}
    >
      <div
        className={`h-16 shrink-0 border-b border-line flex items-center ${
          collapsed ? "justify-center" : "justify-between px-5"
        }`}
      >
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="text-[15px] font-medium text-ink">사진 정보</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {photoLabel} · #{String(photo.id).padStart(3, "0")}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="w-8 h-8 rounded-md grid place-items-center text-ink-3 hover:bg-paper-deep hover:text-ink transition-colors shrink-0"
          aria-label={collapsed ? "정보 패널 펼치기" : "정보 패널 접기"}
          title={collapsed ? "펼치기" : "접기"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
            {collapsed ? (
              <path d="M10 9l-3 3 3 3" />
            ) : (
              <path d="M8 9l3 3-3 3" />
            )}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          <section className="rounded-lg border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="w-7 h-7 rounded-full bg-ink text-on-ink text-[12px] font-semibold grid place-items-center">
                {photoLabel}
              </span>
              <span className="font-mono text-[11px] text-ink-3">
                #{String(photo.id).padStart(3, "0")}
              </span>
            </div>
            <p className="mt-3 text-[14px] font-medium text-ink">
              {photo.scene} · {photo.person}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-pill border border-line bg-white px-2 py-1 text-[10px] text-ink-2">
                {currentDecision ? DECISION_LABEL[currentDecision] : "미정"}
              </span>
              {isSelected && (
                <span className="rounded-pill bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent-press">
                  선택 앨범
                </span>
              )}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium text-ink-2">선호도 태그</p>
              <span className="text-[10px] text-ink-3">
                다시 누르면 미정
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DECISION_OPTIONS.map((option) => {
                const active = currentDecision === option.tag;
                return (
                  <button
                    key={option.tag}
                    type="button"
                    onClick={() => onDecisionChange(option.tag)}
                    disabled={submitted}
                    aria-pressed={active}
                    className={`h-9 rounded-md border text-[12px] font-medium transition-colors ${
                      active
                        ? option.activeClassName
                        : "border-line bg-white text-ink-2 hover:border-ink-3 hover:text-ink"
                    } disabled:pointer-events-none disabled:opacity-45`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium text-ink-2">선택 앨범</p>
              <span className="text-[11px] text-ink-3">
                {selectedCount} / {selectedTarget}
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleSelected}
              disabled={submitted}
              className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-accent bg-accent-soft text-accent-press"
                  : "border-line bg-white text-ink hover:border-ink-3"
              } disabled:pointer-events-none disabled:opacity-45`}
            >
              <span className="block text-[14px] font-medium">
                {isSelected ? "앨범에서 빼기" : "앨범에 담기"}
              </span>
              <span className="mt-1 block text-[11px] text-current/65">
                {isSelected
                  ? "이 사진은 최종 선택 앨범에 담겨 있어요."
                  : currentDecision === "remove"
                    ? "담으면 후보로 변경돼요."
                    : currentDecision
                      ? "최종 선택본에 포함할 사진으로 관리해요."
                      : "담으면 후보로 분류돼요."}
              </span>
            </button>
            {selectionNotice && (
              <p className="mt-2 text-[12px] text-danger">
                {selectionNotice}
              </p>
            )}
          </section>

          <section>
            <label className="block text-[12px] font-medium text-ink-2 mb-2">
              메모
            </label>
            <textarea
              value={memo}
              onChange={(event) => onMemoChange(event.target.value)}
              disabled={submitted}
              rows={5}
              placeholder="사진을 비교하며 떠오른 내용을 적어보세요."
              className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none resize-none focus:border-ink-3 disabled:opacity-50"
            />
          </section>

          <section>
            <label className="block text-[12px] font-medium text-ink-2 mb-2">
              보정 요청
            </label>
            <textarea
              value={retouchRequest}
              onChange={(event) => onRetouchRequestChange(event.target.value)}
              disabled={submitted}
              rows={5}
              placeholder="보정이 필요한 내용을 적어보세요."
              className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none resize-none focus:border-ink-3 disabled:opacity-50"
            />
          </section>

          <section className="rounded-md border border-line bg-white px-4 py-3">
            <p className="text-[12px] font-medium text-ink-2 mb-3">조회 기록</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-3">열어본 횟수</span>
                <span className="font-medium text-ink">
                  {viewHistory?.count ?? 0}회
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-3">마지막 확인</span>
                <span className="font-medium text-ink">
                  {formatLastViewedAt(viewHistory?.lastViewedAt)}
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
