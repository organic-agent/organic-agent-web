"use client";

/**
 * 작가 — 갤러리 최종 선택본 탭
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryFinalSelectionTab.tsx
 *
 * 부부가 최종 선택 앨범에 담은 사진만 모아 보여준다.
 * 작가는 보정 작업에 들어가기 전 실제 선택 결과물을 확인한다.
 *
 * 주요 책임:
 * - 최종 선택 사진 목록 렌더링
 * - 장면/인물 필터 제공
 * - 선택 목표 대비 현재 선택 수 표시
 *
 * 참고:
 * - 다운로드와 확대 보기는 아직 연결하지 않는다.
 */

import Link from "next/link";
import { useState } from "react";
import {
  SELECT_TARGET,
  photoUrl,
  useGalleryFolders,
  useSelectedIds,
} from "@/lib/galleryPhotos";
import {
  getPhotoWorkflow,
  RETOUCH_STATUS_LABEL,
  summarizePhotoWorkflows,
  usePhotographerPhotoWorkflows,
  type RetouchStatus,
} from "@/lib/photographerPhotoWorkflow";
import { GalleryFolderFilters } from "./GalleryFolderFilters";

type Props = {
  galleryId: string;
  showIncompleteOnly?: boolean;
};

const STATUS_BADGE_CLASS: Record<RetouchStatus, string> = {
  waiting: "bg-white/90 text-ink-2",
  working: "bg-hold-soft/95 text-hold",
  done: "bg-select-soft/95 text-select",
};

export function GalleryFinalSelectionTab({
  galleryId,
  showIncompleteOnly = false,
}: Props) {
  const [sceneFilters, setSceneFilters] = useState<string[]>([]);
  const [personFilters, setPersonFilters] = useState<string[]>([]);
  const selectedIds = useSelectedIds();
  const selectedSet = new Set(selectedIds);
  const folders = useGalleryFolders();
  const workflows = usePhotographerPhotoWorkflows();
  const workflowSummary = summarizePhotoWorkflows(workflows, selectedIds);
  const finalSelectionHref = `/galleries/${galleryId}/final-selection`;
  const detailContext = showIncompleteOnly
    ? "?from=final-selection&workStatus=incomplete"
    : "?from=final-selection";

  const selectedPhotos = folders
    .flatMap((folder) =>
      folder.photos.map((photo) => ({
        ...photo,
        folderKey: folder.key,
        folderLabel: folder.label,
      })),
    )
    .filter((photo) => selectedSet.has(photo.id))
    .filter((photo) => {
      const sceneOk =
        sceneFilters.length === 0 || sceneFilters.includes(photo.scene);
      const personOk =
        personFilters.length === 0 || personFilters.includes(photo.person);
      const workflowOk =
        !showIncompleteOnly ||
        getPhotoWorkflow(workflows, photo.id).status === "waiting";
      return sceneOk && personOk && workflowOk;
    });

  const selectedPct = Math.min(
    100,
    Math.round((selectedIds.length / SELECT_TARGET) * 100),
  );
  const remaining = Math.max(0, SELECT_TARGET - selectedIds.length);

  return (
    <div className="px-6 md:px-8 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h2 className="font-display-ko font-medium text-[18px] text-ink">
            최종 선택본
          </h2>
          <p className="text-[13px] text-ink-2 mt-1">
            부부가 최종 선택 앨범에 담은 사진입니다.
          </p>
        </div>
        <GalleryFolderFilters
          sceneFilters={sceneFilters}
          personFilters={personFilters}
          onSceneFiltersChange={setSceneFilters}
          onPersonFiltersChange={setPersonFilters}
        />
      </div>

      <div className="border border-line rounded-lg p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-[12px] font-medium text-ink-2">선택 진행</p>
            <p className="mt-1 text-[13px] text-ink-3">
              {remaining > 0
                ? `${remaining}장 더 선택할 수 있어요.`
                : "목표 선택 장수에 도달했어요."}
            </p>
          </div>
          <div className="text-right">
            <span className="font-display-en text-[28px] font-semibold text-ink leading-none">
              {selectedIds.length}
            </span>
            <span className="text-[13px] text-ink-3"> / {SELECT_TARGET}장</span>
          </div>
        </div>
        <div className="h-2 rounded-pill bg-paper-deep overflow-hidden">
          <div
            className="h-full rounded-pill bg-accent transition-all"
            style={{ width: `${selectedPct}%` }}
          />
        </div>

        <div id="work-status" className="mt-5 pt-4 border-t border-line">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <p className="text-[12px] font-medium text-ink-2">보정 작업</p>
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
              <span className="text-ink-3">
                미확인{" "}
                <b className="text-ink font-semibold">
                  {workflowSummary.waiting}
                </b>
              </span>
              <span className="text-ink-3">
                작업 중{" "}
                <b className="text-hold font-semibold">
                  {workflowSummary.working}
                </b>
              </span>
              <span className="text-ink-3">
                보정 완료{" "}
                <b className="text-select font-semibold">
                  {workflowSummary.done}
                </b>
              </span>
            </div>
            <Link
              href={
                showIncompleteOnly
                  ? `${finalSelectionHref}#work-status`
                  : `${finalSelectionHref}?workStatus=incomplete#work-status`
              }
              className={`ml-auto h-8 px-3 rounded-pill border inline-flex items-center text-[11px] font-medium transition-colors ${
                showIncompleteOnly
                  ? "border-ink bg-ink text-on-ink"
                  : "border-line text-ink-2 hover:border-ink-3"
              }`}
            >
              {showIncompleteOnly
                ? `전체 ${workflowSummary.total}장 보기`
                : `미확인 ${workflowSummary.waiting}장만 보기`}
            </Link>
          </div>
        </div>
      </div>

      {selectedIds.length === 0 ? (
        <div className="min-h-[320px] border border-dashed border-line-strong rounded-lg grid place-items-center text-center px-6">
          <div>
            <h3 className="font-display-ko font-medium text-[17px] text-ink mb-2">
              아직 최종 선택된 사진이 없어요
            </h3>
            <p className="text-[13px] text-ink-2">
              부부가 선택 앨범에 사진을 담으면 이곳에서 확인할 수 있어요.
            </p>
          </div>
        </div>
      ) : selectedPhotos.length === 0 ? (
        <div className="min-h-[280px] border border-line rounded-lg grid place-items-center text-center px-6">
          <p className="text-[13px] text-ink-3">
            현재 필터에 해당하는 선택본이 없어요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {selectedPhotos.map((photo) => {
            const workflow = getPhotoWorkflow(workflows, photo.id);
            return (
              <Link
                key={`${photo.folderKey}-${photo.id}`}
                href={`/galleries/${galleryId}/folders/${encodeURIComponent(photo.folderKey)}/photos/${photo.id}${detailContext}`}
                aria-label={`${photo.folderLabel} ${photo.id}번 사진 상세 보기`}
                className="group block border border-line rounded-md overflow-hidden bg-white hover:-translate-y-0.5 hover:shadow-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-paper-deep">
                  <img
                    src={photoUrl(photo.photoId, 500)}
                    alt={`최종 선택 사진 ${photo.id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute bottom-2 left-2 font-mono text-[9px] text-white/90 bg-black/35 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    #{String(photo.id).padStart(3, "0")}
                  </span>
                  <span
                    className={`absolute top-2 right-2 px-2 py-1 rounded-pill text-[10px] font-medium shadow-sm backdrop-blur-sm ${STATUS_BADGE_CLASS[workflow.status]}`}
                  >
                    {RETOUCH_STATUS_LABEL[workflow.status]}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-ink truncate">
                    {photo.folderLabel}
                  </p>
                  <span className="text-[10px] text-ink-3 shrink-0">
                    상세 보기 →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
