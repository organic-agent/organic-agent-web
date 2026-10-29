"use client";

/**
 * 랜딩 흐름 03 사진 셀렉 — 크게 보기에서 별점을 매기며 넘기다 마지막 장에서 "마지막 사진이에요" → 별점 순 그리드
 * 위치: src/app/_components/shots/SelectShot.tsx
 *
 * 뒤 화면은 실제 셀렉 화면 그대로(사이드바 접힘) — ShellMainHeader(AI 추천 버튼 · 별점 순) · 별점 묶음 머리글 + PhotoGrid(체크 ·
 * 별점 배지) · ShellBottomBar(선택한 사진 5 / 50 + 썸네일 · 폴더 다시 정리 · 선택 마치기). 크게 보기는 공용 ShotLightbox.
 * 타임라인(ShotFrame.onVisible이 켬): 497 / 500 사진부터 네 장 — 장마다 별점이 한 번에 매겨지고(4를 누르면 별 네 칸이 같이 참,
 * 2026-10-26 수민 — 한 칸씩 차는 건 실제와 다름. 별점 4 · 5 · 3 · 5), 마지막 장(500)에서만 "선택"이 눌리고, 1.5초마다 다음 장. 500 / 500에서 "마지막 사진이에요" 스낵바 → 1.3초 뒤 닫히고 별점 순 그리드. 움직임 줄이기면 그리드부터.
 */

import { useState } from "react";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { DownloadIcon, FolderIcon, PhotoIcon, SparkleIcon, StarFillIcon, StarIcon } from "@/components/icons";
import type { PhotoResponse } from "@/lib/api/photos";
import { landingPhotos } from "./samplePhotos";
import { ShotFrame } from "./ShotFrame";
import { ShotTopbar } from "./ShotChrome";
import { ShotLightbox, ShotSelectionControls } from "./ShotLightbox";
import { useShotTimeline } from "./useShotTimeline";

const TOTAL = 500;
const MAX_PICK = 50;
/** 크게 보기로 넘기는 네 장 — 497 / 500부터. 별점만 매기고 "선택"은 마지막 장에서만(2026-10-26 수민) */
const LB = [
  { id: 4, score: 4 },
  { id: 29, score: 5 },
  { id: 54, score: 3 },
  { id: 104, score: 5 },
] as const;
const LB_FIRST = TOTAL - LB.length;
const STEP_MS = 1500;
/** 사진이 바뀐 뒤 별점을 누르기까지 · 그 뒤 선택을 누르기까지 */
const RATE_AT = 450;
const PICK_AFTER = 350;
const SNACK_MS = 1300;

/** 그리드 120장에 별점을 나눠 준다 — 5점 10 · 4점 24 · 3점 30 · 2점 16 · 없음 40. 체크(선택)는 5점 가운데 5장만(2026-10-26 수민 — 체크는 선택한 사진에만 보이는 표시) */
const SCORE_PLAN: [number | null, number][] = [[5, 10], [4, 24], [3, 30], [2, 16], [null, 40]];
const PHOTOS: PhotoResponse[] = (() => {
  const base = landingPhotos(30);
  // 폴더 순서대로 놓으면 한 폴더가 한 점수에 몰리니 섞어서 매긴다(번호 기준 고정 순서)
  const shuffled = [...base].sort((a, b) => ((a.photoId * 37) % 101) - ((b.photoId * 37) % 101));
  const out: PhotoResponse[] = [];
  let k = 0;
  SCORE_PLAN.forEach(([score, n]) => {
    for (let i = 0; i < n && k < shuffled.length; i++, k++) out.push({ ...shuffled[k], score });
  });
  return out;
})();
const GROUPS = SCORE_PLAN.map(([score]) => ({ score, photos: PHOTOS.filter((p) => p.score === score) })).filter((g) => g.photos.length > 0);
const PICKED = new Set(PHOTOS.filter((p) => p.score === 5).slice(0, 5).map((p) => p.photoId));
const PICKED_LAST3 = PHOTOS.filter((p) => PICKED.has(p.photoId)).slice(-3);
const noop = () => {};

function ScoreStars({ score, size = 14 }: { score: number; size?: number }) {
  return (
    <span className="flex text-brand-secondary-default" aria-label={`별점 ${score}`}>
      {[1, 2, 3, 4, 5].map((n) => (n <= score ? <StarFillIcon key={n} size={size} /> : <StarIcon key={n} size={size} className="text-border-default" />))}
    </span>
  );
}

export function SelectShot() {
  const [phase, setPhase] = useState<"lightbox" | "grid">("lightbox");
  const [cur, setCur] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(false);
  const [snack, setSnack] = useState(false);
  const run = useShotTimeline();

  const start = () => {
    const steps: [number, () => void][] = [];
    LB.forEach((shot, i) => {
      const base = i * STEP_MS;
      if (i > 0) steps.push([base, () => { setCur(i); setScore(0); setPicked(false); }]);
      steps.push([base + RATE_AT, () => setScore(shot.score)]);
      if (i === LB.length - 1) steps.push([base + RATE_AT + PICK_AFTER, () => setPicked(true)]);
    });
    const end = LB.length * STEP_MS;
    steps.push([end, () => setSnack(true)]);
    steps.push([end + SNACK_MS, () => { setSnack(false); setPhase("grid"); }]);
    run(steps, () => setPhase("grid"));
  };

  const shot = LB[cur];

  return (
    <ShotFrame label="사진 셀렉 화면 — 크게 보기에서 별점을 매기며 넘기고, 마지막 장 뒤 별점 순으로 정렬된 그리드를 본다" onVisible={start}>
      <ShotTopbar stageIndex={2} />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <ShellMainHeader
            zoom={40}
            onZoomChange={noop}
            sort="score"
            onSortChange={noop}
            filter="none"
            onFilterChange={noop}
            showFilters={false}
            leading={
              <span className="inline-flex h-9 items-center gap-1.5 rounded-(--radius-8) border border-border-default px-3 whitespace-nowrap type-content-s text-contents-light-bgd-default">
                <span className="text-brand-accent-default">
                  <SparkleIcon size={18} />
                </span>
                AI 추천
              </span>
            }
            title={
              <>
                <span className="flex text-contents-light-bgd-weakness">
                  <PhotoIcon size={18} />
                </span>
                모든 사진
                <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">{TOTAL}장</small>
              </>
            }
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            {GROUPS.map((g) => (
              <div key={g.score ?? "none"} className="pt-1">
                <p className="flex items-center gap-0.5 px-5 pb-2 type-content-xs text-contents-light-bgd-weakness">
                  {g.score !== null ? <ScoreStars score={g.score} /> : <span className="type-label-semibold-xs text-contents-light-bgd-sub">별점 없음</span>}
                  <span className="ml-2">{g.photos.length}장</span>
                </p>
                <PhotoGrid photos={g.photos} zoom={40} selectedIds={PICKED} onToggle={noop} toggleOn="check" markStyle="check" selectable={false} showScore={false} />
              </div>
            ))}
          </div>
        </main>
      </div>
      <ShellBottomBar
        selectionCount={0}
        onClearSelection={noop}
        onMoveSelection={noop}
        hint={null}
        status={
          <span className="flex items-center gap-2 type-content-s text-contents-light-bgd-sub">
            <span>선택한 사진</span>
            <b className="type-label-semibold-l text-contents-light-bgd-default tabular-nums">{PICKED.size}</b>
            <span className="text-contents-light-bgd-weakness">/ {MAX_PICK}</span>
            <span className="ml-1 flex" aria-hidden>
              {PICKED_LAST3.map((p) => (
                <span key={p.photoId} className="-ml-2 size-6.5 overflow-hidden rounded-(--radius-4) border-2 border-background-default-main bg-surface-default-light first:ml-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.viewUrl && <img src={p.viewUrl} alt="" className="size-full object-cover" />}
                </span>
              ))}
            </span>
          </span>
        }
        actions={
          <>
            <ShellCta kind="outline">
              <FolderIcon size={18} />
              폴더 다시 정리
            </ShellCta>
            <ShellCta>
              <DownloadIcon size={18} />
              선택 마치기
            </ShellCta>
          </>
        }
      />

      {/* 크게 보기 — 공용 틀(ShotLightbox) */}
      {phase === "lightbox" && (
        <ShotLightbox
          photoId={shot.id}
          index={LB_FIRST + cur}
          total={TOTAL}
          caption="화이트 스튜디오 › 전신"
          middle={<ShotSelectionControls score={score} picked={picked} />}
          snack={snack ? "마지막 사진이에요" : null}
        />
      )}
    </ShotFrame>
  );
}
