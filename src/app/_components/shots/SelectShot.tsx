"use client";

/**
 * 랜딩 흐름 03 사진 셀렉 — 크게 보기에서 별점을 매기며 넘기다 마지막 장에서 "마지막 사진이에요" → 점수 묶음 그리드
 * 위치: src/app/_components/shots/SelectShot.tsx
 *
 * 뒤 화면은 실제 셀렉 화면 그대로(사이드바 접힘) — ShellMainHeader(AI 추천 버튼 · 필터 버튼, 둘 다 눌리지 않는 모양만 · 이슈 149) · 별점 묶음 머리글 + PhotoGrid(체크 ·
 * 별점 배지) · ShellBottomBar(선택한 사진 5 / 50 + 썸네일 · 폴더 다시 정리 · 선택 마치기). 크게 보기는 공용 ShotLightbox.
 * 타임라인(ShotFrame.onVisible이 켬): 497 / 500 사진부터 네 장 — 장마다 별점이 한 번에 매겨지고(4를 누르면 별 네 칸이 같이 참,
 * 2026-10-26 수민 — 한 칸씩 차는 건 실제와 다름. 별점 4 · 5 · 3 · 5), 마지막 장(500)에서만 "선택"이 눌리고, 1.5초마다 다음 장. 500 / 500에서 "마지막 사진이에요" 스낵바 → 1.3초 뒤 닫히고 점수 묶음 그리드. 움직임 줄이기면 그리드부터.
 * tour(흐름 확대 투어, 이슈 182 시안 4-5 · 2026-11-23 수민): 주면 타임라인 대신 스크롤 단계가 장면을 정한다 —
 *   0 크게 보기(별점 전) · 1 내가 별점 5 · 선택(사람 색 하늘) · 2 정보 탭 — 신랑이 4로 바꾼 별(코랄)과 별점 기록(실제 PhotoInfoPanel) ·
 *   3 그리드 + 조건 칩(실제 SelectFilterButton · SelectFilterChips — ★5 ★4 · 게스트 좋아요). 앞으로 갈 때만 별이 차고, 되돌아오면 끝 모양.
 */

import { useEffect, useRef, useState } from "react";
import { PhotoGrid } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/PhotoGrid";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { ShellMainHeader } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellMainHeader";
import { DownloadIcon, FilterIcon, FolderIcon, PhotoIcon, SparkleIcon } from "@/components/icons";
import { memberColorVar } from "@/app/(client)/gallery/[galleryId]/_shell/members";
import { PhotoInfoPanel, type RatingHistoryRow } from "@/app/(client)/gallery/[galleryId]/_shell/PhotoInfoPanel";
import {
  ScoreStars,
  SelectFilterButton,
  SelectFilterChips,
  matchesConditions,
  type ConditionContext,
  type SelectConditions,
} from "@/app/(client)/gallery/[galleryId]/_shell/SelectFilter";
import type { PhotoResponse } from "@/lib/api/photos";
import { SAMPLE_PHOTOS, landingPhotos } from "./samplePhotos";
import { ShotFrame, type ShotCamera, type ShotCrop } from "./ShotFrame";
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

/** 투어 — 함께 고르는 두 사람의 색(실제 기본 순서: 먼저 들어온 나 하늘, 신랑 코랄) */
const ME = memberColorVar("sky");
const PARTNER = memberColorVar("coral");
/** 투어 크게 보기 사진 — 500 / 500(마지막 장) */
const TOUR_PHOTO = SAMPLE_PHOTOS.find((p) => p.photoId === LB[LB.length - 1].id) ?? PHOTOS[0];
/** 투어 필터 — ★5 ★4 + 게스트 좋아요. 좋아요는 5 · 4점 사진 셋 중 하나에 */
const FILTER: SelectConditions = { pick: "all", scores: new Set([5, 4]), guest: true, ai: false };
const FILTER_CTX: ConditionContext = {
  pickedIds: PICKED,
  likesByPhoto: new Map(PHOTOS.filter((p) => (p.score ?? 0) >= 4).filter((_, i) => i % 3 === 0).map((p) => [p.photoId, 2])),
  aiIds: new Set(),
};
const FILTERED = PHOTOS.filter((p) => matchesConditions(p, FILTER, FILTER_CTX));
const FILTERED_GROUPS = [5, 4].map((score) => ({ score, photos: FILTERED.filter((p) => p.score === score) })).filter((g) => g.photos.length > 0);

export function SelectShot({ crop, tour, camera }: { crop?: ShotCrop; tour?: number; camera?: ShotCamera }) {
  const [phase, setPhase] = useState<"lightbox" | "grid">("lightbox");
  const [cur, setCur] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(false);
  const [snack, setSnack] = useState(false);
  /** 투어 — 정보 탭(신랑이 바꾼 별점 · 기록, 시각은 그 장면에 들어올 때) · 그리드 조건 칩 */
  const [info, setInfo] = useState<{ at: string; rows: RatingHistoryRow[] } | null>(null);
  const [filtered, setFiltered] = useState(false);
  const prevTour = useRef(tour);
  const run = useShotTimeline();

  // 확대 투어 — 단계가 장면을 정한다. 타이머 안에서만 상태를 바꾼다
  useEffect(() => {
    if (tour === undefined) return;
    const back = prevTour.current !== undefined && tour < prevTour.current;
    prevTour.current = tour;
    const still = back || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    at(0, () => {
      setCur(LB.length - 1);
      setSnack(false);
      setPhase(tour >= 3 ? "grid" : "lightbox");
      setFiltered(tour >= 3);
      if (tour !== 2) setInfo(null);
    });
    if (tour === 0) {
      at(0, () => {
        setScore(0);
        setPicked(false);
      });
    } else if (tour === 1) {
      if (still) {
        at(0, () => {
          setScore(5);
          setPicked(true);
        });
      } else {
        at(0, () => {
          setScore(0);
          setPicked(false);
        });
        at(900, () => setScore(5));
        at(1250, () => setPicked(true));
      }
    } else if (tour === 2) {
      at(0, () => {
        const now = Date.now();
        setScore(4);
        setPicked(true);
        setInfo({
          at: new Date(now).toISOString(),
          rows: [
            { id: 2, score: 4, name: "신랑", color: PARTNER, at: new Date(now).toISOString() },
            { id: 1, score: 5, name: "나", color: ME, at: new Date(now - 38 * 60_000).toISOString() },
          ],
        });
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [tour]);

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
    <ShotFrame
      label="사진 셀렉 화면 — 크게 보기에서 별점을 매기며 넘기고, 마지막 장 뒤 점수 묶음으로 정리된 그리드를 본다"
      onVisible={tour === undefined ? start : undefined}
      crop={crop}
      camera={camera}
    >
      <ShotTopbar stageIndex={2} />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <ShellMainHeader
            zoom={40}
            onZoomChange={noop}
            sort="uploaded"
            onSortChange={noop}
            filter="none"
            onFilterChange={noop}
            sortable={false}
            trailing={
              filtered ? (
                <SelectFilterButton conditions={FILTER} onChange={noop} photos={PHOTOS} context={FILTER_CTX} visibleCount={FILTERED.length} />
              ) : (
                <span className="inline-flex h-9 items-center gap-1.5 rounded-(--radius-8) bg-surface-default-light px-3 whitespace-nowrap type-content-s text-contents-light-bgd-default">
                  <span className="flex text-contents-light-bgd-sub">
                    <FilterIcon size={18} />
                  </span>
                  필터
                </span>
              )
            }
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
                <small className="ml-1 type-content-s font-normal text-contents-light-bgd-weakness">
                  {filtered ? `${FILTERED.length}장 / ${TOTAL}` : `${TOTAL}장`}
                </small>
              </>
            }
          />
          {filtered && <SelectFilterChips conditions={FILTER} onChange={noop} visibleCount={FILTERED.length} />}
          <div className="min-h-0 flex-1 overflow-hidden">
            {(filtered ? FILTERED_GROUPS : GROUPS).map((g) => (
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
          middle={
            <ShotSelectionControls
              score={score}
              picked={picked}
              starColor={tour === undefined ? undefined : info ? PARTNER : ME}
              pickColor={tour === undefined ? undefined : ME}
            />
          }
          snack={snack ? "마지막 사진이에요" : null}
          tab={info ? "info" : "none"}
          panel={
            info && (
              <PhotoInfoPanel
                galleryId={0}
                photo={TOUR_PHOTO}
                score={4}
                editable={false}
                rater={{ name: "신랑", color: PARTNER, at: info.at, me: false }}
                history={{ rows: info.rows, failed: false }}
                onRate={noop}
              />
            )
          }
        />
      )}
    </ShotFrame>
  );
}
