/**
 * 부부 — 갤러리 폴더 상세 우측 정보 패널
 * 위치: src/app/(couple)/gallery/[folderKey]/_components/GalleryInfoPanel.tsx
 *
 * 현재 사진의 셀렉 판단, 선택 앨범, 협업 셀렉, 메모/보정 요청,
 * 조회 기록과 폴더 진행 요약을 표시한다.
 */

import type { MouseEvent } from "react";
import type { CompareTag, Photo, PhotoViewHistory } from "@/lib/couple";

type DecisionOption = {
  tag: CompareTag;
  label: string;
  description: string;
  className: string;
  activeClassName: string;
};

type ProgressItem = {
  label: string;
  value: number;
  className: string;
};

type GalleryInfoPanelProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  photo?: Photo;
  submitted: boolean;
  currentDecision?: CompareTag;
  onDecisionChange: (tag: CompareTag) => void;
  isSelected: boolean;
  selectedCount: number;
  selectedTarget: number;
  onToggleSelected: () => void;
  selectionNotice: string;
  onOpenCollaborationModal: () => void;
  collaborationNotice: string;
  currentMemo: string;
  onMemoChange: (value: string) => void;
  currentRetouchRequest: string;
  onRetouchRequestChange: (value: string) => void;
  currentViewHistory?: PhotoViewHistory;
  summaryPanelHeight: number;
  onStartSummaryResize: (event: MouseEvent<HTMLButtonElement>) => void;
  onResetSummaryPanelHeight: () => void;
  reviewedCount: number;
  total: number;
  progressItems: ProgressItem[];
  folderSelectedCount: number;
};

const DECISION_OPTIONS: DecisionOption[] = [
  {
    tag: "good",
    label: "후보",
    description: "최종 후보로 남겨둘 사진",
    className: "border-select-soft bg-select-soft/60 text-select",
    activeClassName: "border-select bg-select text-white shadow-sm",
  },
  {
    tag: "hold",
    label: "고민중",
    description: "다시 보고 결정할 사진",
    className: "border-hold-soft bg-hold-soft/70 text-hold",
    activeClassName: "border-hold bg-hold text-white shadow-sm",
  },
  {
    tag: "remove",
    label: "제외",
    description: "최종 후보에서 제외할 사진",
    className: "border-line bg-white text-ink-2",
    activeClassName: "border-ink bg-ink text-on-ink shadow-sm",
  },
];

function decisionDotClass(tag: CompareTag) {
  if (tag === "good") return "bg-select";
  if (tag === "hold") return "bg-hold";
  return "bg-ink";
}

function formatLastViewedAt(value?: string) {
  if (!value) return "아직 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function GalleryInfoPanel({
  collapsed,
  onToggleCollapsed,
  photo,
  submitted,
  currentDecision,
  onDecisionChange,
  isSelected,
  selectedCount,
  selectedTarget,
  onToggleSelected,
  selectionNotice,
  onOpenCollaborationModal,
  collaborationNotice,
  currentMemo,
  onMemoChange,
  currentRetouchRequest,
  onRetouchRequestChange,
  currentViewHistory,
  summaryPanelHeight,
  onStartSummaryResize,
  onResetSummaryPanelHeight,
  reviewedCount,
  total,
  progressItems,
  folderSelectedCount,
}: GalleryInfoPanelProps) {
  const selectedPct = Math.min(
    100,
    Math.round((selectedCount / selectedTarget) * 100),
  );

  return (
    <aside
      className={`${collapsed ? "w-[52px]" : "w-[300px]"} shrink-0 border-l border-line flex flex-col bg-white transition-[width] duration-200 ease-out`}
    >
      <div
        className={`h-16 shrink-0 border-b border-line flex items-center ${collapsed ? "justify-center px-0" : "justify-between px-5"}`}
      >
        {!collapsed && (
          <h2 className="text-[15px] font-medium text-ink">사진 정보</h2>
        )}
        <button
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
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
            <DecisionSection
              photo={photo}
              submitted={submitted}
              currentDecision={currentDecision}
              onDecisionChange={onDecisionChange}
            />

            <SelectedAlbumSection
              submitted={submitted}
              photo={photo}
              isSelected={isSelected}
              selectedCount={selectedCount}
              selectedTarget={selectedTarget}
              selectionNotice={selectionNotice}
              onToggleSelected={onToggleSelected}
            />

            <CollaborationSection
              photo={photo}
              notice={collaborationNotice}
              onOpen={onOpenCollaborationModal}
            />

            <section className="space-y-2">
              <TextDetails
                title="내 메모"
                value={currentMemo}
                onChange={onMemoChange}
                disabled={submitted || !photo}
                placeholder="이 사진을 보며 떠오른 생각을 적어두세요."
                submittedMessage="작가에게 전달 완료되어 메모를 수정할 수 없어요."
              />

              <TextDetails
                title="보정 요청"
                value={currentRetouchRequest}
                onChange={onRetouchRequestChange}
                disabled={submitted || !photo}
                placeholder="피부톤, 배경 정리, 드레스 주름 등 요청하고 싶은 내용을 적어주세요."
                submittedMessage="작가에게 전달 완료되어 보정 요청을 수정할 수 없어요."
              />

              <ViewHistoryDetails history={currentViewHistory} />
            </section>
          </div>

          <button
            type="button"
            onMouseDown={onStartSummaryResize}
            onDoubleClick={onResetSummaryPanelHeight}
            className="group h-3 shrink-0 border-y border-line bg-paper hover:bg-paper-deep cursor-row-resize grid place-items-center transition-colors"
            aria-label="진행 요약 영역 높이 조절"
            title="드래그해서 높이 조절 · 더블클릭으로 초기화"
          >
            <span className="w-10 h-1 rounded-pill bg-line-strong group-hover:bg-ink-3 transition-colors" />
          </button>

          <ProgressSummary
            height={summaryPanelHeight}
            reviewedCount={reviewedCount}
            total={total}
            progressItems={progressItems}
            folderSelectedCount={folderSelectedCount}
            selectedCount={selectedCount}
            selectedTarget={selectedTarget}
            selectedPct={selectedPct}
          />
        </div>
      )}
    </aside>
  );
}

function DecisionSection({
  photo,
  submitted,
  currentDecision,
  onDecisionChange,
}: {
  photo?: Photo;
  submitted: boolean;
  currentDecision?: CompareTag;
  onDecisionChange: (tag: CompareTag) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium text-ink-2">셀렉 판단</p>
        {photo && (
          <span className="font-mono text-[11px] text-ink-3">
            #{String(photo.id).padStart(3, "0")}
          </span>
        )}
      </div>
      {photo ? (
        <div className="space-y-2">
          {DECISION_OPTIONS.map((option) => {
            const active = currentDecision === option.tag;
            return (
              <button
                key={option.tag}
                type="button"
                onClick={() => onDecisionChange(option.tag)}
                disabled={submitted}
                className={`w-full min-h-14 rounded-md border px-3.5 py-3 text-left transition-all ${
                  active ? option.activeClassName : option.className
                } disabled:opacity-45 disabled:pointer-events-none`}
                aria-pressed={active}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold">
                    {option.label}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      active ? "bg-current" : decisionDotClass(option.tag)
                    }`}
                  />
                </span>
                <span
                  className={`block mt-1 text-[11px] leading-snug ${
                    active ? "text-white/80" : "text-ink-3"
                  }`}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[13px] text-ink-3">
          현재 필터에 해당하는 사진이 없어요.
        </p>
      )}
    </section>
  );
}

function SelectedAlbumSection({
  submitted,
  photo,
  isSelected,
  selectedCount,
  selectedTarget,
  selectionNotice,
  onToggleSelected,
}: {
  submitted: boolean;
  photo?: Photo;
  isSelected: boolean;
  selectedCount: number;
  selectedTarget: number;
  selectionNotice: string;
  onToggleSelected: () => void;
}) {
  return (
    <section>
      <p className="text-[12px] font-medium text-ink-2 mb-2">선택 앨범</p>
      {submitted && (
        <p className="text-[11px] text-ink-3 mb-2">
          작가에게 전달 완료되어 선택을 수정할 수 없어요.
        </p>
      )}
      <button
        type="button"
        onClick={onToggleSelected}
        disabled={submitted || !photo}
        className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${
          isSelected
            ? "border-accent bg-accent-soft text-accent-press"
            : "border-line bg-white text-ink hover:border-ink-3"
        } disabled:opacity-45 disabled:pointer-events-none`}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-[14px] font-medium">
            {isSelected ? "앨범에서 빼기" : "앨범에 담기"}
          </span>
          <span className="text-[12px] text-current/70">
            {selectedCount} / {selectedTarget}
          </span>
        </span>
        <span className="block mt-1 text-[11px] text-current/65">
          {isSelected
            ? "이 사진은 최종 선택 앨범에 담겨 있어요."
            : "후보 판단과 별도로 최종 앨범에 포함해요."}
        </span>
      </button>
      {selectionNotice && (
        <p className="mt-2 text-[12px] text-danger">{selectionNotice}</p>
      )}
    </section>
  );
}

function CollaborationSection({
  photo,
  notice,
  onOpen,
}: {
  photo?: Photo;
  notice: string;
  onOpen: () => void;
}) {
  return (
    <section>
      <p className="text-[12px] font-medium text-ink-2 mb-2">협업 셀렉</p>
      <button
        type="button"
        onClick={onOpen}
        disabled={!photo}
        className="w-full rounded-md border border-line bg-white px-4 py-3 text-left text-ink hover:border-ink-3 hover:bg-paper transition-colors disabled:opacity-45 disabled:pointer-events-none"
      >
        <span className="block text-[14px] font-medium">협업 폴더에 담기</span>
        <span className="block mt-1 text-[11px] text-ink-3">
          현재 사진을 가족·지인에게 의견 받을 폴더에 추가해요.
        </span>
      </button>
      {notice && <p className="mt-2 text-[12px] text-accent-press">{notice}</p>}
    </section>
  );
}

function TextDetails({
  title,
  value,
  onChange,
  disabled,
  placeholder,
  submittedMessage,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  submittedMessage: string;
}) {
  return (
    <details className="group rounded-md border border-line bg-white open:bg-paper">
      <summary className="h-11 px-4 flex items-center justify-between cursor-pointer list-none text-[13px] font-medium text-ink">
        <span>{title}</span>
        <span className="text-[11px] text-ink-3">
          {value ? "작성됨" : "비어 있음"}
        </span>
      </summary>
      <div className="px-4 pb-4">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={4}
          placeholder={placeholder}
          className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none resize-none focus:border-ink-3 disabled:opacity-50 disabled:pointer-events-none"
        />
        {disabled && (
          <p className="mt-2 text-[11px] text-ink-3">{submittedMessage}</p>
        )}
      </div>
    </details>
  );
}

function ViewHistoryDetails({
  history,
}: {
  history?: PhotoViewHistory;
}) {
  return (
    <details className="group rounded-md border border-line bg-white open:bg-paper">
      <summary className="h-11 px-4 flex items-center justify-between cursor-pointer list-none text-[13px] font-medium text-ink">
        <span>조회 기록</span>
        <span className="text-[11px] text-ink-3">{history?.count ?? 0}회</span>
      </summary>
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-3">내가 본 횟수</span>
          <span className="text-[13px] font-medium text-ink">
            {history?.count ?? 0}회
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-3">마지막 확인</span>
          <span className="text-[13px] font-medium text-ink">
            {formatLastViewedAt(history?.lastViewedAt)}
          </span>
        </div>
      </div>
    </details>
  );
}

function ProgressSummary({
  height,
  reviewedCount,
  total,
  progressItems,
  folderSelectedCount,
  selectedCount,
  selectedTarget,
  selectedPct,
}: {
  height: number;
  reviewedCount: number;
  total: number;
  progressItems: ProgressItem[];
  folderSelectedCount: number;
  selectedCount: number;
  selectedTarget: number;
  selectedPct: number;
}) {
  return (
    <div
      className="shrink-0 p-5 space-y-5 bg-white overflow-y-auto"
      style={{ height }}
    >
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[12px] font-medium text-ink-2">폴더 진행</p>
          <span className="text-[12px] text-ink-3">
            {reviewedCount} / {total} 확인
          </span>
        </div>
        <div className="h-2 rounded-pill bg-paper-deep overflow-hidden flex">
          {progressItems.map((item) => (
            <div
              key={item.label}
              className={`h-full ${item.className}`}
              style={{
                width: total > 0 ? `${(item.value / total) * 100}%` : "0%",
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {progressItems.map((item) => (
            <div key={item.label} className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${item.className}`} />
                <span className="text-[11px] text-ink-3 truncate">
                  {item.label}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] font-medium text-ink">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[12px] font-medium text-ink-2">최종 선택</p>
          <span className="text-[12px] text-ink-3">
            이 폴더 {folderSelectedCount}장
          </span>
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-display-en text-[28px] font-semibold leading-none text-ink">
            {selectedCount}
          </span>
          <span className="text-[13px] text-ink-3">/ {selectedTarget}장</span>
        </div>
        <div className="h-2 rounded-pill bg-paper-deep overflow-hidden">
          <div
            className="h-full rounded-pill bg-accent transition-all"
            style={{ width: `${selectedPct}%` }}
          />
        </div>
      </section>
    </div>
  );
}
