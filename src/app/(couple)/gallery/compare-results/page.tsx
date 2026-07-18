"use client";

/**
 * 부부 — 사진 분류 결과
 * 위치: src/app/(couple)/gallery/compare-results/page.tsx
 *
 * ⚠️ 지금은 UI만. 세션·API 로직은 회의 후 연결.
 *    - 카테고리 갤러리에서 후보/고민중/제외로 분류한 결과를 한눈에 요약한다.
 *    - 상단 요약 카드 → 분류별 미리보기 → 폴더별 분류 현황 순서로 확인 흐름을 만든다.
 *    - src/lib/couple.ts 공용 저장소(localStorage)에서 읽으므로, 갤러리에서 태그를 걸수록
 *      이 페이지도 최신 상태를 보여준다.
 */

import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import {
  PHOTOS,
  getGalleryFolders,
  type Photo,
  photoUrl,
  useCompareTags,
} from "@/lib/couple";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  categoryResultHref,
  type ResultCategory,
} from "./_lib/resultCategories";

const SIDEBAR_ITEMS = [
  {
    key: "gallery",
    label: "카테고리 갤러리",
    href: "/gallery",
    icon: "M4 4h16v16H4zM4 12h16M12 4v16",
    active: true,
  },
  {
    key: "selected",
    label: "선택 앨범",
    href: "/selected",
    icon: "M5 3h14v18l-7-4-7 4z",
  },
  {
    key: "collaboration",
    label: "협업 셀렉",
    href: "/collaboration",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
];

function ResultPreviewGrid({ photos }: { photos: Photo[] }) {
  const preview = photos.slice(0, 4);

  if (preview.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-md border border-dashed border-line bg-white grid place-items-center">
        <span className="text-[12px] text-ink-3">아직 없어요</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {preview.map((photo) => (
        <div
          key={photo.id}
          className="relative aspect-[3/4] rounded overflow-hidden bg-paper-deep"
        >
          <img
            src={photoUrl(photo.photoId, 240)}
            alt={`사진 ${photo.id}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export default function CompareResultsPage() {
  const tags = useCompareTags();

  const groups: Record<ResultCategory, Photo[]> = {
    good: [],
    hold: [],
    remove: [],
    undecided: [],
  };

  for (const photo of PHOTOS) {
    const tag = tags[photo.id];
    if (tag) groups[tag].push(photo);
    else groups.undecided.push(photo);
  }

  const totalReviewed =
    groups.good.length + groups.hold.length + groups.remove.length;
  const reviewedPct =
    PHOTOS.length > 0 ? Math.round((totalReviewed / PHOTOS.length) * 100) : 0;

  const summaryCards = [
    {
      label: "분류 완료",
      value: `${totalReviewed}`,
      caption: `전체 ${PHOTOS.length}장 중 ${reviewedPct}%`,
      className: "border-line bg-white",
    },
    ...CATEGORY_ORDER.map((key) => ({
      label: CATEGORY_META[key].label,
      value: `${groups[key].length}`,
      caption: CATEGORY_META[key].description,
      className: CATEGORY_META[key].cardClassName,
    })),
  ];

  const folderSummaries = getGalleryFolders().map((folder) => {
    const counts: Record<ResultCategory, number> = {
      good: 0,
      hold: 0,
      remove: 0,
      undecided: 0,
    };

    for (const photo of folder.photos) {
      const tag = tags[photo.id];
      if (tag) counts[tag] += 1;
      else counts.undecided += 1;
    }

    const reviewed = counts.good + counts.hold + counts.remove;
    const progress =
      folder.photos.length > 0
        ? Math.round((reviewed / folder.photos.length) * 100)
        : 0;

    return {
      folder,
      counts,
      reviewed,
      progress,
    };
  });

  return (
    <div className="min-h-dvh bg-white flex">
      {/* ═══ 사이드바 (공용 컴포넌트) ═══ */}
      <AppSidebar
        menu={SIDEBAR_ITEMS}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />

      {/* ═══ 메인 ═══ */}
      <main className="flex-1 min-w-0">
        <header className="h-16 flex items-center gap-4 px-6 md:px-8 border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <Link
            href="/gallery"
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep transition-colors shrink-0"
            aria-label="갤러리로"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-display-ko font-medium text-[20px] text-ink leading-none">
            사진 분류 결과
          </h1>
        </header>

        <div className="px-6 md:px-8 py-8 space-y-9">
          <section>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="text-[16px] font-medium text-ink">
                  전체 분류 요약
                </h2>
                <p className="text-[13px] text-ink-3 mt-1">
                  후보, 고민중, 제외로 나눈 진행 상황을 먼저 확인해요.
                </p>
              </div>
              <Link
                href="/gallery"
                className="h-9 px-4 rounded-pill border border-line text-[13px] font-medium text-ink-2 hover:border-ink-3 hover:text-ink transition-colors inline-flex items-center"
              >
                계속 분류하기
              </Link>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-lg border p-4 ${card.className}`}
                >
                  <p className="text-[12px] font-medium text-ink-3">
                    {card.label}
                  </p>
                  <p className="mt-2 font-display-en text-[30px] font-semibold leading-none text-ink">
                    {card.value}
                    <span className="ml-1 text-[13px] font-medium text-ink-3">
                      장
                    </span>
                  </p>
                  <p className="mt-2 text-[12px] leading-snug text-ink-3">
                    {card.caption}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-ink mb-4">
              분류별 미리보기
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {CATEGORY_ORDER.map((key) => {
                const meta = CATEGORY_META[key];
                const count = groups[key].length;

                return (
                  <Link
                    key={key}
                    href={categoryResultHref(key)}
                    className={`rounded-lg border p-4 block transition-all hover:-translate-y-0.5 hover:shadow-md ${meta.cardClassName}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-[14px] font-medium text-ink">
                          <span
                            className={`w-2 h-2 rounded-full ${meta.dotClassName}`}
                          />
                          {meta.label}
                        </h3>
                        <p className="text-[12px] text-ink-3 mt-1">
                          {meta.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] font-medium text-ink-3">
                        {count}장
                      </span>
                    </div>

                    <ResultPreviewGrid photos={groups[key]} />
                    <div className="mt-3 text-[12px] font-medium text-ink-2">
                      전체 보기
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-ink mb-4">
              폴더별 분류 현황
            </h2>
            <div className="border border-line rounded-lg overflow-hidden bg-white">
              {folderSummaries.map(({ folder, counts, reviewed, progress }) => (
                <Link
                  key={folder.key}
                  href={`/gallery/${folder.key}`}
                  className="grid grid-cols-[minmax(160px,1fr)_220px_120px] gap-5 items-center px-5 py-4 border-b border-line last:border-b-0 hover:bg-paper transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink truncate">
                      {folder.label}
                    </p>
                    <p className="text-[12px] text-ink-3 mt-1">
                      {reviewed} / {folder.photos.length}장 분류 완료
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORY_ORDER.map((key) => (
                      <div key={key} className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${CATEGORY_META[key].dotClassName}`}
                          />
                          <span className="text-[11px] text-ink-3 truncate">
                            {CATEGORY_META[key].label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] font-medium text-ink">
                          {counts[key]}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-ink-3">진행률</span>
                      <span className="text-[11px] font-medium text-ink-2">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-2 rounded-pill bg-paper-deep overflow-hidden">
                      <div
                        className="h-full rounded-pill bg-ink transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
