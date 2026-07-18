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

import { useState } from "react";
import {
  SELECT_TARGET,
  getGalleryFolders,
  photoUrl,
  useSelectedIds,
} from "@/lib/galleryPhotos";
import { GalleryFolderFilters } from "./GalleryFolderFilters";

export function GalleryFinalSelectionTab() {
  const [sceneFilter, setSceneFilter] = useState("전체");
  const [personFilter, setPersonFilter] = useState("전체");
  const selectedIds = useSelectedIds();
  const selectedSet = new Set(selectedIds);

  const selectedPhotos = getGalleryFolders()
    .flatMap((folder) =>
      folder.photos.map((photo) => ({
        ...photo,
        folderKey: folder.key,
        folderLabel: folder.label,
      })),
    )
    .filter((photo) => selectedSet.has(photo.id))
    .filter((photo) => {
      const sceneOk = sceneFilter === "전체" || photo.scene === sceneFilter;
      const personOk = personFilter === "전체" || photo.person === personFilter;
      return sceneOk && personOk;
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
          sceneFilter={sceneFilter}
          personFilter={personFilter}
          onSceneFilterChange={setSceneFilter}
          onPersonFilterChange={setPersonFilter}
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
          {selectedPhotos.map((photo) => (
            <article
              key={`${photo.folderKey}-${photo.id}`}
              className="group border border-line rounded-md overflow-hidden bg-white"
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
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[12px] font-medium text-ink truncate">
                  {photo.folderLabel}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
