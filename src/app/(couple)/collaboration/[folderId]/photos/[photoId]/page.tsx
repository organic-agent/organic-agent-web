"use client";

/**
 * 부부 — 협업 셀렉 사진 상세 (라이트박스)
 * 위치: src/app/(couple)/collaboration/[folderId]/photos/[photoId]/page.tsx
 *
 * 가족·지인이 남긴 반응(이모지)과 의견을 확인하고, 그 자리에서 내 셀렉으로 이어간다.
 * 우측 정보 패널은 카테고리 갤러리 상세와 동일한 접이식 사이드바 형식이며,
 * 부부는 의견을 남기지 않으므로 입력창 없이 확인 전용으로 둔다.
 *
 * 패널 구성:
 *  ① 반응 요약 + 분포 막대 + 종합 한 줄 평가(규칙 기반)
 *  ② 비교 우위 — 같은 폴더 사진들과 반응 비교
 *  ③ 내 셀렉 — 판단(후보/고민중/제외) + 선택 앨범 담기
 *  · 가족·지인 의견(댓글, 보기 전용)
 */

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { PhotoDetailStage } from "@/components/gallery/PhotoDetailStage";
import {
  SELECT_TARGET,
  addToSelected,
  clearAutoGood,
  clearCompareTag,
  isAutoGood,
  markAutoGood,
  removeFromSelected,
  setCompareTag,
  toggleCompareTag,
  useCompareTags,
  useFolders,
  useSelectedIds,
  type CompareTag,
} from "@/lib/couple";

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
  },
  {
    key: "collaboration",
    label: "협업 셀렉",
    href: "/collaboration",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    active: true,
  },
];

const DECISION_OPTIONS: {
  tag: CompareTag;
  label: string;
  activeClassName: string;
  dotClassName: string;
}[] = [
  { tag: "good", label: "후보", activeClassName: "border-select bg-select text-white", dotClassName: "bg-select" },
  { tag: "hold", label: "고민중", activeClassName: "border-hold bg-hold text-white", dotClassName: "bg-hold" },
  { tag: "remove", label: "제외", activeClassName: "border-ink bg-ink text-on-ink", dotClassName: "bg-ink" },
];

// ① 종합 한 줄 평가 — 가장 많은 반응을 기준으로 한 규칙 기반 문구.
function reactionVerdict(good: number, soso: number, sad: number): string {
  const total = good + soso + sad;
  if (total === 0) return "아직 반응이 없어요";
  if (good > soso && good > sad) {
    return good / total >= 0.6 ? "가족들이 좋아해요 👍" : "대체로 좋은 반응이에요";
  }
  if (sad > good && sad > soso) return "아쉽다는 반응이 많아요 🤔";
  if (soso > good && soso > sad) return "애매하다는 반응이에요";
  return "호불호가 갈려요 🤔";
}

export default function CollaborationPhotoDetailPage() {
  const { folderId, photoId } = useParams<{ folderId: string; photoId: string }>();
  const folders = useFolders();
  const selectedIds = useSelectedIds();
  const compareTags = useCompareTags();
  const folder = folders.find((item) => item.id === folderId);
  const photo = folder?.photos.find((item) => item.id === Number(photoId));
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [notice, setNotice] = useState("");

  if (!folder || !photo) {
    return (
      <div className="min-h-dvh grid place-items-center text-center px-6">
        <div>
          <p className="text-sm text-ink-2 mb-3">협업 사진을 찾을 수 없어요.</p>
          <Link href="/collaboration" className="text-sm text-accent underline">
            협업 셀렉으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const photoComments = folder.comments.filter(
    (comment) => comment.photoId === photo.id,
  );
  const reactionTotal = photo.good + photo.soso + photo.sad;
  const verdict = reactionVerdict(photo.good, photo.soso, photo.sad);
  const gridHref = `/collaboration/${folder.id}`;

  const isSelected = selectedIds.includes(photo.id);
  const decision = compareTags[photo.id];

  // ② 비교 우위 계산
  const otherPhoto =
    folder.photos.length === 2
      ? folder.photos.find((item) => item.id !== photo.id)
      : undefined;
  const reactionRank =
    [...folder.photos]
      .sort((a, b) => b.good - a.good)
      .findIndex((item) => item.id === photo.id) + 1;

  function toggleSelected() {
    setNotice("");
    if (isSelected) {
      const wasAutoGood = decision === "good" && isAutoGood(photo!.id);
      removeFromSelected(photo!.id);
      clearAutoGood(photo!.id);
      if (wasAutoGood) clearCompareTag(photo!.id);
      return;
    }
    const result = addToSelected([photo!.id]);
    if (result.added.includes(photo!.id) && !decision) {
      setCompareTag(photo!.id, "good");
      markAutoGood(photo!.id);
    }
    if (result.rejectedCount > 0) {
      setNotice(`선택 앨범은 최대 ${SELECT_TARGET}장까지 담을 수 있어요.`);
    }
  }

  function applyDecision(tag: CompareTag) {
    setNotice("");
    if (tag === "remove" && isSelected) removeFromSelected(photo!.id);
    toggleCompareTag(photo!.id, tag);
  }

  return (
    <div className="h-dvh bg-white flex overflow-hidden">
      <AppSidebar
        menu={SIDEBAR}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-line flex items-center gap-4 px-6">
          <Link
            href={gridHref}
            aria-label="협업 사진 그리드로 돌아가기"
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-paper-deep"
          >
            ←
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-3">협업 셀렉 · 사진별 의견</p>
            <h1 className="font-display-ko font-medium text-[17px] text-ink truncate">
              {folder.name}
            </h1>
          </div>
        </header>
        <PhotoDetailStage
          photos={folder.photos}
          currentPhotoId={photo.id}
          hrefForPhoto={(item) => `${gridHref}/photos/${item.id}`}
        />
      </div>

      {/* 우측 정보 패널 — 카테고리 갤러리 상세와 동일한 접이식 사이드바 */}
      <aside
        className={`${infoCollapsed ? "w-[52px]" : "w-[300px]"} h-full shrink-0 border-l border-line bg-white flex flex-col overflow-hidden transition-[width] duration-200 ease-out`}
      >
        <div
          className={`h-16 shrink-0 border-b border-line flex items-center ${
            infoCollapsed ? "justify-center px-0" : "justify-between px-5"
          }`}
        >
          {!infoCollapsed && (
            <h2 className="text-[15px] font-medium text-ink">사진 반응</h2>
          )}
          <button
            type="button"
            onClick={() => setInfoCollapsed((current) => !current)}
            className="w-8 h-8 rounded-md grid place-items-center text-ink-3 hover:bg-paper-deep hover:text-ink transition-colors shrink-0"
            aria-label={infoCollapsed ? "정보 패널 펼치기" : "정보 패널 접기"}
            title={infoCollapsed ? "펼치기" : "접기"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
              {infoCollapsed ? (
                <path d="M10 9l-3 3 3 3" />
              ) : (
                <path d="M8 9l3 3-3 3" />
              )}
            </svg>
          </button>
        </div>

        {!infoCollapsed && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* ① 반응 요약 + 분포 + 종합 평가 */}
            <section className="px-5 py-5 border-b border-line">
              <p className="text-[11px] text-ink-3">가족·지인 반응</p>
              <div className="mt-1 mb-4 flex items-baseline justify-between">
                <h3 className="font-mono text-[17px] font-semibold text-ink">
                  #{String(photo.id).padStart(3, "0")}
                </h3>
                <span className="text-[11px] text-ink-3">총 {reactionTotal}회</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  ["😍", "좋아요", photo.good],
                  ["🙂", "애매해요", photo.soso],
                  ["😕", "별로예요", photo.sad],
                ].map(([emoji, label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-paper-deep p-3 text-center"
                  >
                    <div className="text-lg">{emoji}</div>
                    <p className="mt-1 text-[10px] text-ink-3">{label}</p>
                    <p className="text-[14px] font-semibold text-ink">{value}</p>
                  </div>
                ))}
              </div>

              {reactionTotal > 0 && (
                <div className="h-1.5 rounded-pill bg-paper-deep overflow-hidden flex mb-2.5">
                  <div
                    className="h-full bg-select"
                    style={{ width: `${(photo.good / reactionTotal) * 100}%` }}
                  />
                  <div
                    className="h-full bg-hold"
                    style={{ width: `${(photo.soso / reactionTotal) * 100}%` }}
                  />
                  <div
                    className="h-full bg-ink-3"
                    style={{ width: `${(photo.sad / reactionTotal) * 100}%` }}
                  />
                </div>
              )}
              <p className="text-[12.5px] font-medium text-ink">{verdict}</p>
            </section>

            {/* ② 비교 우위 */}
            {folder.photos.length >= 2 && (
              <section className="px-5 py-5 border-b border-line">
                <p className="text-[12px] font-medium text-ink-2 mb-3">비교 우위</p>
                {otherPhoto ? (
                  <div className="rounded-lg bg-paper-deep p-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-ink">이 사진</span>
                      <span className="font-semibold text-ink">
                        😍 {photo.good}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[12px]">
                      <span className="text-ink-3">상대 사진</span>
                      <span className="text-ink-2">😍 {otherPhoto.good}</span>
                    </div>
                    <p className="mt-2.5 pt-2.5 border-t border-line text-[12px] font-medium text-ink">
                      {photo.good > otherPhoto.good
                        ? "이 사진이 더 좋은 반응이에요"
                        : photo.good < otherPhoto.good
                          ? "상대 사진이 더 좋은 반응이에요"
                          : "두 사진 반응이 비슷해요"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-paper-deep p-3 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-2">
                        이 폴더 {folder.photos.length}장 중
                      </span>
                      <span className="font-semibold text-ink">
                        😍 반응 {reactionRank}위
                      </span>
                    </div>
                    {reactionRank === 1 && (
                      <p className="mt-1.5 font-medium text-ink">
                        🏆 반응이 가장 좋은 사진이에요
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ③ 내 셀렉 */}
            <section className="px-5 py-5 border-b border-line">
              <p className="text-[12px] font-medium text-ink-2 mb-3">내 셀렉</p>
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {DECISION_OPTIONS.map((option) => {
                  const active = decision === option.tag;
                  return (
                    <button
                      key={option.tag}
                      type="button"
                      onClick={() => applyDecision(option.tag)}
                      aria-pressed={active}
                      className={`h-10 rounded-md border text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                        active
                          ? option.activeClassName
                          : "border-line bg-white text-ink-2 hover:border-ink-3"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          active ? "bg-current" : option.dotClassName
                        }`}
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={toggleSelected}
                className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-accent bg-accent-soft text-accent-press"
                    : "border-line bg-white text-ink hover:border-ink-3"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium">
                    {isSelected ? "앨범에서 빼기" : "선택 앨범에 담기"}
                  </span>
                  <span className="text-[12px] text-current/70">
                    {selectedIds.length} / {SELECT_TARGET}
                  </span>
                </span>
                <span className="block mt-1 text-[11px] text-current/65">
                  {isSelected
                    ? "이 사진은 최종 선택 앨범에 담겨 있어요."
                    : "가족 반응을 보고 마음에 들면 바로 담아요."}
                </span>
              </button>
              {notice && (
                <p className="mt-2 text-[12px] text-danger">{notice}</p>
              )}
            </section>

            {/* 가족·지인 의견 (댓글, 보기 전용) */}
            <section className="px-5 py-5">
              <p className="text-[12px] font-medium text-ink-2 mb-3">
                가족·지인 의견
              </p>
              <div className="space-y-4">
                {photoComments.length === 0 && (
                  <p className="text-[13px] text-ink-3">
                    아직 남긴 의견이 없어요.
                  </p>
                )}
                {photoComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-paper-deep grid place-items-center text-[12px] text-ink-2 shrink-0">
                      {comment.avatar}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[13px] font-medium text-ink">
                        {comment.author}
                      </span>
                      <p className="text-[13px] text-ink-2 mt-0.5 break-words">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
