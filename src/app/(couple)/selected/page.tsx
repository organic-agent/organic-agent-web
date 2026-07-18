"use client";

/**
 * 부부 — 선택 앨범 (최종 선택 모음)
 * 위치: src/app/(couple)/selected/page.tsx
 *
 * ⚠️ 지금은 UI만. 세션·API 로직은 회의 후 연결.
 *    - 선택 사진은 목업. 실제로는 GET /api/v1/galleries/{id}/selections.
 *    - 선택 해제/제출은 화면 안에서만 동작(저장 안 됨).
 */

import Link from "next/link";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import {
  SELECT_TARGET,
  DEMO_GALLERY_ID,
  photoUrl,
  useSelectedIds,
  removeFromSelected,
  getPhotosByIds,
  getGalleryFolders,
} from "@/lib/couple";
import { updateGallery, useGalleries } from "@/lib/galleries";

const SIDEBAR = [
  {
    key: "gallery",
    label: "카테고리 갤러리",
    href: "/gallery",
    icon: "M4 4h16v16H4zM4 12h16M12 4v16",
  },
  {
    key: "selected",
    label: "선택 앨범",
    href: "/selected",
    icon: "M5 3h14v18l-7-4-7 4z",
    active: true,
  },
  {
    key: "collaboration",
    label: "협업 셀렉",
    href: "/collaboration",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
];

export default function SelectedPage() {
  const selectedIds = useSelectedIds();
  const selected = getPhotosByIds(selectedIds);
  const folders = getGalleryFolders();
  const TARGET = SELECT_TARGET;
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 이 갤러리(현재는 데모용 고정 id)의 제출 여부를 실시간으로 읽어온다.
  const galleries = useGalleries();
  const gallery = galleries.find((g) => g.id === DEMO_GALLERY_ID);
  const submitted = Boolean(gallery?.selectionSubmittedAt);
  const canSubmit = selected.length >= TARGET && !submitted;

  function remove(id: number) {
    if (submitted) return;
    removeFromSelected(id);
  }

  function submitToPhotographer() {
    if (!canSubmit) return;
    updateGallery(DEMO_GALLERY_ID, {
      selectionSubmittedAt: new Date().toISOString(),
    });
    setConfirmOpen(false);
  }

  const pct = Math.min(100, Math.round((selected.length / TARGET) * 100));
  const submittedDate = gallery?.selectionSubmittedAt
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(gallery.selectionSubmittedAt))
    : "";

  function folderHref(scene: string, person: string) {
    const folder = folders.find((f) => f.scene === scene && f.person === person);
    return `/gallery/${folder?.key ?? `${scene}-${person}`}`;
  }

  return (
    <div className="min-h-dvh bg-white flex">
      {/* ═══ 사이드바 (공용 컴포넌트) ═══ */}
      <AppSidebar
        menu={SIDEBAR}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />

      {/* ═══ 메인 ═══ */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <h1 className="font-display-ko font-medium text-[20px] text-ink leading-none">
            선택 앨범
          </h1>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-pill bg-ink text-on-ink text-[13px] font-medium hover:-translate-y-px hover:bg-[#333] transition-all active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            {submitted ? "전달 완료" : "작가에게 전달"}
          </button>
        </header>

        {/* 진행 요약 */}
        <div className="min-h-[68px] px-6 md:px-8 py-3 border-b border-line flex flex-col justify-center">
          <div className="flex items-baseline justify-between mb-3 max-w-[560px]">
            <div>
              <span className="font-display-en text-[32px] font-semibold text-ink leading-none">
                {selected.length}
              </span>
              <span className="text-[15px] text-ink-3"> / {TARGET}장 선택</span>
            </div>
            <span className="text-[13px] text-ink-2">
              {submitted
                ? "작가에게 전달 완료되어 수정할 수 없어요"
                : selected.length >= TARGET
                  ? "목표 달성! 전달할 수 있어요"
                  : `작가에게 전달하려면 ${TARGET - selected.length}장을 더 채워야 해요`}
            </span>
          </div>
          <div className="h-2 rounded-pill bg-paper-deep overflow-hidden max-w-[560px]">
            <div
              className="h-full rounded-pill bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {submittedDate && (
            <p className="mt-2 text-[12px] text-ink-3">
              {submittedDate} 작가에게 전달 완료
            </p>
          )}
        </div>

        {/* 선택 사진 그리드 */}
        <div className="px-6 md:px-8 py-8">
          {selected.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 rounded-full bg-paper-deep grid place-items-center mx-auto mb-4">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8a8a8a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z" />
                </svg>
              </div>
              <p className="text-[14px] text-ink-2 mb-1">
                아직 선택한 사진이 없어요
              </p>
              <Link
                href="/gallery"
                className="text-[13px] text-accent hover:text-accent-press underline underline-offset-2"
              >
                사진 보러 가기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {selected.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-[3/4] rounded-md overflow-hidden bg-paper-deep ring-2 ring-inset ring-accent"
                >
                  <Link
                    href={folderHref(photo.scene, photo.person)}
                    className="block w-full h-full"
                    aria-label={`${photo.scene} ${photo.person} 폴더로 이동`}
                  >
                    <img
                      src={photoUrl(photo.photoId)}
                      alt={`선택 사진 ${photo.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                  {/* 장면 · 인물 */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-white/85 text-ink backdrop-blur-sm">
                    {photo.scene} · {photo.person}
                  </span>
                  {/* 선택 해제 */}
                  {!submitted && (
                    <button
                      onClick={() => remove(photo.id)}
                      aria-label="선택 해제"
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/85 text-ink-2 grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-white hover:text-accent transition-all backdrop-blur-sm"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                  <span className="absolute bottom-2.5 left-2.5 font-mono text-[9px] text-white/90 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    #{String(photo.id).padStart(3, "0")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ═══ 모바일 하단 네비 ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-line flex items-center justify-around z-20">
        {SIDEBAR.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[11px] ${item.active ? "text-ink font-medium" : "text-ink-3"}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      {confirmOpen && (
        <div className="fixed inset-0 z-[150] grid place-items-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[380px] bg-white rounded-2xl p-7">
            <h2 className="font-display-ko font-medium text-[20px] text-ink mb-2">
              작가에게 전달할까요?
            </h2>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-6">
              선택한 <span className="font-medium text-ink">{selected.length}장</span>을
              작가에게 전달합니다. 전달 후에는 선택을 수정할 수 없고, 작가가
              최종 선택본을 기준으로 작업을 시작할 수 있어요.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitToPhotographer}
                className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] transition-colors"
              >
                전달하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
