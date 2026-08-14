"use client";

/**
 * 정보 패널 — 피그마 Panel/Info 대응 (280px: AI 분석 / 파일 정보 / 내 메모 / 보정 요청)
 * 위치: src/components/app/InfoPanel.tsx
 *
 * AI 분석은 연동 전 mock, 파일 정보는 일부 실데이터, 메모·보정 요청은 로컬 스토어에 저장.
 * 각 섹션은 헤더(⌄ + 제목) 클릭으로 접고 펼 수 있다.
 */

import { useState, type ReactNode } from "react";
import { InfoRow } from "@/components/ui/InfoRow";
import { Textarea } from "@/components/ui/Textarea";
import { DropdownIcon } from "@/components/icons";

type InfoItem = { label: string; value: string };

type InfoPanelProps = {
  analysis: InfoItem[];
  fileInfo: InfoItem[];
  /** 핸들러가 없으면 해당 섹션을 숨긴다 — 메모·보정 요청 입력은 부부 전용 (작가는 파일 정보만) */
  memo?: string;
  onMemoChange?: (value: string) => void;
  retouchRequest?: string;
  onRetouchRequestChange?: (value: string) => void;
};

function Divider() {
  return <div className="h-px w-full shrink-0 bg-stroke-neutral-muted" />;
}

/** 접히는 섹션 — 헤더(⌄ + 제목) 클릭으로 토글 */
function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 text-fg-neutral"
      >
        <DropdownIcon
          size={16}
          className={`transition-transform duration-fast ${open ? "" : "-rotate-90"}`}
        />
        <span className="type-utility-panel">{title}</span>
      </button>
      {open && children}
    </div>
  );
}

export function InfoPanel({
  analysis,
  fileInfo,
  memo,
  onMemoChange,
  retouchRequest,
  onRetouchRequestChange,
}: InfoPanelProps) {
  return (
    <aside className="flex w-70 shrink-0 flex-col gap-3 overflow-y-auto border-l border-stroke-neutral-muted bg-bg-layer-default p-5">
      <PanelSection title="AI 분석">
        <div className="flex w-full flex-col gap-1">
          {analysis.map((item) => (
            <InfoRow key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </PanelSection>

      <Divider />

      <PanelSection title="파일 정보">
        <div className="flex w-full flex-col gap-1">
          {fileInfo.map((item) => (
            <InfoRow key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </PanelSection>

      {onMemoChange && (
        <>
          <Divider />
          <PanelSection title="내 메모">
            <Textarea
              value={memo ?? ""}
              onChange={onMemoChange}
              placeholder="나만 보는 메모를 남겨보세요"
              aria-label="내 메모"
              className="h-25"
            />
          </PanelSection>
        </>
      )}

      {onRetouchRequestChange && (
        <>
          <Divider />
          <PanelSection title="보정 요청">
            <Textarea
              value={retouchRequest ?? ""}
              onChange={onRetouchRequestChange}
              placeholder="작가님께 전달할 보정 요청을 남겨보세요"
              aria-label="보정 요청"
              className="h-25"
            />
          </PanelSection>
        </>
      )}
    </aside>
  );
}
