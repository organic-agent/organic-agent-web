"use client";

/**
 * 랜딩 흐름 02 컨셉 분류 — "AI가 폴더로 나누는 중" 화면에서 폴더가 하나씩 생기고, 첫 폴더로 들어가 정리된 사진을 본다
 * 위치: src/app/_components/shots/FoldersShot.tsx
 *
 * 부품은 실제 컨셉 분류 화면 그대로 — FolderColumn(폴더 열) · ShellMainHeader(제목 · 줌 · 정렬) · PhotoGrid(그리드) ·
 * ShellBottomBar(하단 바) · ProgressBar(AI 진행). 고정 데이터만 넣었다. 편집 핸들러를 안 주어 폴더 열은 읽기 전용.
 * 타임라인(ShotFrame.onVisible이 켬): analyzing(폴더 열 "만드는 중…" 안내 · 제목 옆 "폴더 만드는 중…" 칩 · 하단 막대) →
 * 2.2초부터 세부 폴더가 0.4초마다 하나씩(전신 → 상반신 → 클로즈업 → 풍경) → 4.2초에 전신 폴더로 들어가 그 사진만 보인다.
 */

import { useState, type ReactNode } from "react";
import { FolderColumn, type FolderSelection } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/FolderColumn";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { ProgressBar } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/UploadProgress";
import { PhotoIcon, SparkleIcon, UploadIcon } from "@/components/icons";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import { SAMPLE_FOLDERS, landingPhotos, sampleIdsOf } from "./samplePhotos";
import { ShotFrame } from "./ShotFrame";
import { ShotSidebar, ShotTopbar } from "./ShotChrome";
import { useShotTimeline } from "./useShotTimeline";

const TOTAL = 250;
const CONCEPT_NAME = "화이트 스튜디오";
/** AI가 만든 컨셉 하나 › 세부 폴더 넷 — 사진 번호는 샘플 데이터의 구간 그대로(전신 100 · 상반신 75 · 클로즈업 50 · 풍경 25) */
const CONCEPT: ConceptFolderResponse = {
  id: 1,
  galleryId: 0,
  name: CONCEPT_NAME,
  sortOrder: 0,
  createdSource: "AI",
  analysisJobId: 1,
  details: SAMPLE_FOLDERS.map((folder, i) => ({
    id: 10 + i,
    galleryId: 0,
    conceptFolderId: 1,
    name: folder.name,
    sortOrder: i,
    createdSource: "AI",
    needsReview: false,
    photoIds: sampleIdsOf(folder),
  })),
};
/** 그리드에 그리는 사진 — 폴더마다 8장(32장). 숫자는 250장으로 적는다 */
const PHOTOS = landingPhotos(8);
const EMPTY = new Set<number>();
const ALL: FolderSelection = { kind: "all" };
const FIRST: FolderSelection = { kind: "detail", conceptId: CONCEPT.id, detailId: CONCEPT.details[0].id };
const noop = () => {};

export function FoldersShot() {
  const [analyzing, setAnalyzing] = useState(true);
  /** 보이는 세부 폴더 수 */
  const [shown, setShown] = useState(0);
  const [selection, setSelection] = useState<FolderSelection>(ALL);
  const run = useShotTimeline();

  const start = () =>
    run(
      [
        [2200, () => { setAnalyzing(false); setShown(1); }],
        [2600, () => setShown(2)],
        [3000, () => setShown(3)],
        [3400, () => setShown(4)],
        [4200, () => setSelection(FIRST)],
      ],
      () => { setAnalyzing(false); setShown(4); setSelection(FIRST); },
    );

  const folders = analyzing ? [] : [{ ...CONCEPT, details: CONCEPT.details.slice(0, shown) }];
  const detail = selection.kind === "detail" ? CONCEPT.details.find((d) => d.id === selection.detailId) : undefined;
  const visible = detail ? PHOTOS.filter((p) => detail.photoIds.includes(p.photoId)) : PHOTOS;

  const title: ReactNode = detail ? (
    <>
      {detail.name}
      <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{detail.photoIds.length}장</small>
    </>
  ) : (
    <>
      <span className="flex text-contents-light-bgd-weakness">
        <PhotoIcon size={18} />
      </span>
      모든 사진
      {analyzing && (
        <span className="ml-1.5 inline-flex items-center gap-1 rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-semibold-xs text-brand-secondary-dark">
          <SparkleIcon size={12} />
          폴더 만드는 중…
        </span>
      )}
      <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{TOTAL}장</small>
    </>
  );

  return (
    <ShotFrame label="컨셉 분류 화면 — AI가 사진을 컨셉 폴더로 나누고, 폴더로 들어가 정리된 사진을 본다" onVisible={start}>
      <ShotTopbar stageIndex={1} />
      <div className="flex min-h-0 flex-1">
        <ShotSidebar status={analyzing ? "폴더 만드는 중…" : "컨셉 분류 · 폴더를 확정하면 고를 수 있어요"} statusTone="accent" photoCount={TOTAL} />
        <div className="flex min-h-0">
          <FolderColumn
            folders={folders}
            totalPhotos={TOTAL}
            unsortedCount={0}
            selection={selection}
            onSelect={noop}
            pendingNote={analyzing ? { label: "만드는 중…", note: "AI가 컨셉 · 세부 폴더로 나누고 있어요. 끝나면 알림으로 알려 드려요." } : null}
          />
        </div>
        <main className="flex min-w-0 flex-1 flex-col">
          <ShellMainHeader
            zoom={40}
            onZoomChange={noop}
            sort="uploaded"
            onSortChange={noop}
            filter="none"
            onFilterChange={noop}
            scoreSort={false}
            title={title}
            titleParent={detail ? CONCEPT_NAME : undefined}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <PhotoGrid photos={visible} zoom={40} selectedIds={EMPTY} onToggle={noop} selectable={false} />
          </div>
        </main>
      </div>
      <ShellBottomBar
        selectionCount={0}
        onClearSelection={noop}
        onMoveSelection={noop}
        hint="폴더를 확인하고 확정하면 사진을 고를 수 있어요 · 확정은 한 번만 할 수 있어요"
        progress={
          analyzing ? (
            <ProgressBar icon={<SparkleIcon size={18} />} title="AI가 컨셉 · 세부 폴더로 나누고 있어요" ratio={null} indeterminate sub="끝나면 알림으로 알려 드려요" />
          ) : undefined
        }
        actions={
          <>
            <ShellCta kind="ghost">
              <UploadIcon size={18} />
              사진 더 올리기
            </ShellCta>
            <ShellCta disabled={analyzing}>폴더 확정</ShellCta>
          </>
        }
      />
    </ShotFrame>
  );
}
