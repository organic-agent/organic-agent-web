"use client";

/**
 * 펼침면 아래 떠 있는 도구 막대(이슈 168) — [고른 프레임 · 도구 설정] | [선택 · 안내선 · 프레임] | [펼침면 이동]
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumToolbar.tsx
 *
 * 디자이너 시안 Case 1 · 4(프로토타입 Toolbar)를 따른다. 앞부분이 있으면 펼침면 이동은 숨긴다(띠 · ← → 로 이동).
 * - 고른 프레임: 가로 · 세로(mm, 칸을 떠나거나 Enter로 반영) · 비율 고정 · (두 쪽에 걸침) · 사진이 있으면 위치 조정 · 빼기, 비었으면 삭제
 * - 위치 조정 중: 위치 조정(눌린 상태 — 다시 누르면 끝) · 빼기
 * 클라이언트(PR ③)는 도구 버튼 · 크기 칸 · 프레임 삭제 없이 위치 조정 · 비우기 · 펼침면 이동만(시안 2판 5번 장면).
 * 단축키 V 선택 · R 안내선 · F 프레임은 작업 화면이 받는다.
 */

import type { ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CropIcon, FrameToolIcon, GuideToolIcon, LinkIcon, SelectToolIcon, TrashIcon } from "@/components/icons";
import type { AlbumTool } from "./SpreadCanvas";

// 막대는 다크 모드에서 밝게 뒤집힌다(surface-default-darkness) — 글자는 토큰, 옅은 바탕은 글자색 기준 반투명
const BTN = "flex h-8 cursor-pointer items-center gap-1.5 rounded-(--radius-8) px-2.5 type-label-medium-s whitespace-nowrap hover:bg-current/10";

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-current opacity-20" />;
}

/** mm 칸 — 끌어서 값이 바뀌면 key가 바뀌어 다시 채워진다 */
function MmField({ label, name, value, onCommit }: { label: string; name: string; value: number; onCommit: (mm: number) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 type-content-xs text-contents-dark-bgd-default/80">
      {label}
      <input
        key={value}
        type="text"
        inputMode="numeric"
        aria-label={`${name}(mm)`}
        defaultValue={value}
        onBlur={(e) => {
          const v = Number(e.target.value.trim());
          if (Number.isFinite(v) && v > 0 && v !== value) onCommit(v);
          else e.target.value = String(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = String(value);
            e.currentTarget.blur();
          }
        }}
        className="h-7 w-13 rounded-(--radius-4) bg-current/12 text-center type-label-semibold-s text-contents-dark-bgd-default tabular-nums outline-none focus:ring-1 focus:ring-current/60"
      />
      mm
    </label>
  );
}

/** 안내선 도구 앞부분 — 가로선 · 세로선 · 전체 펼침면(놓는 순간 켜져 있으면 모든 펼침면에) */
export function GuideSettings({ dir, onDir, all, onAll }: { dir: "h" | "v"; onDir: (dir: "h" | "v") => void; all: boolean; onAll: (all: boolean) => void }) {
  return (
    <>
      {(
        [
          ["h", "가로선"],
          ["v", "세로선"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={dir === key}
          onClick={() => onDir(key)}
          className={`flex h-8 cursor-pointer items-center rounded-(--radius-8) px-3 type-label-medium-s whitespace-nowrap ${dir === key ? "bg-brand-accent-default text-white" : "bg-current/10 hover:bg-current/15"}`}
        >
          {label}
        </button>
      ))}
      <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 type-content-xs whitespace-nowrap">
        <input type="checkbox" checked={all} onChange={(e) => {
            onAll(e.target.checked);
            e.currentTarget.blur(); // V R F 단축키가 바로 듣게
          }} className="size-4 accent-(--brand-accent-default)" />
        전체 펼침면
      </label>
    </>
  );
}

export type ToolbarFrame = {
  w: number;
  h: number;
  crossing: boolean;
  hasPhoto: boolean;
};

export function AlbumToolbar({
  tool,
  onTool,
  frame,
  ratioLock,
  onRatioLock,
  onResize,
  onRemovePhoto,
  onDeleteFrame,
  cropping,
  onCrop,
  extra,
  showTools = true,
  frameSize = true,
  allowDelete = true,
  removeLabel = "빼기",
  pagerAlways = false,
  spread,
  spreadCount,
  onGo,
}: {
  tool: AlbumTool;
  onTool: (tool: AlbumTool) => void;
  /** 고른 프레임(선택 도구일 때만) */
  frame: ToolbarFrame | null;
  ratioLock: boolean;
  onRatioLock: (on: boolean) => void;
  onResize: (dim: "w" | "h", mm: number) => void;
  onRemovePhoto: () => void;
  onDeleteFrame: () => void;
  /** 위치 조정 중인지 · 위치 조정 시작/끝 */
  cropping: boolean;
  onCrop: () => void;
  /** 도구별 앞부분(안내선 설정 · 위치 조정 버튼) */
  extra?: ReactNode;
  /** false — 선택 · 안내선 · 프레임 도구 버튼을 두지 않는다(클라이언트) */
  showTools?: boolean;
  /** false — 고른 프레임의 가로 · 세로 칸 · 비율 고정을 두지 않는다 */
  frameSize?: boolean;
  /** false — 빈 프레임 삭제를 두지 않는다 */
  allowDelete?: boolean;
  /** 사진 빼기 버튼 이름 — 클라이언트는 "비우기" */
  removeLabel?: string;
  /** 앞부분이 있어도 펼침면 이동을 둔다(도구 버튼이 없어 자리가 남을 때) */
  pagerAlways?: boolean;
  spread: number;
  spreadCount: number;
  onGo: (spread: number) => void;
}) {
  const tools: { key: AlbumTool; label: string; icon: ReactNode }[] = [
    { key: "select", label: "선택 (V)", icon: <SelectToolIcon size={18} /> },
    { key: "guide", label: "안내선 (R)", icon: <GuideToolIcon size={18} /> },
    { key: "frame", label: "프레임 (F)", icon: <FrameToolIcon size={18} /> },
  ];
  const cropButton = (
    <button
      type="button"
      data-crop-keep
      aria-pressed={cropping}
      onClick={onCrop}
      className={cropping ? "flex h-8 cursor-pointer items-center gap-1.5 rounded-(--radius-8) bg-brand-accent-default px-2.5 type-label-medium-s whitespace-nowrap text-white" : BTN}
    >
      <CropIcon size={18} />
      위치 조정
    </button>
  );
  const removeButton = (
    <button type="button" onClick={onRemovePhoto} className={BTN}>
      <TrashIcon size={18} />
      {removeLabel}
    </button>
  );
  const ctx = cropping ? (
    <>
      {cropButton}
      {removeButton}
    </>
  ) : frame && !frameSize ? (
    frame.hasPhoto ? (
      <>
        {cropButton}
        {removeButton}
      </>
    ) : null
  ) : frame ? (
    <>
      <MmField label="W" name="가로" value={frame.w} onCommit={(mm) => onResize("w", mm)} />
      <button
        type="button"
        aria-label="비율 고정"
        aria-pressed={ratioLock}
        title="비율 고정"
        onClick={() => onRatioLock(!ratioLock)}
        className={`flex size-7 cursor-pointer items-center justify-center rounded-(--radius-4) ${ratioLock ? "bg-current/18" : "opacity-50 hover:bg-current/10"}`}
      >
        <LinkIcon size={16} />
      </button>
      <MmField label="H" name="세로" value={frame.h} onCommit={(mm) => onResize("h", mm)} />
      {frame.crossing && <span className="ml-1 rounded-(--radius-4) bg-current/12 px-2 py-0.5 type-label-semibold-xs whitespace-nowrap">두 쪽에 걸침</span>}
      <Sep />
      {extra}
      {frame.hasPhoto && cropButton}
      {frame.hasPhoto ? (
        removeButton
      ) : allowDelete ? (
        <button type="button" onClick={onDeleteFrame} className={BTN}>
          <TrashIcon size={18} />
          삭제
        </button>
      ) : null}
    </>
  ) : (
    extra
  );

  return (
    <div className="absolute bottom-4 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-1 rounded-(--radius-12) bg-surface-default-darkness p-1.5 text-contents-dark-bgd-default shadow-[0_6px_20px_rgba(0,0,0,.25)]">
      {ctx && <span className="flex items-center gap-1.5 pl-1.5">{ctx}</span>}
      {ctx && (showTools || pagerAlways) && <Sep />}
      {showTools &&
        tools.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-label={t.label}
          aria-pressed={tool === t.key}
          title={t.label}
          onClick={() => onTool(t.key)}
          className={`flex size-8 cursor-pointer items-center justify-center rounded-(--radius-8) ${tool === t.key ? "bg-brand-accent-default text-white" : "hover:bg-current/10"}`}
        >
          {t.icon}
        </button>
      ))}
      {(!ctx || pagerAlways) && (
        <>
          {showTools && <Sep />}
          <button
            type="button"
            aria-label="이전 펼침면"
            disabled={spread === 0}
            onClick={() => onGo(spread - 1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-(--radius-8) hover:bg-current/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <span className="px-1 type-label-semibold-s tabular-nums">
            {spread + 1}
            <span className="font-normal opacity-60"> / {spreadCount}</span>
          </span>
          <button
            type="button"
            aria-label="다음 펼침면"
            disabled={spread === spreadCount - 1}
            onClick={() => onGo(spread + 1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-(--radius-8) hover:bg-current/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRightIcon size={18} />
          </button>
        </>
      )}
    </div>
  );
}
