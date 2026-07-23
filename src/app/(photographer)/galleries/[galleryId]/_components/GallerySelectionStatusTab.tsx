"use client";

/**
 * 작가 — 갤러리 셀렉 현황 탭
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GallerySelectionStatusTab.tsx
 *
 * 갤러리 상세 화면에서 부부의 셀렉 진행 상태를 대시보드 형태로 보여준다.
 * 최종 선택본 썸네일은 별도 탭으로 분리하고, 이 탭은 진행률과 폴더별 현황에 집중한다.
 *
 * 주요 책임:
 * - 최종 선택 / 사진 확인 진행률 + 신랑·신부 참여(수락) 상태 요약
 * - 후보/고민중/제외/미정 분포 표시
 * - 폴더별 진행 현황(진행률 낮은 순, 2열, 상위 N개 + 더 보기)
 */

import { useState } from "react";
import {
  SELECT_TARGET,
  getGalleryFolders,
  useCompareTags,
  useSelectedIds,
  type CompareTag,
} from "@/lib/galleryPhotos";

type InvitedPerson = {
  name: string;
  status: string;
  role: string;
};

type Props = {
  invited: InvitedPerson[];
};

type DecisionCounts = Record<CompareTag | "undecided", number>;

const DECISION_META: {
  key: keyof DecisionCounts;
  label: string;
  className: string;
  barClassName: string;
}[] = [
  {
    key: "good",
    label: "후보",
    className: "text-select",
    barClassName: "bg-select",
  },
  {
    key: "hold",
    label: "고민중",
    className: "text-hold",
    barClassName: "bg-hold",
  },
  {
    key: "remove",
    label: "제외",
    className: "text-ink",
    barClassName: "bg-ink",
  },
  {
    key: "undecided",
    label: "미정",
    className: "text-ink-3",
    barClassName: "bg-line-strong",
  },
];

// 2열 × 4줄 = 폴더 8개까지 먼저 보여주고, 넘으면 "더 보기"로 펼친다.
const FOLDER_PREVIEW_COUNT = 8;

function countDecisions(
  photos: { id: number }[],
  compareTags: Record<number, CompareTag>,
): DecisionCounts {
  return photos.reduce<DecisionCounts>(
    (acc, photo) => {
      const tag = compareTags[photo.id];
      if (tag) acc[tag] += 1;
      else acc.undecided += 1;
      return acc;
    },
    { good: 0, hold: 0, remove: 0, undecided: 0 },
  );
}

export function GallerySelectionStatusTab({ invited }: Props) {
  const [showAllFolders, setShowAllFolders] = useState(false);
  const selectedIds = useSelectedIds();
  const compareTags = useCompareTags();
  const folders = getGalleryFolders();
  const allPhotos = folders.flatMap((folder) => folder.photos);
  const totalPhotos = allPhotos.length;
  const decisionCounts = countDecisions(allPhotos, compareTags);
  const reviewedCount =
    decisionCounts.good + decisionCounts.hold + decisionCounts.remove;
  const reviewPct =
    totalPhotos > 0 ? Math.round((reviewedCount / totalPhotos) * 100) : 0;
  const selectedPct = Math.min(
    100,
    Math.round((selectedIds.length / SELECT_TARGET) * 100),
  );

  // 폴더별 통계 — 진행률 낮은(손봐야 할) 폴더가 위로 오도록 정렬.
  const folderStats = folders
    .map((folder) => {
      const counts = countDecisions(folder.photos, compareTags);
      const reviewed = counts.good + counts.hold + counts.remove;
      const pct =
        folder.photos.length > 0
          ? Math.round((reviewed / folder.photos.length) * 100)
          : 0;
      return { folder, counts, reviewed, pct };
    })
    .sort((a, b) => a.pct - b.pct);
  const visibleFolderStats = showAllFolders
    ? folderStats
    : folderStats.slice(0, FOLDER_PREVIEW_COUNT);
  const hasMoreFolders = folderStats.length > FOLDER_PREVIEW_COUNT;

  return (
    <div className="px-6 md:px-8 py-8">
      {/* 상단 요약 3카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <section className="border border-line rounded-lg p-6">
          <p className="text-[12px] font-medium text-ink-2 mb-2">최종 선택</p>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="font-display-en text-[32px] font-semibold text-ink leading-none">
                {selectedIds.length}
              </span>
              <span className="text-[13px] text-ink-3"> / {SELECT_TARGET}장</span>
            </div>
            <span className="text-[13px] font-medium text-accent-press">
              {selectedPct}%
            </span>
          </div>
          <div className="h-2 rounded-pill bg-paper-deep overflow-hidden">
            <div
              className="h-full rounded-pill bg-accent transition-all"
              style={{ width: `${selectedPct}%` }}
            />
          </div>
        </section>

        <section className="border border-line rounded-lg p-6">
          <p className="text-[12px] font-medium text-ink-2 mb-2">
            사진 확인 진행
          </p>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="font-display-en text-[32px] font-semibold text-ink leading-none">
                {reviewedCount}
              </span>
              <span className="text-[13px] text-ink-3"> / {totalPhotos}장</span>
            </div>
            <span className="text-[13px] font-medium text-ink">{reviewPct}%</span>
          </div>
          <div className="h-2 rounded-pill bg-paper-deep overflow-hidden">
            <div
              className="h-full rounded-pill bg-ink transition-all"
              style={{ width: `${reviewPct}%` }}
            />
          </div>
        </section>

        <section className="border border-line rounded-lg p-6">
          <p className="text-[12px] font-medium text-ink-2 mb-3">참여 인원</p>
          <div className="space-y-3">
            {invited.map((person) => (
              <div
                key={person.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-[14px] text-ink truncate">
                  {person.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[12px] font-medium shrink-0 ${
                    person.status === "수락" ? "text-select" : "text-ink-3"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      person.status === "수락" ? "bg-select" : "bg-line-strong"
                    }`}
                  />
                  {person.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 셀렉 분포 */}
      <section className="border border-line rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display-ko font-medium text-[16px] text-ink">
            셀렉 분포
          </h2>
          <span className="text-[12px] text-ink-3">총 {totalPhotos}장 기준</span>
        </div>
        <div className="h-2 rounded-pill bg-paper-deep overflow-hidden flex mb-4">
          {DECISION_META.map((item) => (
            <div
              key={item.key}
              className={`h-full ${item.barClassName}`}
              style={{
                width:
                  totalPhotos > 0
                    ? `${(decisionCounts[item.key] / totalPhotos) * 100}%`
                    : "0%",
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DECISION_META.map((item) => (
            <div key={item.key} className="rounded-md bg-paper-deep p-3">
              <p className="text-[11px] text-ink-3">{item.label}</p>
              <p
                className={`font-display-en text-[22px] font-semibold ${item.className}`}
              >
                {decisionCounts[item.key]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 폴더별 진행 현황 — 진행률 낮은 순, 2열, 상위 N개 + 더 보기 */}
      <section className="border border-line rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display-ko font-medium text-[16px] text-ink">
            폴더별 진행 현황
          </h2>
          <span className="text-[12px] text-ink-3">진행률 낮은 순</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {visibleFolderStats.map(({ folder, counts, reviewed, pct }) => (
            <div key={folder.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <h3 className="text-[14px] font-medium text-ink truncate">
                  {folder.label}
                </h3>
                <span className="text-[13px] font-semibold text-ink shrink-0">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-pill bg-paper-deep overflow-hidden flex mb-1.5">
                {DECISION_META.map((item) => (
                  <div
                    key={item.key}
                    className={`h-full ${item.barClassName}`}
                    style={{
                      width:
                        folder.photos.length > 0
                          ? `${(counts[item.key] / folder.photos.length) * 100}%`
                          : "0%",
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-ink-3">
                {reviewed} / {folder.photos.length} 확인
              </p>
            </div>
          ))}
        </div>
        {hasMoreFolders && (
          <button
            type="button"
            onClick={() => setShowAllFolders((current) => !current)}
            className="mt-5 w-full h-9 rounded-md border border-line text-[12px] font-medium text-ink-2 hover:border-ink-3 hover:text-ink transition-colors"
          >
            {showAllFolders
              ? "접기"
              : `폴더 ${folderStats.length - FOLDER_PREVIEW_COUNT}개 더 보기`}
          </button>
        )}
      </section>
    </div>
  );
}
