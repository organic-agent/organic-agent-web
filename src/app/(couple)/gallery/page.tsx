"use client";

/**
 * 부부 — 카테고리 갤러리 (장면 × 인물 폴더 목록)
 * 위치: src/app/(couple)/gallery/page.tsx
 *
 * ⚠️ 지금은 UI만. 세션·API 로직은 회의 후 연결.
 *    - 사진/선택 앨범 데이터는 src/lib/couple.ts 공용 저장소(localStorage)를 씀.
 *    - 사진은 "야외 - 신랑" 같은 장면×인물 폴더로 묶여 보이고,
 *      장면별/인물별 드롭다운은 폴더 목록을 필터링한다.
 *    - 폴더 클릭 → /gallery/[key] 상세(사진 그리드 + 체크/보내기/비교 셀렉)로 이동.
 *      상세 페이지는 다음 단계에서 구현 예정.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import {
  SCENE_FILTERS,
  PERSON_FILTERS,
  SELECT_TARGET,
  photoUrl,
  useSelectedIds,
  getGalleryFolders,
} from "@/lib/couple";

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

/** 장면 아이콘 (사진 프레임) */
function SceneIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M21 16l-4.5-4.5L9 19" />
    </svg>
  );
}

/** 인물 아이콘 */
function PersonIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-ink-3 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** 아이콘 프리픽스 컴팩트 드롭다운 (장면별 / 인물별 공용) */
function IconFilterDropdown({
  icon,
  prefix,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  prefix: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-9 pl-3 pr-2.5 rounded-pill border border-line text-[12.5px] font-medium text-ink-2 bg-white outline-none hover:border-line-strong focus:border-ink-3 transition-colors inline-flex items-center gap-1.5"
      >
        <span className="text-ink-3">{icon}</span>
        {prefix} {value}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[150px] bg-white border border-line rounded-lg shadow-md py-1.5"
        >
          {options.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                  active
                    ? "text-ink font-medium bg-paper-deep"
                    : "text-ink-2 hover:bg-paper-deep"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CoupleGalleryPage() {
  const [sceneFilter, setSceneFilter] = useState("전체");
  const [personFilter, setPersonFilter] = useState("전체");

  // 이미 선택 앨범에 담긴 사진 id 목록 (공용 저장소와 실시간으로 동기화)
  const selectedIds = useSelectedIds();
  const selectedSet = new Set(selectedIds);

  const folders = getGalleryFolders().filter((f) => {
    const sceneOk = sceneFilter === "전체" || f.scene === sceneFilter;
    const personOk = personFilter === "전체" || f.person === personFilter;
    return sceneOk && personOk;
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
        {/* 상단 바 */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="font-display-ko font-medium text-[20px] text-ink leading-none">
              카테고리 갤러리
            </h1>
            <span className="text-line-strong" aria-hidden="true">
              |
            </span>
            <Link
              href="/gallery/compare-results"
              className="text-[13px] text-ink-2 hover:text-ink transition-colors"
            >
              사진 분류 결과
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-ink-2">
              선택 앨범 {selectedIds.length} / {SELECT_TARGET}
            </span>
            <div className="w-24 h-1.5 rounded-pill bg-paper-deep overflow-hidden">
              <div
                className="h-full rounded-pill bg-accent transition-all"
                style={{
                  width: `${Math.min(100, Math.round((selectedIds.length / SELECT_TARGET) * 100))}%`,
                }}
              />
            </div>
          </div>
        </header>

        {/* 장면별 / 인물별 필터 */}
        <div className="h-17 px-6 md:px-8 border-b border-line flex items-center gap-2">
          <IconFilterDropdown
            icon={<SceneIcon />}
            prefix="장면"
            value={sceneFilter}
            options={SCENE_FILTERS}
            onChange={setSceneFilter}
          />
          <IconFilterDropdown
            icon={<PersonIcon />}
            prefix="인물"
            value={personFilter}
            options={PERSON_FILTERS}
            onChange={setPersonFilter}
          />
        </div>

        {/* 폴더 그리드 */}
        <div className="px-6 md:px-8 py-8">
          {folders.length === 0 ? (
            <p className="text-center text-[13px] text-ink-3 py-16">
              해당 조건의 폴더가 없어요
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {folders.map((folder) => {
                const selectedCount = folder.photos.filter((p) =>
                  selectedSet.has(p.id),
                ).length;
                return (
                  <Link
                    key={folder.key}
                    href={`/gallery/${folder.key}`}
                    className="group block border border-line rounded-lg overflow-hidden bg-white hover:shadow-md hover:-translate-y-1 transition-all"
                  >
                    {/* 커버: 폴더 첫 사진 */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
                      <img
                        src={photoUrl(folder.photos[0].photoId, 800)}
                        alt={`${folder.label} 폴더 커버`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute bottom-3 right-3 px-2 py-1 rounded-pill text-[11px] font-medium bg-black/40 text-white backdrop-blur-sm">
                        사진 {folder.photos.length}장
                      </span>
                    </div>

                    {/* 정보 */}
                    <div className="p-5">
                      <h2 className="font-display-ko font-medium text-[16px] text-ink">
                        {folder.label}
                      </h2>
                      <p className="text-[12px] text-ink-3 mt-1.5">
                        {selectedCount > 0
                          ? `선택 앨범에 ${selectedCount}장 담김`
                          : "아직 담은 사진이 없어요"}
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
