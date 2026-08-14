"use client";

/**
 * 작가 — 갤러리 사진 탭
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryPhotosTab.tsx
 *
 * 갤러리 상세 화면에서 부부 페이지에 보이는 장면×인물 폴더 구조를 보여준다.
 * 작가는 폴더별 사진 수와 셀렉 진행 상태를 확인한다.
 *
 * 주요 책임:
 * - 장면/인물 필터 상태 관리
 * - 장면×인물 폴더 카드 렌더링
 * - 폴더별 후보/고민중/제외 현황 표시
 *
 * 참고:
 * - 폴더 상세 진입은 아직 만들지 않고, 현재는 분류 구조 확인용 화면이다.
 */

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FolderCardMenu } from "@/components/gallery/FolderCardMenu";
import { RenameFolderModal } from "@/components/gallery/RenameFolderModal";
import {
  photoUrl,
  renameGalleryFolder,
  useCompareTags,
  useGalleryFolders,
  useSelectedIds,
  type CompareTag,
  type GalleryFolder,
} from "@/lib/galleryPhotos";
import { GalleryFolderFilters } from "./GalleryFolderFilters";

function decisionCount(
  photos: { id: number }[],
  compareTags: Record<number, CompareTag>,
  tag: CompareTag,
) {
  return photos.filter((photo) => compareTags[photo.id] === tag).length;
}

type Props = {
  total: number;
};

export function GalleryPhotosTab({ total }: Props) {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [sceneFilters, setSceneFilters] = useState<string[]>([]);
  const [personFilters, setPersonFilters] = useState<string[]>([]);
  const [renamingFolder, setRenamingFolder] = useState<GalleryFolder | null>(null);
  const selectedIds = useSelectedIds();
  const compareTags = useCompareTags();
  const selectedSet = new Set(selectedIds);

  const galleryFolders = useGalleryFolders();
  const folders = galleryFolders.filter((folder) => {
    const sceneOk = sceneFilters.length === 0 || sceneFilters.includes(folder.scene);
    const personOk = personFilters.length === 0 || personFilters.includes(folder.person);
    return sceneOk && personOk;
  });

  return (
    <div className="px-6 md:px-8 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-[13px] text-ink-2">
            전체 <b className="text-ink font-semibold">{total}</b>장 · 폴더{" "}
            <b className="text-ink font-semibold">{folders.length}</b>개
          </p>
          <p className="text-[12px] text-ink-3 mt-1">
            부부 페이지에 보이는 장면·인물별 폴더 구조입니다.
          </p>
        </div>
        <GalleryFolderFilters
          sceneFilters={sceneFilters}
          personFilters={personFilters}
          onSceneFiltersChange={setSceneFilters}
          onPersonFiltersChange={setPersonFilters}
        />
      </div>

      {folders.length === 0 ? (
        <div className="min-h-[280px] border border-line rounded-lg grid place-items-center text-center px-6">
          <p className="text-[13px] text-ink-3">
            해당 조건의 폴더가 없어요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {folders.map((folder) => {
            const selectedCount = folder.photos.filter((photo) =>
              selectedSet.has(photo.id),
            ).length;
            const goodCount = decisionCount(
              folder.photos,
              compareTags,
              "good",
            );
            const holdCount = decisionCount(
              folder.photos,
              compareTags,
              "hold",
            );
            const removeCount = decisionCount(
              folder.photos,
              compareTags,
              "remove",
            );

            return (
              <article
                key={folder.key}
                className="group border border-line rounded-lg overflow-hidden bg-white hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <Link
                  href={`/galleries/${galleryId}/folders/${encodeURIComponent(folder.key)}`}
                  aria-label={`${folder.label} 폴더 열기`}
                  className="block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
                    <img
                      src={photoUrl(folder.photos[0].photoId, 800)}
                      alt={`${folder.label} 폴더 커버`}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <span className="absolute bottom-3 right-3 px-2 py-1 rounded-pill text-[11px] font-medium bg-black/40 text-white backdrop-blur-sm">
                      사진 {folder.photos.length}장
                    </span>
                  </div>
                </Link>

                <div className="relative p-5">
                  <Link
                    href={`/galleries/${galleryId}/folders/${encodeURIComponent(folder.key)}`}
                    className="block pr-10"
                  >
                    <h2 className="font-display-ko font-medium text-[16px] text-ink truncate">
                      {folder.label}
                    </h2>
                    <p className="text-[12px] text-ink-3 mt-1.5">
                      선택 앨범에 {selectedCount}장 담김
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="rounded-md bg-select-soft px-2.5 py-2">
                        <p className="text-[11px] text-select">후보</p>
                        <p className="text-[15px] font-semibold text-select">
                          {goodCount}
                        </p>
                      </div>
                      <div className="rounded-md bg-hold-soft px-2.5 py-2">
                        <p className="text-[11px] text-hold">고민중</p>
                        <p className="text-[15px] font-semibold text-hold">
                          {holdCount}
                        </p>
                      </div>
                      <div className="rounded-md bg-paper-deep px-2.5 py-2">
                        <p className="text-[11px] text-ink-3">제외</p>
                        <p className="text-[15px] font-semibold text-ink">
                          {removeCount}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <FolderCardMenu
                    folderName={folder.label}
                    onRename={() => setRenamingFolder(folder)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {renamingFolder && (
        <RenameFolderModal
          key={renamingFolder.key}
          folderName={renamingFolder.label}
          onClose={() => setRenamingFolder(null)}
          onSave={(name) => {
            renameGalleryFolder(renamingFolder.key, name);
            setRenamingFolder(null);
          }}
        />
      )}
    </div>
  );
}
