"use client";

import Link from "next/link";
import { photoUrl, useFolders } from "@/lib/couple";

type Props = {
  folderIds: string[];
};

export function SharedCollaborationFolders({ folderIds }: Props) {
  const folders = useFolders();
  const sharedFolders = folderIds
    .map((folderId) => folders.find((folder) => folder.id === folderId))
    .filter((folder) => folder !== undefined);

  return (
    <main className="min-h-dvh bg-paper px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-8">
          <p className="text-[12px] font-medium tracking-[0.12em] text-ink-3">
            WEDDING EASY SELECT
          </p>
          <h1 className="mt-2 font-display-ko text-[26px] font-medium text-ink md:text-[32px]">
            공유된 협업 폴더
          </h1>
          <p className="mt-2 text-[14px] text-ink-2">
            폴더를 선택해 사진을 확인하고 의견을 남겨주세요.
          </p>
        </header>

        {sharedFolders.length === 0 ? (
          <div className="min-h-[320px] rounded-2xl border border-dashed border-line bg-white grid place-items-center px-6 text-center">
            <div>
              <p className="text-[14px] text-ink-2">
                공유된 폴더를 찾을 수 없어요.
              </p>
              <p className="mt-1 text-[12px] text-ink-3">
                링크가 올바른지 공유한 사람에게 다시 확인해주세요.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sharedFolders.map((folder) => (
              <Link
                key={folder.id}
                href={`/collaboration/${folder.id}`}
                className="group overflow-hidden rounded-xl border border-line bg-white transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-paper-deep">
                  {folder.photos.length > 0 ? (
                    <img
                      src={photoUrl(folder.photos[0].photoId, 700)}
                      alt={`${folder.name} 폴더 커버`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-[13px] text-ink-3">
                      아직 담긴 사진이 없어요
                    </div>
                  )}
                  <span className="absolute bottom-3 right-3 rounded-pill bg-black/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    사진 {folder.photos.length}장
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="truncate font-display-ko text-[17px] font-medium text-ink">
                    {folder.name}
                  </h2>
                  {folder.memo && (
                    <p className="mt-1 truncate text-[13px] text-ink-2">
                      {folder.memo}
                    </p>
                  )}
                  <p className="mt-4 text-[12px] text-ink-3">
                    폴더 열기 →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
