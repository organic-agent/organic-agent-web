"use client";

/**
 * 작가 — 갤러리 셀렉 현황 탭
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GallerySelectionStatusTab.tsx
 *
 * 갤러리 상세 화면에서 부부의 셀렉 진행 상태를 대시보드 형태로 보여준다.
 * 최종 선택본 썸네일은 별도 탭으로 분리하고, 이 탭은 진행률과 폴더별 현황에 집중한다.
 *
 * 주요 책임:
 * - 최종 선택/확인 진행률 요약
 * - 후보/고민중/제외/미정 분포 표시
 * - 폴더별 진행 현황과 참여 인원 상태 표시
 */

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
  const acceptedCount = invited.filter((person) => person.status === "수락").length;

  return (
    <div className="px-6 md:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <section className="border border-line rounded-lg p-6">
          <p className="text-[12px] font-medium text-ink-2 mb-2">
            최종 선택
          </p>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="font-display-en text-[32px] font-semibold text-ink leading-none">
                {selectedIds.length}
              </span>
              <span className="text-[13px] text-ink-3">
                {" "}
                / {SELECT_TARGET}장
              </span>
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
              <span className="text-[13px] text-ink-3">
                {" "}
                / {totalPhotos}장
              </span>
            </div>
            <span className="text-[13px] font-medium text-ink">
              {reviewPct}%
            </span>
          </div>
          <div className="h-2 rounded-pill bg-paper-deep overflow-hidden">
            <div
              className="h-full rounded-pill bg-ink transition-all"
              style={{ width: `${reviewPct}%` }}
            />
          </div>
        </section>

        <section className="border border-line rounded-lg p-6">
          <p className="text-[12px] font-medium text-ink-2 mb-2">
            참여 인원
          </p>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-display-en text-[32px] font-semibold text-ink leading-none">
                {acceptedCount}
              </span>
              <span className="text-[13px] text-ink-3">
                {" "}
                / {invited.length}명 수락
              </span>
            </div>
            <span className="text-[13px] font-medium text-select">
              {invited.length > 0
                ? Math.round((acceptedCount / invited.length) * 100)
                : 0}
              %
            </span>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-6">
          <section className="border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display-ko font-medium text-[16px] text-ink">
                셀렉 분포
              </h2>
              <span className="text-[12px] text-ink-3">
                총 {totalPhotos}장 기준
              </span>
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

          <section className="border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display-ko font-medium text-[16px] text-ink">
                폴더별 진행 현황
              </h2>
              <span className="text-[12px] text-ink-3">
                장면·인물 폴더 기준
              </span>
            </div>
            <div className="flex flex-col divide-y divide-line">
              {folders.map((folder) => {
                const counts = countDecisions(folder.photos, compareTags);
                const folderReviewed =
                  counts.good + counts.hold + counts.remove;
                const folderPct =
                  folder.photos.length > 0
                    ? Math.round((folderReviewed / folder.photos.length) * 100)
                    : 0;

                return (
                  <div
                    key={folder.key}
                    className="grid grid-cols-[minmax(0,1fr)_120px] gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <h3 className="text-[14px] font-medium text-ink truncate">
                          {folder.label}
                        </h3>
                        <span className="text-[12px] text-ink-3 shrink-0">
                          {folderReviewed} / {folder.photos.length} 확인
                        </span>
                      </div>
                      <div className="h-1.5 rounded-pill bg-paper-deep overflow-hidden flex">
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
                    </div>
                    <div className="text-right">
                      <p className="font-display-en text-[20px] font-semibold text-ink leading-none">
                        {folderPct}%
                      </p>
                      <p className="text-[11px] text-ink-3 mt-1">
                        후보 {counts.good} · 고민중 {counts.hold}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="border border-line rounded-lg p-6 h-fit">
          <h2 className="font-display-ko font-medium text-[16px] text-ink mb-4">
            참여 인원
          </h2>
          <div className="flex flex-col divide-y divide-line">
            {invited.map((person) => (
              <div
                key={person.name}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-paper-deep grid place-items-center text-[12px] text-ink-2">
                    {person.name.slice(-1)}
                  </div>
                  <span className="text-[14px] text-ink">{person.name}</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-pill text-[11px] font-medium ${
                    person.status === "수락"
                      ? "bg-select-soft text-select"
                      : "bg-paper-deep text-ink-3"
                  }`}
                >
                  {person.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
