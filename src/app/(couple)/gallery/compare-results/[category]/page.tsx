"use client";

/**
 * 부부 — 사진 분류 결과 상세
 * 위치: src/app/(couple)/gallery/compare-results/[category]/page.tsx
 *
 * 사진 분류 결과 페이지에서 특정 상태를 클릭했을 때 해당 상태의 사진만 모아 보여준다.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
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
  isResultCategory,
  type ResultCategory,
} from "../_lib/resultCategories";

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

function photosByCategory(
  photos: Photo[],
  tags: Record<number, ResultCategory>,
  category: ResultCategory,
) {
  return photos.filter((photo) => {
    const tag = tags[photo.id];
    if (category === "undecided") return !tag;
    return tag === category;
  });
}

export default function CompareResultCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const tags = useCompareTags();

  if (!isResultCategory(category)) {
    return (
      <div className="min-h-dvh bg-white grid place-items-center px-6">
        <div className="text-center">
          <p className="text-[14px] text-ink-2 mb-3">
            알 수 없는 분류 결과예요.
          </p>
          <Link
            href="/gallery/compare-results"
            className="text-[13px] text-accent hover:text-accent-press underline underline-offset-2"
          >
            사진 분류 결과로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[category];
  const photos = photosByCategory(PHOTOS, tags, category);
  const folders = getGalleryFolders();

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
            href="/gallery/compare-results"
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep transition-colors shrink-0"
            aria-label="사진 분류 결과로"
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
          <div className="min-w-0">
            <h1 className="font-display-ko font-medium text-[20px] text-ink leading-none">
              {meta.label} 사진
            </h1>
            <p className="text-[12px] text-ink-3 mt-1">{meta.description}</p>
          </div>
        </header>

        <div className="px-6 md:px-8 py-8">
          <section
            className={`rounded-lg border p-5 mb-6 ${meta.cardClassName}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  <span className={`w-2 h-2 rounded-full ${meta.dotClassName}`} />
                  {meta.label}
                </p>
                <p className="text-[12px] text-ink-3 mt-1">
                  전체 사진 중 {photos.length}장이 이 상태로 분류되어 있어요.
                </p>
              </div>
              <span className="font-display-en text-[34px] font-semibold leading-none text-ink">
                {photos.length}
                <span className="ml-1 text-[13px] font-medium text-ink-3">
                  장
                </span>
              </span>
            </div>
          </section>

          {photos.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-[14px] text-ink-2 mb-1">
                아직 이 분류에 해당하는 사진이 없어요.
              </p>
              <Link
                href="/gallery"
                className="text-[13px] text-accent hover:text-accent-press underline underline-offset-2"
              >
                갤러리에서 사진 분류하기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
              {photos.map((photo) => {
                const folder = folders.find(
                  (item) =>
                    item.scene === photo.scene && item.person === photo.person,
                );

                return (
                  <Link
                    key={photo.id}
                    href={
                      folder
                        ? `/gallery/${encodeURIComponent(folder.key)}/photos/${photo.id}`
                        : "/gallery"
                    }
                    className="group block rounded-lg border border-line overflow-hidden bg-white hover:shadow-md hover:-translate-y-0.5 transition-all"
                    aria-label={`사진 ${photo.id} 상세 보기`}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-paper-deep">
                      <img
                        src={photoUrl(photo.photoId, 700)}
                        alt={`사진 ${photo.id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute bottom-2.5 left-2.5 font-mono text-[10px] text-white/90 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        #{String(photo.id).padStart(3, "0")}
                      </span>
                    </div>
                    <div className="p-3.5">
                      <p className="text-[13px] font-medium text-ink truncate">
                        {folder?.label ?? `${photo.scene} - ${photo.person}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
