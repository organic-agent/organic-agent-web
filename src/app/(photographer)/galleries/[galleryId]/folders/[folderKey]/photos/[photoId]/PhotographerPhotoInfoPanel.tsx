"use client";

import { COMPARE_TAG_LABEL, type CompareTag, type Photo } from "@/lib/couple";
import {
  getPhotoWorkflow,
  RETOUCH_STATUS_LABEL,
  updatePhotoWorkflow,
  usePhotographerPhotoWorkflows,
  type RetouchStatus,
} from "@/lib/photographerPhotoWorkflow";

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  photo: Photo;
  folderLabel: string;
  decision?: CompareTag;
  selected: boolean;
  memo: string;
  retouchRequest: string;
};

const STATUS_OPTIONS: { value: RetouchStatus; label: string }[] = [
  { value: "waiting", label: RETOUCH_STATUS_LABEL.waiting },
  { value: "working", label: RETOUCH_STATUS_LABEL.working },
  { value: "done", label: RETOUCH_STATUS_LABEL.done },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line px-5 py-5 last:border-b-0">
      <h2 className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PhotographerPhotoInfoPanel(props: Props) {
  const workflows = usePhotographerPhotoWorkflows();
  const workflow = getPhotoWorkflow(workflows, props.photo.id);
  const fileName = `DSC_${String(props.photo.id).padStart(4, "0")}.ARW`;

  return (
    <aside
      className={`${props.collapsed ? "w-[52px]" : "w-[320px]"} h-full shrink-0 border-l border-line bg-white flex flex-col overflow-hidden transition-[width] duration-200 ease-out`}
    >
      <div
        className={`h-16 shrink-0 border-b border-line flex items-center ${
          props.collapsed ? "justify-center px-0" : "justify-between px-5"
        }`}
      >
        {!props.collapsed && (
          <h2 className="text-[15px] font-medium text-ink">사진 정보</h2>
        )}
        <button
          type="button"
          onClick={props.onToggleCollapsed}
          className="w-8 h-8 rounded-md grid place-items-center text-ink-3 hover:bg-paper-deep hover:text-ink transition-colors shrink-0"
          aria-label={props.collapsed ? "정보 패널 펼치기" : "정보 패널 접기"}
          title={props.collapsed ? "펼치기" : "접기"}
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
            {props.collapsed ? (
              <path d="M10 9l-3 3 3 3" />
            ) : (
              <path d="M8 9l3 3-3 3" />
            )}
          </svg>
        </button>
      </div>

      {!props.collapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* 사진 번호 + 추천컷 지정 */}
          <section className="border-b border-line px-5 py-5">
            <p className="text-[11px] text-ink-3">작가용 사진 정보</p>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <h1 className="font-mono text-[17px] font-semibold text-ink">
                #{String(props.photo.id).padStart(3, "0")}
              </h1>
              <button
                type="button"
                onClick={() =>
                  updatePhotoWorkflow(props.photo.id, {
                    recommended: !workflow.recommended,
                  })
                }
                className={`h-8 px-3 rounded-pill text-[11px] font-medium border transition-colors ${
                  workflow.recommended
                    ? "bg-ink text-on-ink border-ink"
                    : "border-line text-ink-2 hover:border-ink-3"
                }`}
              >
                {workflow.recommended ? "★ 추천컷" : "☆ 추천컷 지정"}
              </button>
            </div>
          </section>

          {/* ① 이 사진, 작업 대상인가? */}
          <Section title="작업 대상 여부">
            <div className={`rounded-lg p-3.5 ${props.selected ? "bg-ink" : "bg-paper-deep"}`}>
              <p
                className={`text-[14px] font-semibold ${
                  props.selected ? "text-on-ink" : "text-ink-3"
                }`}
              >
                {props.selected ? "부부 최종 선택 · 작업 대상" : "최종 선택 미포함"}
              </p>
              <p
                className={`mt-1 text-[11px] ${
                  props.selected ? "text-on-ink-2" : "text-ink-3"
                }`}
              >
                부부 판단 · {props.decision ? COMPARE_TAG_LABEL[props.decision] : "미정"}
              </p>
            </div>
          </Section>

          {/* ② 뭘 고쳐달라는가? */}
          <Section title="보정 요청 · 부부 메모">
            <div className="space-y-3 text-[12px]">
              <div
                className={`rounded-lg p-3 ${
                  props.retouchRequest ? "bg-hold-soft" : "bg-paper-deep"
                }`}
              >
                <p className="text-[10px] text-ink-3 mb-1">보정 요청</p>
                <p className="text-ink-2 leading-relaxed">
                  {props.retouchRequest || "등록된 요청이 없어요."}
                </p>
              </div>
              <div className="rounded-lg bg-paper-deep p-3">
                <p className="text-[10px] text-ink-3 mb-1">부부 메모</p>
                <p className="text-ink-2 leading-relaxed">
                  {props.memo || "등록된 메모가 없어요."}
                </p>
              </div>
            </div>
          </Section>

          {/* ③ 내 작업 진행 */}
          <Section title="작업 관리">
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    updatePhotoWorkflow(props.photo.id, { status: option.value })
                  }
                  className={`h-9 rounded-md text-[11px] font-medium border transition-colors ${
                    workflow.status === option.value
                      ? "bg-ink text-on-ink border-ink"
                      : "border-line text-ink-2 hover:border-ink-3"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="block text-[11px] text-ink-3 mb-1.5">작가 내부 메모</span>
              <textarea
                value={workflow.note}
                onChange={(event) =>
                  updatePhotoWorkflow(props.photo.id, { note: event.target.value })
                }
                rows={4}
                placeholder="고객에게 보이지 않는 작업 메모를 남겨보세요."
                className="w-full rounded-lg border border-line px-3 py-2.5 text-[12px] text-ink outline-none resize-none focus:border-ink-3"
              />
            </label>
          </Section>

          {/* 촬영 · 파일 정보 (접기) */}
          <details className="group border-b border-line last:border-b-0">
            <summary className="px-5 py-5 flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <h2 className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
                촬영 · 파일 정보
              </h2>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-ink-3 transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="px-5 pb-5">
              <dl className="grid grid-cols-[82px_1fr] gap-y-2 text-[12px]">
                <dt className="text-ink-3">파일명</dt>
                <dd className="font-mono text-ink text-right">{fileName}</dd>
                <dt className="text-ink-3">촬영 일시</dt>
                <dd className="text-ink text-right">2026.05.17 · 14:23</dd>
                <dt className="text-ink-3">카메라</dt>
                <dd className="text-ink text-right">Sony α7 IV</dd>
                <dt className="text-ink-3">렌즈</dt>
                <dd className="text-ink text-right">FE 50mm F1.2</dd>
                <dt className="text-ink-3">노출</dt>
                <dd className="text-ink text-right">1/200s · f/2.0 · ISO 400</dd>
                <dt className="text-ink-3">해상도</dt>
                <dd className="text-ink text-right">6000 × 4000</dd>
                <dt className="text-ink-3">폴더</dt>
                <dd className="text-ink text-right">{props.folderLabel}</dd>
                <dt className="text-ink-3">장면 · 인물</dt>
                <dd className="text-ink text-right">
                  {props.photo.scene} · {props.photo.person}
                </dd>
              </dl>
            </div>
          </details>
        </div>
      )}
    </aside>
  );
}
