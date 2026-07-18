/**
 * 부부 — 협업 폴더에 사진 담기 모달
 * 위치: src/app/(couple)/gallery/[folderKey]/_components/CollaborationAddModal.tsx
 *
 * 현재 사진을 기존 협업 폴더에 담거나, 새 협업 폴더를 만들어 담는다.
 */

import { photoUrl, type CollabFolder, type Photo } from "@/lib/couple";
import { ModalFrame } from "@/components/ui/ModalFrame";

type Mode = "select" | "create";

type Props = {
  photo: Photo;
  folders: CollabFolder[];
  mode: Mode;
  folderName: string;
  folderMemo: string;
  onClose: () => void;
  onModeChange: (mode: Mode) => void;
  onFolderNameChange: (value: string) => void;
  onFolderMemoChange: (value: string) => void;
  onAddToFolder: (folderId: string) => void;
  onCreateFolder: () => void;
};

export function CollaborationAddModal({
  photo,
  folders,
  mode,
  folderName,
  folderMemo,
  onClose,
  onModeChange,
  onFolderNameChange,
  onFolderMemoChange,
  onAddToFolder,
  onCreateFolder,
}: Props) {
  return (
    <ModalFrame
      onClose={onClose}
      maxWidthClassName="max-w-[520px]"
      paddingClassName="p-7"
    >
        <div className="mb-5">
          {mode === "create" && folders.length > 0 && (
            <button
              type="button"
              onClick={() => onModeChange("select")}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2 hover:text-ink mb-3"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              폴더 목록으로
            </button>
          )}
          <h2 className="font-display-ko font-medium text-[20px] text-ink mb-1">
            {mode === "create" ? "새 협업 폴더 만들기" : "협업 폴더에 담기"}
          </h2>
          <p className="text-[13px] text-ink-2">
            {mode === "create"
              ? "현재 사진을 담을 새 협업 폴더를 만들어요."
              : "현재 사진을 의견을 받을 협업 폴더에 추가해요."}
          </p>
        </div>

        <div className="flex gap-3 rounded-lg border border-line bg-paper p-3 mb-5">
          <div className="w-16 aspect-[3/4] rounded-md overflow-hidden bg-paper-deep shrink-0">
            <img
              src={photoUrl(photo.photoId, 240)}
              alt={`사진 ${photo.id}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="font-mono text-[12px] text-ink">
              #{String(photo.id).padStart(3, "0")}
            </p>
            <p className="text-[12px] text-ink-3 mt-1 truncate">
              {photo.scene} · {photo.person}
            </p>
          </div>
        </div>

        {mode === "select" && (
          <>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 mb-4">
              {folders.map((folder) => {
                const alreadyAdded = folder.photos.some(
                  (item) => item.id === photo.id,
                );

                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => onAddToFolder(folder.id)}
                    disabled={alreadyAdded}
                    className="w-full rounded-lg border border-line px-4 py-3 text-left hover:border-ink-3 hover:bg-paper transition-colors disabled:bg-paper-deep disabled:hover:border-line disabled:pointer-events-none"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-ink truncate">
                          {folder.name}
                        </span>
                        <span className="block mt-1 text-[12px] text-ink-3">
                          사진 {folder.photos.length}장 · 의견{" "}
                          {folder.comments.length}개
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-[12px] font-medium ${
                          alreadyAdded ? "text-ink-3" : "text-accent-press"
                        }`}
                      >
                        {alreadyAdded ? "이미 담김" : "담기"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onModeChange("create")}
              className="w-full h-10 rounded-pill border border-line text-[13px] font-medium text-ink-2 hover:border-ink-3 hover:text-ink transition-colors"
            >
              새 협업 폴더 만들기
            </button>
          </>
        )}

        {mode === "create" && folders.length === 0 && (
          <div className="rounded-lg border border-dashed border-line bg-paper px-4 py-5 text-center mb-4">
            <p className="text-[14px] text-ink-2 mb-1">
              아직 협업 폴더가 없어요.
            </p>
            <p className="text-[12px] text-ink-3">
              새 폴더를 만들면 이 사진이 바로 담겨요.
            </p>
          </div>
        )}

        {mode === "create" && (
          <div>
            <div className="space-y-3">
              <label className="block">
                <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
                  폴더 이름
                </span>
                <input
                  value={folderName}
                  onChange={(event) => onFolderNameChange(event.target.value)}
                  placeholder={`${photo.scene} - ${photo.person} 의견 묻기`}
                  className="w-full h-11 rounded-md border border-line px-3.5 text-[14px] text-ink outline-none focus:border-ink-3"
                />
              </label>
              <label className="block">
                <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
                  메모
                </span>
                <textarea
                  value={folderMemo}
                  onChange={(event) => onFolderMemoChange(event.target.value)}
                  placeholder="가족·지인에게 의견을 묻고 싶은 사진이에요."
                  rows={3}
                  className="w-full rounded-md border border-line px-3.5 py-3 text-[14px] text-ink outline-none resize-none focus:border-ink-3"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              {folders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onModeChange("select")}
                  className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
                >
                  취소
                </button>
              )}
              <button
                type="button"
                onClick={onCreateFolder}
                disabled={!folderName.trim()}
                className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                폴더 만들기
              </button>
            </div>
          </div>
        )}
    </ModalFrame>
  );
}
